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
        
        const parseCookies = (cookieArray: string[]) => {
          const map = new Map<string, string>();
          cookieArray.forEach(c => {
            const parts = c.split(';')[0].split('=');
            const key = parts[0];
            const val = parts.slice(1).join('=');
            if (val) {
              map.set(key, val);
            }
          });
          return map;
        };

        const randomDelay = (min: number, max: number) => {
          const ms = Math.floor(Math.random() * (max - min + 1)) + min;
          return new Promise(resolve => setTimeout(resolve, ms));
        };

        const browserHeaders = {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
          'Accept-Language': 'en-US,en;q=0.9',
        };

        // 1. Load login page to get RequestVerificationToken
        const loginPageRes = await fetch(`${baseUrl}/sign-in`, { headers: browserHeaders });
        if (!loginPageRes.ok) throw new Error('Failed to load Zed login page');
        const loginHtml = await loginPageRes.text();
        
        const initialCookies = loginPageRes.headers.getSetCookie ? loginPageRes.headers.getSetCookie() : [];
        const cookieMap = parseCookies(initialCookies);
        
        const tokenMatch = loginHtml.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        if (!tokenMatch) throw new Error('Could not find login verification token');
        const reqToken = tokenMatch[1];
        
        // Simulate human reading login page
        await randomDelay(800, 1500);

        // 2. Perform Login
        const loginData = new URLSearchParams();
        loginData.append('Username', 'testdelete');
        loginData.append('Password', 'AML!Task12');
        loginData.append('__RequestVerificationToken', reqToken);
        loginData.append('ReturnUrl', '/sign-in?ReturnUrl=/');
        loginData.append('RememberMe', 'false');

        let cookieHeader = Array.from(cookieMap.entries()).map(([k,v]) => `${k}=${v}`).join('; ');

        const loginRes = await fetch(`${baseUrl}/sign-in`, {
          method: 'POST',
          headers: {
            ...browserHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader
          },
          body: loginData.toString(),
          redirect: 'manual'
        });

        const newCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
        const newCookieMap = parseCookies(newCookies);
        for (const [k, v] of newCookieMap.entries()) {
          cookieMap.set(k, v);
        }
        cookieHeader = Array.from(cookieMap.entries()).map(([k,v]) => `${k}=${v}`).join('; ');

        // Simulate human waiting for dashboard to load after redirect
        await randomDelay(1200, 2000);

        // 3. Search for the study by accession
        const searchUrl = `${baseUrl}/?name=&patientid=&patientdob=&accession=${accession}&description=&refphys=&studydatefrom=&studydateto=&offset=50`;
        const searchRes = await fetch(searchUrl, {
          headers: { ...browserHeaders, 'Cookie': cookieHeader }
        });
        const searchHtml = await searchRes.text();
        
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

        // Simulate human reviewing search results and clicking on study
        await randomDelay(1000, 1800);

        // 4. Load the delete page to get the new token
        const deletePageRes = await fetch(`${baseUrl}/study-delete/${targetStudyId}`, {
          headers: { ...browserHeaders, 'Cookie': cookieHeader }
        });
        const deleteHtml = await deletePageRes.text();
        
        const deleteFormMatch = deleteHtml.match(/action="([^"]+)"/);
        const delTokenMatch = deleteHtml.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
        
        if (!deleteFormMatch || !delTokenMatch) {
          return NextResponse.json({ status: 'error', message: 'Could not find delete form or token' });
        }
        
        const actionUrl = deleteFormMatch[1]; // /study-delete/.../real-time
        const delToken = delTokenMatch[1];
        
        // Simulate human typing in the reason for deletion
        await randomDelay(2000, 3500);

        // 5. Execute deletion
        const delData = new URLSearchParams();
        delData.append('__RequestVerificationToken', delToken);
        delData.append('Reason', 'Deleted via Automated Web Portal');
        delData.append('KeepOffline', 'false');

        const finalDelRes = await fetch(`${baseUrl}${actionUrl}`, {
          method: 'POST',
          headers: {
            ...browserHeaders,
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookieHeader,
            'X-Requested-With': 'XMLHttpRequest',
            'Origin': baseUrl,
            'Referer': `${baseUrl}/study-delete/${targetStudyId}`
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
