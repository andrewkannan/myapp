import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session || !session.permissions?.includes('ROSTER_EDIT')) {
    return new NextResponse('Unauthorized', { status: 403 });
  }

  const csvHeader = 'Date,Staff_Abbreviation,Record_Type,Value,Period,Remarks\n';
  const csvExample1 = '2026-09-01,AK,ROSTER,MRI 3T,Full,Assigned from bulk upload\n';
  const csvExample2 = '2026-09-02,JD,LEAVE,AL,Full,\n';
  const csvExample3 = '2026-09-03,SA,TIMEOFF,OFF,4,Dental appointment\n';

  const csvContent = csvHeader + csvExample1 + csvExample2 + csvExample3;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': 'attachment; filename="asiamedic_bulk_upload_template.csv"',
    },
  });
}
