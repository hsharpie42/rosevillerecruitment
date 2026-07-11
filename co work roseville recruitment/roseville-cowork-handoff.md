# Roseville Recruitment — Cowork Handoff Brief

## What this project is
Two recruitment landing pages for Roseville Care Group that need to go live on their domain. The goal is to replace agency hiring (£3–5k per hire) with an in-house system that captures applications automatically into a Google Sheet.

---

## What has already been built

### Two HTML landing pages (already complete, no changes needed)
- **melksham-recruitment.html** — Care Assistant roles at The Old Parsonage, Melksham, Wiltshire
- **york-homecare-recruitment.html** — Home Carer roles in York

Both pages are fully designed and functional except the form submit handler currently only does `console.log()` — it does not send data anywhere yet. That is the main thing to fix.

### A Google Apps Script webhook (written, saved, not yet deployed)
- **Account:** harry42.sharp@gmail.com
- **Project name:** Roseville Recruitment — Form Webhook
- **URL:** https://script.google.com/u/1/home/projects/1bAcMM-5mYE7uoMXoZokXZ_3jYyH2ycqdjRV3KMxrNRNFPjg6wz7AXhmB/edit
- **Status:** Script is saved and correct. Needs to be deployed as a Web App with "Who has access: Anyone". This was interrupted before completion.

### The Google Sheet (already exists)
- **Account:** harry42.sharp@gmail.com
- **Name:** Roseville Recruitment Tracker
- **ID:** 1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo
- **URL:** https://docs.google.com/spreadsheets/d/1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo/edit

### The domain
- **Domain:** rosevillecaregroup.co.uk
- **Registrar:** Squarespace (domain only — no Squarespace website has been created)
- **Current state:** Showing a "coming soon" placeholder
- **Plan:** Host pages on Netlify (free), point domain DNS at Netlify from Squarespace

---

## What needs to happen — in order

### Step 1: Deploy the Apps Script webhook
1. Go to the Apps Script project linked above (logged in as harry42.sharp@gmail.com)
2. Click Deploy → New deployment → Web app
3. Set "Execute as: Me" and "Who has access: Anyone"
4. Click Deploy and approve the permissions (Gmail + Sheets access)
5. Copy the Web App URL (format: `https://script.google.com/macros/s/XXXXXX/exec`)

### Step 2: Wire the webhook URL into both HTML files
In both HTML files, find the form submit handler (at the bottom of each file in the `<script>` tag). Replace the current placeholder with a real fetch POST:

```javascript
document.getElementById('applicationForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const data = new FormData(e.target);
  const entry = Object.fromEntries(data.entries());
  entry.timestamp = new Date().toISOString();
  entry.source = 'Melksham Landing Page'; // or 'York Landing Page' for york file
  entry.role = 'Care Assistant'; // or 'Home Carer' for york file

  try {
    await fetch('PASTE_WEBHOOK_URL_HERE', {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry)
    });
  } catch(err) {
    console.error('Submission error:', err);
  }

  document.getElementById('applicationForm').style.display = 'none';
  document.getElementById('successState').style.display = 'block';
  document.getElementById('form-wrapper').scrollIntoView({ behavior: 'smooth', block: 'center' });
});
```

### Step 3: Deploy both HTML files to Netlify
1. Create a free account at netlify.com (or log in)
2. Drag and drop both HTML files into a new Netlify site
3. Note the Netlify URLs assigned (e.g. `random-name.netlify.app/melksham-recruitment.html`)
4. Optionally rename them: melksham.html and york.html for cleaner URLs

### Step 4: Point the domain at Netlify
1. In Netlify: Site settings → Domain management → Add custom domain → rosevillecaregroup.co.uk
2. Netlify will show you DNS records to add (an A record and CNAME)
3. In Squarespace: go to account.squarespace.com → Domains → rosevillecaregroup.co.uk → DNS settings
4. Add the records Netlify specifies
5. Allow up to 24 hours to propagate (usually much faster)

---

## What the Apps Script does (for reference)
- Receives POST data from both landing pages
- Automatically creates a "Melksham" or "York" tab in the Google Sheet if not already there
- Writes each application as a row with all fields + auto-calculated score
- Scores candidates 0–6 based on: driving licence, day shifts, evening/night shifts, weekend availability, care experience, filled in message field
- Sponsorship required = auto-rejected
- Score 3+ = Shortlist (green), 1–2 = Warm Pool (yellow), 0 = Rejected (red)
- Sends automated confirmation email to the candidate immediately
- Sends alert email to Jo (jo.ht@rosevilleholdings.co.uk) for every shortlisted applicant

---

## Key contacts / credentials
- Harry's Google account for this project: harry42.sharp@gmail.com
- Jo's email (alerts go here): jo.ht@rosevilleholdings.co.uk
- Squarespace login: harry42.sha... (Harry to confirm — same Google account)
