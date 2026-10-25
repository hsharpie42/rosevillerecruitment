# Recruitment form webhook — where applications go, and how to fix the tracker

## How the system is wired

| Piece | Where it lives | Notes |
|---|---|---|
| Landing pages (`/melksham`, `/york`, `/lodge`, `/limetreehouse`) | Netlify site `roseville-care-recruitment`, custom domain `rosevillecaregroup.co.uk` | Static HTML. GitHub (`co work roseville recruitment/roseville-site/`) holds a copy; Netlify is not deployed from GitHub unless it has since been linked. |
| Form handler | Google Apps Script web app, deployment ID starting `AKfycbykQl3IQMAe…` | All four pages POST to this one URL with `mode: 'no-cors'`. The script writes the row to a spreadsheet and sends the emails. |
| Tracker spreadsheet | Google Sheets, ID in `CONFIG.SHEET_ID` of `Code.gs` | The previous shared script (`main-webhook.js`) wrote to sheet `1wSZeKo4…`, **not** the "Roseville Recruitment Tracker" (`1ueL81uM…`). |

The page always shows the "thank you" screen, whether or not the POST succeeded. The browser cannot see the response because of `no-cors`. So the only places that prove an application arrived are the Apps Script **Executions** log and the spreadsheet the deployed script writes to.

## Finding the two missing Melksham applications

Do these in order. Stop as soon as you find them.

1. **Open the manager's alert email.** The "View in Tracker" link in the old script's email points at the spreadsheet the *deployed* code writes to. Click it. If it opens a spreadsheet you did not know about, that is where the rows are. The email itself also carries name, phone, email and score, so the candidate data is recoverable from it even if the sheet is wrong.
2. **Check Executions.** In the Apps Script editor for the project that owns deployment `AKfycbykQl3…` (Deploy → Manage deployments lists it), open **Executions** on the left. Every website submission is a `doPost` run. The old code only used `Logger.log`, which is invisible for web-app runs, so a run can show "Completed" and still have failed to email. If there are no `doPost` runs at the times the manager received her emails, the emails did not come from this deployment and another script (the older per-location one, deployment `AKfycbyW_TGHk…` owned by manager.oldparsonage@) handled them.
3. **Check the other spreadsheet.** Sheet `1wSZeKo4pmvtxbgHOwEzDNOxD7zBdgWoRrGsUZXZXk3I` is the one `main-webhook.js` hard-codes. It may be owned by whichever Google account deployed the script, in which case the managers cannot see it. Open it as that account and look at the Melksham tab.
4. **Open the deployed URL in a browser** once the new `Code.gs` is live: `https://script.google.com/macros/s/AKfycbykQl3IQMAee0VWzYbw5YXgaUHeNcBvw7KoWDVnyj3hDMyjXEhE8GRlfEMkq-avcVX_4g/exec`. It prints the script version, the account it runs as, the spreadsheet name and URL, the tabs with row counts, and the email quota. The old script prints nothing useful for GET.

## Deploying the fix (keeps the same URL, no website change needed)

1. In the Apps Script project that owns deployment `AKfycbykQl3…`, replace the contents of `Code.gs` with the `Code.gs` in this folder.
2. Set `CONFIG.SHEET_ID` to the spreadsheet the managers actually use. It defaults to the Roseville Recruitment Tracker (`1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo`). The account that runs the script must have edit access to that file.
3. Run `selfTest` from the function dropdown once. Approve the permissions prompt. Check the Execution log, the tracker's Melksham tab (a "Test Applicant" row should appear) and the fallback inbox.
4. Deploy → **Manage deployments** → pencil icon on the existing deployment → Version: **New version** → Deploy. Editing the existing deployment keeps the `/exec` URL, so the HTML pages need no change. Creating a *new* deployment would change the URL and the pages would keep posting to the old code.
5. Confirm by opening the `/exec` URL in a browser (step 4 above) and by submitting the live form once.
6. Delete the test rows from the tracker.

## What changed in the script

- One `CONFIG.SHEET_ID` constant instead of a hard-coded ID buried in `doPost`, and the same ID is used in the "View in Tracker" link.
- `console.log` / `console.error` instead of `Logger.log`, so web-app runs show their errors under Executions.
- The spreadsheet write, candidate email and manager email are each in their own try/catch. One failing no longer hides the others.
- The manager is emailed for **every** application (set `NOTIFY_MANAGER_ON_EVERY_APPLICATION` to `false` to go back to shortlist-only), and the subject says "ACTION NEEDED (not saved to tracker)" when the sheet write failed.
- Any error also sends the full application to `CONFIG.FALLBACK_EMAIL`, so a candidate can never vanish silently.
- `doGet` diagnostics page and a `selfTest` function.
- `MailApp` with `replyTo` set to the location manager, so candidate replies reach the home rather than the script owner.
- Scoring and statuses are unchanged.
