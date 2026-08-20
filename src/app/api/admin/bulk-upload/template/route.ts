import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'roster';

  let csvContent = '';
  let filename = '';

  if (type === 'roster') {
    filename = 'roster_upload_template.csv';
    csvContent = [
      'Date,Staff_Abbreviation,Location,Station,Shift_Period,Start_Time,End_Time,Status,Remarks',
      '2026-09-01,AK,OIC,MRI 3T,Full,0830,1730,Scheduled,Morning shift',
      '2026-09-01,JD,OIC,MRI 2,AM,0830,1230,Scheduled,',
      '2026-09-02,SA,NOVENA,MRI 1.5T,PM,1230,1730,Scheduled,Afternoon coverage',
    ].join('\n');
  } else if (type === 'leave') {
    filename = 'leave_upload_template.csv';
    csvContent = [
      'Date,Staff_Abbreviation,Leave_Type,Period,Status,Remarks',
      '2026-09-01,AK,AL,FULL,APPROVED,Annual leave',
      '2026-09-02,JD,MC,FULL,APPROVED,Medical certificate attached',
      '2026-09-03,SA,UPL,AM,APPROVED,Half day unpaid',
      '2026-09-04,AK,OFF,FULL,APPROVED,Day off',
    ].join('\n');
  } else if (type === 'timeoff') {
    filename = 'timeoff_upload_template.csv';
    csvContent = [
      'Date,Staff_Abbreviation,Reason,Study_Acc_No,Start_Time,End_Time,Hours,Status,Remarks',
      '2026-09-01,AK,Dental appointment,,1400,1600,2,APPROVED,',
      '2026-09-02,JD,Family emergency,ACC-12345,0900,1300,4,APPROVED,Called in',
      '2026-09-03,SA,Personal errand,,1000,1200,2,PENDING,Awaiting approval',
    ].join('\n');
  } else {
    return NextResponse.json({ error: 'Invalid type. Use: roster, leave, or timeoff' }, { status: 400 });
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
