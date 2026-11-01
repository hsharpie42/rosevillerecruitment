# Recruitment site — deploy notes (brief v2, 25 Oct 2026)

Four landing pages on Netlify post applications to one Google Apps Script web app,
which writes to the **Main** tracker and sends the emails. This folder holds the
script; `../co work roseville recruitment/snippets/` holds the page snippets that
are already applied to `roseville-site/`.

| Piece | Where | ID |
|---|---|---|
| Pages | Netlify site `roseville-care-recruitment`, folder `roseville-site/` | drag-and-drop deploy |
| Webhook | Apps Script "Roseville Recruitment — Main Webhook", owner `recruitment@rosevillecaregroup.co.uk` | deployment `AKfycbykQl3IQMAee0VWzYbw5YXgaUHeNcBvw7KoWDVnyj3hDMyjXEhE8GRlfEMkq-avcVX_4g` |
| Main tracker | Google Sheet, tabs `Melksham`, `Able carers`, `Limetree House`, `The Lodge` | `1wSZeKo4pmvtxbgHOwEzDNOxD7zBdgWoRrGsUZXZXk3I` |

## 1. Webhook (`Code.gs`) — deploy as a new version of the existing deployment

1. Open the "Roseville Recruitment — Main Webhook" project as `recruitment@`, replace the contents of `Code.gs` with this folder's `Code.gs`, save.
2. Run **`testAllRoutes`** from the function dropdown. Approve permissions if asked. The execution log must show `PASS` for Melksham, Able carers, Limetree House and The Lodge, then `ALL ROUTES PASS`. Each test row is written and deleted; no emails are sent. The first run also appends the three new headers (`Start Availability`, `Channel`, `Campaign`) to each tab.
3. Deploy → **Manage deployments** → pencil on the existing deployment → Version **New version** → Deploy. Do **not** create a new deployment: the URL is hard-coded in four live pages.

What changed, and only this: three appended columns populated from `availability`, `channel`, `campaign`; email lower-cased and trimmed, postcode upper-cased, phone digits-only and formatted `07543 277144`; JSON responses (`{ok:true}` / `{ok:false,message}`); the sheet write is wrapped so a failure emails `recruitment@` with subject `APPLICATION NOT SAVED — <source>` and the full payload, then returns `{ok:false}`; `testAllRoutes()`. York submissions now go to the `Able carers` tab (the Main tracker's name for it) instead of `York`. Roles whose name does not contain "care", "nurse" or "something else" (cook, kitchen assistant, cleaner, laundry, activities, maintenance) are scored out of 6 on trade experience (3+ years +3, 1–3 +2, some +1), day shifts +1, start within two weeks +1 and a message +1; "Something else" deliberately stays on the care model so the manager reads the message. The manager alert shows the score out of the model's maximum. Sheet ID, scoring, thresholds, sponsorship reject, candidate email, Calendly block and shortlist alert are untouched. `Logger.log` became `console.log` so web-app errors show under Executions.

## 2 & 3. Pages — redeploy `roseville-site/` to Netlify

The files in `roseville-site/` (the four home pages, the hub and `_redirects`) already carry the new form handler and the tracking blocks. Before uploading:

1. **Phone numbers** are set: The Old Parsonage `01225 782167`, Able Carers `01904 795551`, Limetree House `01904 795280`, The Lodge `01904 430781`.
2. **Analytics IDs** are set in all pages: GA4 `G-1ZQCKZC1Q4`, Meta Pixel `28509618148734858`. No placeholders remain.
3. Upload the `roseville-site/` folder to Netlify (Deploys → drag and drop).

Form behaviour now: POST as `text/plain;charset=utf-8` with no `no-cors`, so the JSON reply is readable. The success panel shows only when the HTTP status is OK **and** the body is `{ok:true}`. Otherwise the button is re-enabled and an inline error with a `tel:` link appears; the success panel never shows. The button is disabled while in flight, so a double-click produces one row. `utm_source/medium/campaign/content` are captured on any page (the hub included), kept in `sessionStorage`, and sent as `channel`, `campaign`, `content`, `medium`; with no tags the referrer decides facebook / instagram / indeed / google / direct. `gtag('event','application_submit')` and `fbq('track','Lead')` fire on success only. All existing fields are sent under their existing names; York's `transport` is also sent as `hasCar` so the car point in the scoring model works.

**Role dropdown.** Each form has `<select id="role" name="role" required>` under the name fields: ten options on the three home pages, four on York, plus "Something else — I'll explain below". On load, `?role=` in the URL pre-selects the matching option, case-insensitively and by prefix (`?role=cleaner` → "Cleaner / Domestic", `?role=nurse` → "Nurse (RGN/RMN)"); an unrecognised value leaves the placeholder. On submit the role sent is the dropdown value, else the `?role=` value, else the page's default (`Care Assistant`, or `Home Carer` on York), so the Role column is never empty. GA4 `application_submit` and the Meta `Lead` event carry the resolved role and the home. Adverts link with the role in the URL, e.g. `/melksham?role=Cleaner%20%2F%20Domestic&utm_source=facebook&utm_medium=paid&utm_campaign=cleaner-melksham&utm_content=ad1-rate`.

**`_redirects`.** The cook vacancy briefly had its own page at `/melksham-cook`; adverts may still link to it. Netlify redirects it (301) to `/melksham?role=Cook`, carrying any `utm_*` parameters through. The rules are matched in order, so the versions with query parameters come first and the bare one last.

## Verification against the acceptance criteria

| # | Check | How |
|---|---|---|
| 1 | `testAllRoutes()` PASS ×4 | Apps Script editor log |
| 2 | Real submission per page lands on the right tab with the three new columns filled | submit once per page, then delete the rows |
| 3 | Candidate email, Calendly on Shortlist, manager alert | use a Shortlist-scoring test submission |
| 4 | Broken endpoint → inline error, no success, `APPLICATION NOT SAVED` email | temporarily change `SHEET_ID` to an invalid ID, deploy a version, submit, then restore |
| 5 | GA4 Realtime shows page view and `application_submit` | after real IDs are in |
| 6 | Meta Events Manager shows PageView and Lead | after real IDs are in |
| 7 | Tagged URL → Channel and Campaign populated | open a link from `UTM-LINKS.md` |
| 8 | Double-click → one row | button is disabled in flight |

Automated checks run on 25 Oct 2026 before commit: the script under stubbed Sheets/Gmail (header append, normalisation, routing, failure email, JSON replies, `testAllRoutes` clean-up) and the pages in headless Chromium with a mocked endpoint (success only on `{ok:true}`, error on `{ok:false}` / network failure / HTTP 500, one request on triple submit, UTM carry-over from the hub, referrer sniffing, York `hasCar`, `form_viewed` once, no page errors).
