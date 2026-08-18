import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import { getSession } from '@/lib/auth';

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL || 'file:./dev.db'
});
const prisma = new PrismaClient({ adapter });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());
    const month = parseInt(searchParams.get('month') || (new Date().getMonth() + 1).toString());

    // Calculate start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Fetch all locations, stations, and users
    const [locations, stations, users, shifts] = await Promise.all([
      prisma.location.findMany(),
      prisma.station.findMany(),
      prisma.user.findMany({ where: { isActive: true }, orderBy: { abbreviation: 'asc' } }),
      prisma.shift.findMany({
        where: {
          date: {
            gte: startDate,
            lte: endDate
          }
        },
        include: {
          user: true,
          station: true
        }
      })
    ]);

    return NextResponse.json({ locations, stations, users, shifts });
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

    // Singapore 2026 public holiday dates (ISO YYYY-MM-DD)
    const SG_PUBLIC_HOLIDAYS = new Set([
      '2026-01-01','2026-02-17','2026-02-18','2026-03-21','2026-04-03',
      '2026-05-01','2026-05-27','2026-06-01','2026-08-09','2026-08-10',
      '2026-11-09','2026-12-25',
    ]);

    function toLocalDateKey(d: Date) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    // Determine list of dates to assign
    let datesToAssign: Date[] = [];

    if (dateFrom && dateTo) {
      // Bulk range
      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      start.setHours(12, 0, 0, 0);
      end.setHours(12, 0, 0, 0);
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
      const d = new Date(date);
      d.setHours(12, 0, 0, 0);
      datesToAssign = [d];
    } else {
      return NextResponse.json({ error: 'date or dateFrom/dateTo is required' }, { status: 400 });
    }

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
