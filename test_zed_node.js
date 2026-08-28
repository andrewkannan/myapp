const fs = require('fs');

async function testZed() {
  const baseUrl = 'https://doctor.asiamedic.com.sg';
  const accession = 'AM0042583';

  console.log('1. Fetching login page...');
  const loginPageRes = await fetch(`${baseUrl}/sign-in`);
  const loginHtml = await loginPageRes.text();
  
  const parseCookies = (cookieArray) => {
    const map = new Map();
    cookieArray.forEach(c => {
      const parts = c.split(';')[0].split('=');
      const key = parts[0];
      const val = parts.slice(1).join('=');
      if (val) {
        map.set(key, val); // Only set if not empty, or just set it
      }
    });
    return map;
  };

  const cookies = loginPageRes.headers.getSetCookie ? loginPageRes.headers.getSetCookie() : [];
  const initialCookieMap = parseCookies(cookies);
  
  const tokenMatch = loginHtml.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/);
  if (!tokenMatch) {
    console.log('Token not found');
    return;
  }
  const reqToken = tokenMatch[1];
  console.log('Token:', reqToken);
  
  const loginData = new URLSearchParams();
  loginData.append('Username', 'testdelete');
  loginData.append('Password', 'AML!Task12');
  loginData.append('__RequestVerificationToken', reqToken);
  loginData.append('ReturnUrl', '/sign-in?ReturnUrl=/');
  loginData.append('RememberMe', 'false');

  let cookieHeader = Array.from(initialCookieMap.entries()).map(([k,v]) => `${k}=${v}`).join('; ');

  console.log('2. Performing login...');
  const loginRes = await fetch(`${baseUrl}/sign-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookieHeader
    },
    body: loginData.toString(),
    redirect: 'manual'
  });

  console.log('Login Status:', loginRes.status);
  console.log('Location:', loginRes.headers.get('location'));
  
  const newCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [];
  const newCookieMap = parseCookies(newCookies);
  // Merge
  for (const [k, v] of newCookieMap.entries()) {
    initialCookieMap.set(k, v);
  }
  cookieHeader = Array.from(initialCookieMap.entries()).map(([k,v]) => `${k}=${v}`).join('; ');
  
  console.log('Auth Cookies length:', cookieHeader.length);

  console.log('3. Searching for accession...');
  const searchUrl = `${baseUrl}/?name=&patientid=&patientdob=&accession=${accession}&description=&refphys=&studydatefrom=&studydateto=&offset=50`;
  const searchRes = await fetch(searchUrl, {
    headers: { 'Cookie': cookieHeader }
  });
  const searchHtml = await searchRes.text();
  
  fs.writeFileSync('search_result.html', searchHtml);
  
  const studyRows = searchHtml.split('<tr class="double-click single-click " data-study-id="');
  console.log(`Found ${studyRows.length - 1} study rows in HTML`);
  
  let targetStudyId = null;
  for (let i = 1; i < studyRows.length; i++) {
    const rowText = studyRows[i];
    const studyId = rowText.substring(0, rowText.indexOf('"'));
    if (rowText.toLowerCase().includes(accession.toLowerCase())) {
      targetStudyId = studyId;
      console.log('Match found! Study ID:', targetStudyId);
      break;
    }
  }
  
  if (!targetStudyId) {
    console.log('Target study ID not found in HTML.');
  }
}

testZed();
