import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accession, authCode, system } = body;

    if (!accession || !authCode || !system) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Verify 3-letter auth code here if needed
    // Example: checking if it matches the current user's initials could be done if we fetched session
    // For now, we trust the 3-letter code requirement is met by the frontend.

    if (system === 'zed') {
      return new Promise((resolve) => {
        // Run python script
        const scriptPath = path.join(process.cwd(), 'scripts', 'zed_delete.py');
        exec(`python3 ${scriptPath} "${accession}"`, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            // Fallback to error response if script crashes
            resolve(NextResponse.json({ status: 'error', message: 'Failed to run python script' }, { status: 500 }));
            return;
          }
          
          try {
            const result = JSON.parse(stdout);
            resolve(NextResponse.json(result));
          } catch (e) {
            console.error('Failed to parse python output:', stdout);
            resolve(NextResponse.json({ status: 'error', message: 'Invalid response from Zed script' }, { status: 500 }));
          }
        });
      });
    }

    if (system === 'advapacs' || system === 'ampacs') {
      // Simulate delay for AdvaPACS and AMPACS for now since we don't have scripts yet
      await new Promise(resolve => setTimeout(resolve, system === 'advapacs' ? 1500 : 3000));
      return NextResponse.json({ status: 'success', message: 'Simulated success' });
    }

    return NextResponse.json({ error: 'Invalid system specified' }, { status: 400 });

  } catch (err: any) {
    console.error('Delete study API error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
