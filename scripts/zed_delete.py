import sys
import requests
from bs4 import BeautifulSoup
import json
import time

def delete_study(accession_no):
    base_url = "https://doctor.asiamedic.com.sg"
    session = requests.Session()
    
    # Optional headers to look like a browser
    session.headers.update({
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    })

    try:
        # 1. Load login page to get RequestVerificationToken
        login_url = f"{base_url}/sign-in"
        resp = session.get(login_url)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        token_input = soup.find('input', {'name': '__RequestVerificationToken'})
        if not token_input:
            return {"status": "error", "message": "Could not find login verification token"}
        
        req_token = token_input.get('value')
        
        # 2. Perform Login
        login_payload = {
            'Username': 'testdelete',
            'Password': 'AML!Task12',
            '__RequestVerificationToken': req_token,
            'ReturnUrl': '/',
            'RememberMe': 'false'
        }
        resp = session.post(login_url, data=login_payload)
        resp.raise_for_status()
        
        # Check if login succeeded (we should be redirected to /)
        if "/sign-in" in resp.url and "ReturnUrl" in resp.url:
            return {"status": "error", "message": "Login to Zed failed"}

        # 3. Search for the study by accession
        search_url = f"{base_url}/?accession={accession_no}"
        resp = session.get(search_url)
        resp.raise_for_status()
        
        soup = BeautifulSoup(resp.text, 'html.parser')
        
        # Find the row containing the study
        # We look for tr that has data-study-id
        rows = soup.find_all('tr', {'data-study-id': True})
        study_ids = []
        for row in rows:
            # Verify the accession matches just in case
            acc_td = row.find('td', {'data-title': 'Accession No.'})
            if acc_td and accession_no.lower() in acc_td.text.strip().lower():
                study_ids.append(row.get('data-study-id'))
        
        if not study_ids:
            return {"status": "error", "message": f"No study found for accession {accession_no} in Zed"}
        
        # Process each found study (usually just 1)
        deleted_count = 0
        for study_id in study_ids:
            # 4. Load the delete page for this study to get the new token
            delete_page_url = f"{base_url}/study-delete/{study_id}"
            resp = session.get(delete_page_url)
            resp.raise_for_status()
            
            soup = BeautifulSoup(resp.text, 'html.parser')
            form = soup.find('form', id='study-delete-form')
            
            if not form:
                continue # Could not find form, maybe already deleted or no permission
            
            action_url = form.get('action') # e.g. /study-delete/.../real-time
            token_input = form.find('input', {'name': '__RequestVerificationToken'})
            del_token = token_input.get('value') if token_input else ''
            
            # 5. Execute deletion
            delete_post_url = f"{base_url}{action_url}"
            delete_payload = {
                '__RequestVerificationToken': del_token,
                'Reason': 'Deleted via Automated Web Portal',
                'KeepOffline': 'false'
            }
            
            # Since the form is submitted via AJAX in the browser, we send it as standard form data
            # Or we can pass 'X-Requested-With': 'XMLHttpRequest' to act like ajax
            session.headers.update({'X-Requested-With': 'XMLHttpRequest'})
            
            resp = session.post(delete_post_url, data=delete_payload)
            if resp.status_code == 200:
                deleted_count += 1
            else:
                pass
        
        if deleted_count > 0:
            return {"status": "success", "message": f"Deleted {deleted_count} study(s) in Zed"}
        else:
            return {"status": "error", "message": "Found study but failed to delete"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Accession number argument missing"}))
        sys.exit(1)
        
    acc_no = sys.argv[1]
    result = delete_study(acc_no)
    print(json.dumps(result))
