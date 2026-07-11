# OP Recruitment Script - Debug Handoff Notes

## The Problem
The Old Parsonage (Melksham) Apps Script receives form submissions and writes them to a Google Sheet correctly, but **emails are NOT being sent to candidates after the very first execution**. The first form submission at 12:29 PM sent an email successfully. Every submission after that silently fails to send email — no error is shown because the code has a try/catch that swallows errors via Logger.log.

## Key Accounts & Resources

- **Script owner**: manager.oldparsonage@rosevillecaregroup.co.uk (Google account u/3)
- **Apps Script project ID**: `1gkuN7C-jLfPMPGlMy3NbDFeCWSDl5LCrweYSz16Q8ZJidn-kdZdWVMXa`
- **Direct editor link**: https://script.google.com/u/3/home/projects/1gkuN7C-jLfPMPGlMy3NbDFeCWSDl5LCrweYSz16Q8ZJidn-kdZdWVMXa/edit
- **Deployment ID**: `AKfycbyW_TGHkolLKD2HnBqyks7FWRryOCpnkJalKiyjNnQZ_ZO-bB3elgTTZi_uNbUBF1zx-g`
- **Currently deployed as**: Version 3 (deployed Apr 1, 2026)
- **Google Sheet (Roseville Recruitment Tracker)**: `1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo` — Melksham tab
- **Netlify form**: https://roseville-care-recruitment.netlify.app/melksham
- **Test email address**: harrysharp.spam@gmail.com (Harry's spam inbox)

## What We Know

1. The script uses **MailApp.sendEmail** (not GmailApp) — this was changed from GmailApp in an earlier fix.
2. The web app is deployed to run as "me" (the script owner) with access for "Anyone".
3. **5 executions** are logged, all showing status "Completed":
   - 12:29 PM — 4.364s — **EMAIL SENT** (confirmed in Sent folder)
   - 12:36 PM — 0.743s — Editor run (Head deployment, no email expected)
   - 1:04:15 PM — 4.607s — **NO EMAIL**
   - 1:04:20 PM — 2.337s — **NO EMAIL**
   - 1:14:02 PM — 3.16s — **NO EMAIL** (this was a "Tywin Lannister" test)
4. The try/catch around MailApp.sendEmail logs errors to **Logger.log**, which is NOT visible for web app executions — you need **console.log** or **Cloud Logging** to see errors from web app runs.
5. The working **Able Carers** script (different account: manager.ablecarers@, project ID `1xFtQCp8Qd_976TIrzjC3amUwWv0xTrATXSfZSnIFx0aFUAetdwkeXoTq`) sends emails fine using the same MailApp approach.

## What Needs To Happen Next

### Step 1: Add a testEmail() function and SAVE it
The Apps Script editor kept freezing/not saving. You need to add this function at the bottom of Code.gs:

```javascript
function testEmail() {
  Logger.log('Quota remaining: ' + MailApp.getRemainingDailyQuota());
  try {
    MailApp.sendEmail('harrysharp.spam@gmail.com', 'Test from OP Script', 'This is a test email to check MailApp works.');
    Logger.log('Email sent OK');
  } catch(e) {
    Logger.log('Email error: ' + e);
  }
}
```

**Tips for saving**: Close ALL other Apps Script editor tabs for this project first — having multiple tabs open to the same project seems to block saves. Only have ONE tab open.

### Step 2: Run testEmail() from the editor
1. Select "testEmail" from the function dropdown (currently shows "doPost")
2. Click "Run"
3. If it asks for authorization, approve it
4. Check the **Execution log** panel at the bottom — it will show:
   - The remaining daily email quota
   - Either "Email sent OK" or the exact error message

### Step 3: Fix based on the error
Likely causes:
- **Quota exhausted**: If quota shows 0, need to wait or use a different sending method
- **Authorization issue**: MailApp may need re-authorization — the "Run" from editor will trigger the auth prompt
- **Service restriction**: The Google Workspace admin may have restricted email sending for this account

### Step 4: If the fix involves code changes
After fixing, you'll need to create a **new deployment version** (Version 4) since the web app runs the deployed version, not the Head/editor version.

## The Existing Code Structure (Code.gs — 106 lines)
- Lines 1-8: doPost(e) — parse JSON
- Lines 10-18: Set up sheet tab ("Melksham")
- Lines 20-31: Extract form fields
- Lines 33-50: Scoring logic (0-6 score)
- Lines 51-58: Determine status, append row to sheet
- Lines 60-79: **Candidate auto-response email** (MailApp.sendEmail in try/catch)
- Lines 81-103: **Shortlist alert email** to manager (only if status === 'Shortlist')
- Line 105: Return 'OK'

## Important Context
- The Able Carers script works perfectly — compare its setup if needed
- Harry wants all browser work done by the assistant (he doesn't want to do manual steps in the browser)
- After fixing the email issue, the testEmail() function should be removed and a clean version redeployed
