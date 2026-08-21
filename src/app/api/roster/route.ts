import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';


export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch all locations, stations, and users
    const [locations, stations, users, shifts, leaves, systemModalities, timeOffRecords] = await Promise.all([
      prisma.location.findMany(),
      prisma.station.findMany(),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { abbreviation: 'asc' } }),
      prisma.shift.findMany({
        where: {
          date: { gte: startDate, lte: endDate }
        },
        include: { user: true, station: true }
      }),
      prisma.leave.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'APPROVED'
        },
        include: { user: true }
      }),
      prisma.systemModality.findMany({ orderBy: { name: 'asc' } }),
      prisma.timeOffRecord.findMany({
        where: {
          date: { gte: startDate, lte: endDate },
          status: 'APPROVED'
        },
        include: { user: true }
      })
    ]);

    // Convert time-off records to leave-like objects with type "TO"
    const timeOffAsLeaves = timeOffRecords.map(to => ({
      id: to.id,
      userId: to.userId,
      date: to.date,
      type: 'TO',
      period: to.startTime && to.endTime ? `${to.startTime}-${to.endTime}` : 'FULL',
      status: 'APPROVED',
      remarks: to.reason,
      user: (to as any).user
    }));

    return NextResponse.json({ locations, stations, users, shifts, leaves: [...leaves, ...timeOffAsLeaves], modalities: systemModalities.map(m => m.name) });
  } catch (error) {
    console.error('Error fetching roster:', error);
    return NextResponse.json({ error: 'Failed to fetch roster data' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const {
      userId,
      date,        // single day ISO string (used when dateFrom/dateTo not provided)
      dateFrom,    // bulk range start ISO string
      dateTo,      // bulk range end ISO string
      stationId,
      status = 'Scheduled',
      shiftPeriod = 'Full',  // "Full" | "AM" | "PM"
      remarks = '',
      skipWeekends = true,
      skipPublicHolidays = true,
    } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    // Fetch public holidays dynamically from database
    const publicHolidayRecords = await prisma.publicHoliday.findMany();
    const SG_PUBLIC_HOLIDAYS = new Set(publicHolidayRecords.map(ph => {
      const d = new Date(ph.date);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }));

    function toLocalDateKey(d: Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // Determine list of dates to assign
    let datesToAssign: Date[] = [];

    // Helper to parse 'YYYY-MM-DD' exactly into local noon
    function parseLocalNoon(dateStr: string) {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Date(y, m - 1, d, 12, 0, 0, 0);
    }

    if (dateFrom && dateTo) {
      // Bulk range
      const start = parseLocalNoon(dateFrom);
      const end = parseLocalNoon(dateTo);
      const cur = new Date(start);
      while (cur <= end) {
        const dow = cur.getDay();
        const key = toLocalDateKey(cur);
        const isSunday = dow === 0;
        const isSat = dow === 6;
        const isPH = SG_PUBLIC_HOLIDAYS.has(key);
        if (skipWeekends && (isSunday || isSat)) { cur.setDate(cur.getDate() + 1); continue; }
        if (skipPublicHolidays && isPH) { cur.setDate(cur.getDate() + 1); continue; }
        datesToAssign.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
    } else if (date) {
      // Single day
      // Strip any time components if present to get YYYY-MM-DD
      const dateStr = typeof date === 'string' && date.includes('T') ? date.split('T')[0] : date;
      datesToAssign = [parseLocalNoon(dateStr)];
    } else {
      return NextResponse.json({ error: 'date or dateFrom/dateTo is required' }, { status: 400 });
    }

    if (datesToAssign.length === 0) {
      return NextResponse.json({ created: 0, shifts: [] });
    }

    // --- LEAVE CONFLICT PREVENTION ENGINE ---
    const sortedDates = [...datesToAssign].sort((a, b) => a.getTime() - b.getTime());
    const minDate = new Date(sortedDates[0]);
    minDate.setHours(0, 0, 0, 0);
    const maxDate = new Date(sortedDates[sortedDates.length - 1]);
    maxDate.setHours(23, 59, 59, 999);
    
    const overlappingLeaves = await prisma.leave.findMany({
      where: {
        userId,
        status: 'APPROVED',
        date: { gte: minDate, lte: maxDate }
      }
    });

    if (overlappingLeaves.length > 0) {
      const conflictingDates: string[] = [];
      for (const d of datesToAssign) {
        const dKey = toLocalDateKey(d);
        const leavesOnDay = overlappingLeaves.filter(l => toLocalDateKey(new Date(l.date)) === dKey);
        for (const l of leavesOnDay) {
          if (l.period === 'FULL' || shiftPeriod === 'Full' || l.period === shiftPeriod) {
            conflictingDates.push(dKey);
            break;
          }
        }
      }
      if (conflictingDates.length > 0) {
        return NextResponse.json({ 
          error: `Conflict: Staff is on Approved Leave on ${conflictingDates.join(', ')}.` 
        }, { status: 409 });
      }
    }
    // ----------------------------------------

    // Bulk insert all shifts in a transaction
    const created = await prisma.$transaction(
      datesToAssign.map(d =>
        prisma.shift.create({
          data: {
            userId,
            date: d,
            stationId: stationId || null,
            status,
            shiftPeriod,
            remarks: remarks || null,
          },
          include: { user: true, station: true }
        })
      )
    );

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'CREATE_SHIFTS', details: `Created ${created.length} shift(s)` }
    });

    return NextResponse.json({ created: created.length, shifts: created });
  } catch (error) {
    console.error('Error creating shift:', error);
    return NextResponse.json({ error: 'Failed to create shift' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Shift ID is required' }, { status: 400 });
    }

    await prisma.shift.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'DELETE_SHIFT', details: `Deleted shift ${id}` }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting shift:', error);
    return NextResponse.json({ error: 'Failed to delete shift' }, { status: 500 });
  }
}

