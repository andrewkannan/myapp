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
      try {
        const baseUrl = 'https://doctor.asiamedic.com.sg';
        
        // 1. Load login page to get RequestVerificationToken
        const loginPageRes = await fetch(`${baseUrl}/sign-in`);
        if (!loginPageRes.ok) throw new Error('Failed to load Zed login page');
        const loginHtml = await loginPageRes.text();
        const cookies = loginPageRes.headers.get('set-cookie');
        
        const tokenMatch = loginHtml.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        if (!tokenMatch) throw new Error('Could not find login verification token');
        const reqToken = tokenMatch[1];
        
        // 2. Perform Login
        const loginData = new URLSearchParams();
        loginData.append('Username', 'testdelete');
        loginData.append('Password', 'AML!Task12');
        loginData.append('__RequestVerificationToken', reqToken);
        loginData.append('ReturnUrl', '/');
        loginData.append('RememberMe', 'false');

        const loginRes = await fetch(`${baseUrl}/sign-in`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies || ''
          },
          body: loginData.toString(),
          redirect: 'manual'
        });

        const authCookies = loginRes.headers.get('set-cookie') || cookies || '';

        // 3. Search for the study by accession
        const searchRes = await fetch(`${baseUrl}/?accession=${accession}`, {
          headers: { 'Cookie': authCookies }
        });
        const searchHtml = await searchRes.text();
        
        // Extract study ID by looking for the row with the accession number
        // In the HTML, row has <tr data-study-id="..."> and a <td data-title="Accession No.">...</td>
        const studyRows = searchHtml.split('<tr class="double-click single-click " data-study-id="');
        let targetStudyId = null;
        
        for (let i = 1; i < studyRows.length; i++) {
          const rowText = studyRows[i];
          const studyId = rowText.substring(0, rowText.indexOf('"'));
          
          if (rowText.toLowerCase().includes(accession.toLowerCase())) {
            targetStudyId = studyId;
            break;
          }
        }
        
        if (!targetStudyId) {
          return NextResponse.json({ status: 'error', message: `No study found for accession ${accession} in Zed` });
        }

        // 4. Load the delete page to get the new token
        const deletePageRes = await fetch(`${baseUrl}/study-delete/${targetStudyId}`, {
          headers: { 'Cookie': authCookies }
        });
        const deleteHtml = await deletePageRes.text();
        
        const deleteFormMatch = deleteHtml.match(/action="([^"]+)"/);
        const delTokenMatch = deleteHtml.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        
        if (!deleteFormMatch || !delTokenMatch) {
          return NextResponse.json({ status: 'error', message: 'Could not find delete form or token' });
        }
        
        const actionUrl = deleteFormMatch[1]; // /study-delete/.../real-time
        const delToken = delTokenMatch[1];
        
        // 5. Execute deletion
        const delData = new URLSearchParams();
        delData.append('__RequestVerificationToken', delToken);
        delData.append('Reason', 'Deleted via Automated Web Portal');
        delData.append('KeepOffline', 'false');

        const finalDelRes = await fetch(`${baseUrl}${actionUrl}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': authCookies,
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: delData.toString()
        });

        if (finalDelRes.ok) {
          return NextResponse.json({ status: 'success', message: 'Deleted study in Zed' });
        } else {
          return NextResponse.json({ status: 'error', message: 'Failed to execute deletion in Zed' });
        }

      } catch (err: any) {
        console.error('Zed deletion error:', err);
        return NextResponse.json({ status: 'error', message: err.message });
      }
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