// PATCH — toggle a shift to Cancelled (or restore to Scheduled)
export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Shift ID required' }, { status: 400 });

    const body = await request.json();
    const { status, remarks, shiftPeriod, userId } = body;

    // --- LEAVE CONFLICT PREVENTION ENGINE ---
    if (shiftPeriod !== undefined || userId !== undefined) {
      const existingShift = await prisma.shift.findUnique({ where: { id } });
      if (existingShift) {
        const targetUserId = userId || existingShift.userId;
        const targetPeriod = shiftPeriod || existingShift.shiftPeriod;
        
        const shiftDateStart = new Date(existingShift.date);
        shiftDateStart.setHours(0, 0, 0, 0);
        const shiftDateEnd = new Date(existingShift.date);
        shiftDateEnd.setHours(23, 59, 59, 999);

        const overlappingLeaves = await prisma.leave.findMany({
          where: {
            userId: targetUserId,
            status: 'APPROVED',
            date: { gte: shiftDateStart, lte: shiftDateEnd }
          }
        });

        if (overlappingLeaves.length > 0) {
          for (const l of overlappingLeaves) {
            if (l.period === 'FULL' || targetPeriod === 'Full' || l.period === targetPeriod) {
              return NextResponse.json({ 
                error: 'Conflict: Staff is on Approved Leave for this period.' 
              }, { status: 409 });
            }
          }
        }
      }
    }
    // ----------------------------------------

    const updated = await prisma.shift.update({
      where: { id },
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(remarks !== undefined ? { remarks } : {}),
        ...(shiftPeriod !== undefined ? { shiftPeriod } : {}),
        ...(userId !== undefined ? { userId } : {}),
      },
      include: { user: true, station: true }
    });

    await prisma.auditLog.create({
      data: { userId: session.id, action: 'UPDATE_SHIFT', details: `Updated shift ${updated.id}` }
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating shift:', error);
    return NextResponse.json({ error: 'Failed to update shift' }, { status: 500 });
  }
}
