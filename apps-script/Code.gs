/**
 * Roseville Recruitment — Main Webhook  (Code.gs)
 * Project owner: recruitment@rosevillecaregroup.co.uk
 * Deployment:    AKfycbykQl3IQMAee0VWzYbw5YXgaUHeNcBvw7KoWDVnyj3hDMyjXEhE8GRlfEMkq-avcVX_4g
 *
 * Targeted edit of the working webhook (25 Oct 2026). Unchanged: sheet ID,
 * 7-point scoring and thresholds, sponsorship auto-reject, candidate email, Calendly block,
 * shortlist alert. Changed: York submissions go to the 'Able carers' tab; cook roles use their own 6-point scoring. Added: three appended columns (Start Availability, Channel, Campaign),
 * field normalisation, JSON responses, a try/catch around the sheet write that emails
 * recruitment@ with the payload on failure, and testAllRoutes().
 */

var SHEET_ID = '1wSZeKo4pmvtxbgHOwEzDNOxD7zBdgWoRrGsUZXZXk3I';
var ALERT_EMAIL = 'recruitment@rosevillecaregroup.co.uk';

var BASE_HEADERS = ['Timestamp','Source','Role','First Name','Last Name','Mobile','Email','Postcode','Shift Preference','Hours Per Week','Care Experience','Message','Requires Sponsorship','Score','Status','Jo Notes','Date Called'];
var EXTRA_HEADERS = ['Start Availability','Channel','Campaign'];   // appended after Date Called
var STATUS_COL = BASE_HEADERS.indexOf('Status') + 1;               // 15

// ───────────────────────── Web app entry point ─────────────────────────
function doPost(e) {
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return jsonOut({ ok: false, message: 'Error parsing JSON' });
  }

  var app = buildApplication(data);

  // ── Sheet write (guarded) ──
  try {
    app.rowNumber = writeApplication(app);
    console.log('Saved ' + app.firstName + ' ' + app.lastName + ' to "' + app.tabName + '" row ' + app.rowNumber);
  } catch(err) {
    console.error('Sheet write failed for ' + app.source + ': ' + err);
    try {
      GmailApp.sendEmail(ALERT_EMAIL, 'APPLICATION NOT SAVED — ' + app.source,
        'The tracker write failed and this application must be entered by hand.\n\n' +
        'Error: ' + err + '\n\nPayload:\n' + JSON.stringify(data, null, 2));
    } catch(mailErr) {
      console.error('Alert email failed: ' + mailErr);
    }
    return jsonOut({ ok: false, message: 'Could not save application: ' + err });
  }

  sendEmails(app);
  return jsonOut({ ok: true });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ───────────────────────── Parsing, normalising, scoring ─────────────────────────
function buildApplication(data) {
  var source = data.source || 'Unknown';

  // ── Tab routing (York page → 'Able carers' tab, matching the Main tracker) ──
  var tabName;
  if (source.indexOf('Melksham') > -1) {
    tabName = 'Melksham';
  } else if (source.indexOf('Limetree') > -1) {
    tabName = 'Limetree House';
  } else if (source.indexOf('Lodge') > -1) {
    tabName = 'The Lodge';
  } else {
    tabName = 'Able carers';   // York Landing Page = Able Carers
  }

  // ── Field mapping ──
  var firstName = data.firstName || data['first-name'] || '';
  var lastName = data.lastName || data['last-name'] || '';
  var mobile = normalisePhone(data.mobile || data.phone || '');
  var email = normaliseEmail(data.email || '');
  var postcode = normalisePostcode(data.postcode || '');
  var shift = data.shift || data['shift-pattern'] || data.shifts || data.availability || '';
  var hours = data.hours || data['hours-per-week'] || '';
  var experience = data.experience || data['care-experience'] || '';
  var message = data.message || data.notes || '';
  var sponsorship = data.sponsorship || data['requires-sponsorship'] || '';
  var role = data.role || '';
  var timestamp = data.timestamp || new Date().toISOString();
  var startAvailability = data.availability || '';
  var channel = data.channel || '';
  var campaign = data.campaign || '';

  // ── Scoring (unchanged) ──
  var score = 0;
  if (shift && shift.toLowerCase().indexOf('day') > -1) score++;
  if (shift && (shift.toLowerCase().indexOf('evening') > -1 || shift.toLowerCase().indexOf('night') > -1)) score++;
  if (hours && hours.toLowerCase().indexOf('full') > -1) score++;
  if (experience && experience.toLowerCase().indexOf('experience') > -1 && experience.indexOf('No experience') === -1) score++;
  if (experience && experience.indexOf('3+') > -1) score++;
  if (message && message.trim().length > 0) score++;
  if (data.hasCar && data.hasCar.toLowerCase() === 'yes') score++;

  // ── Cook roles: score on cooking, not care ──
  var isCook = role.toLowerCase().indexOf('cook') > -1;
  var maxScore = 7;
  if (isCook) {
    maxScore = 6;
    score = 0;
    var exp = experience.toLowerCase();
    if (exp.indexOf('3+') > -1) score += 3;
    else if (exp.indexOf('1–3') > -1 || exp.indexOf('1-3') > -1) score += 2;
    else if (exp.indexOf('some') > -1) score += 1;
    if (shift && shift.toLowerCase().indexOf('day') > -1) score++;
    var avail = (data.availability || '').toLowerCase();
    if (avail.indexOf('immediately') > -1 || avail.indexOf('2 weeks') > -1) score++;
    if (message && message.trim().length > 0) score++;
  }

  var status = 'Rejected';
  var statusColor = '#f4cccc';
  if (sponsorship && (sponsorship.toLowerCase() === 'yes' || sponsorship.toLowerCase().indexOf('require') > -1)) {
    status = 'Rejected - Sponsorship';
    statusColor = '#f4cccc';
    score = 0;
  } else if (score >= 3) {
    status = 'Shortlist';
    statusColor = '#d9ead3';
  } else if (score >= 1) {
    status = 'Warm Pool';
    statusColor = '#fff2cc';
  }

  var row = [timestamp, source, role, firstName, lastName, mobile, email, postcode, shift, hours, experience, message, sponsorship, score, status, '', '',
             startAvailability, channel, campaign];

  return {
    source: source, tabName: tabName, row: row,
    firstName: firstName, lastName: lastName, mobile: mobile, email: email, role: role,
    experience: experience, score: score, maxScore: maxScore, status: status, statusColor: statusColor
  };
}

function normaliseEmail(v) {
  return String(v).trim().toLowerCase();
}

function normalisePostcode(v) {
  return String(v).trim().toUpperCase().replace(/\s+/g, ' ');
}

function normalisePhone(v) {
  var digits = String(v).replace(/\D/g, '');
  if (digits.length === 12 && digits.indexOf('447') === 0) digits = '0' + digits.slice(2);   // +44 7xxx → 07xxx
  if (digits.length === 11 && digits.indexOf('07') === 0) return digits.slice(0, 5) + ' ' + digits.slice(5);
  return digits;
}

// ───────────────────────── Sheet write ─────────────────────────
function writeApplication(app) {
  var sheet = SpreadsheetApp.openById(SHEET_ID);
  var tab = sheet.getSheetByName(app.tabName);
  if (!tab) {
    tab = sheet.insertSheet(app.tabName);
    tab.appendRow(BASE_HEADERS.concat(EXTRA_HEADERS));
    tab.getRange('1:1').setFontWeight('bold');
  }
  ensureHeaders(tab);
  tab.appendRow(app.row);
  var lastRow = tab.getLastRow();
  tab.getRange(lastRow, STATUS_COL).setBackground(app.statusColor);
  SpreadsheetApp.flush();
  return lastRow;
}

// Appends any of the three new headers that an existing tab's header row lacks. Runs once per tab.
function ensureHeaders(tab) {
  var lastCol = Math.max(tab.getLastColumn(), 1);
  var header = tab.getRange(1, 1, 1, lastCol).getValues()[0].map(function(h) { return String(h).trim(); });
  var missing = EXTRA_HEADERS.filter(function(h) { return header.indexOf(h) === -1; });
  if (!missing.length) return;
  var start = header.length;
  while (start > 0 && header[start - 1] === '') start--;   // first empty column after the real headers
  tab.getRange(1, start + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
  console.log('Added headers to "' + tab.getName() + '": ' + missing.join(', '));
}

// ───────────────────────── Emails (unchanged) ─────────────────────────
function sendEmails(app) {
  var source = app.source, firstName = app.firstName, lastName = app.lastName, email = app.email,
      mobile = app.mobile, role = app.role, experience = app.experience, score = app.score, maxScore = app.maxScore, status = app.status;

  // ── Location config (Melksham → Limetree → Lodge → default York/Able Carers) ──
  var config;
  if (source.indexOf('Melksham') > -1) {
    config = {
      brandName: 'The Old Parsonage',
      emailSubject: 'Thanks for applying — The Old Parsonage',
      signOff: 'The Team at The Old Parsonage<br>Roseville Care Group',
      senderName: 'The Old Parsonage Careers',
      managerEmail: 'manager.oldparsonage@rosevillecaregroup.co.uk',
      calendlyUrl: 'https://calendly.com/manager-oldparsonage-rosevillecaregroup/application-call-the-old-parsonage'
    };
  } else if (source.indexOf('Limetree') > -1) {
    config = {
      brandName: 'Limetree House',
      emailSubject: 'Thanks for applying — Limetree House',
      signOff: 'The Team at Limetree House<br>Roseville Care Group',
      senderName: 'Limetree House Careers',
      managerEmail: 'manager.limetrees@rosevillecaregroup.co.uk',
      calendlyUrl: 'https://calendly.com/manager-limetrees-rosevillecaregroup/application-call-limetree-house'
    };
  } else if (source.indexOf('Lodge') > -1) {
    config = {
      brandName: 'The Lodge',
      emailSubject: 'Thanks for applying — The Lodge',
      signOff: 'The Team at The Lodge<br>Roseville Care Group',
      senderName: 'The Lodge Careers',
      managerEmail: 'manager.lodge@rosevillecaregroup.co.uk',
      calendlyUrl: 'https://calendly.com/manager-lodge-rosevillecaregroup/application-call-the-lodge'
    };
  } else {
    config = {
      brandName: 'Able Carers',
      emailSubject: 'Thanks for applying — Able Carers',
      signOff: 'The Team at Able Carers<br>Roseville Care Group',
      senderName: 'Able Carers Careers',
      managerEmail: 'manager.ablecarers@rosevillecaregroup.co.uk',
      calendlyUrl: 'https://calendly.com/manager-ablecarers-rosevillecaregroup/application-call-able-carers'
    };
  }

  // ── Calendly block for Shortlisted candidates ──
  var calendlyBlock = '';
  if (status === 'Shortlist') {
    calendlyBlock =
      '<p>To make things easy, you can book a time that suits you using the link below. Simply pick a slot and we\'ll call you then.</p>' +
      '<p style="margin:20px 0;"><a href="' + config.calendlyUrl + '" style="display:inline-block;background:#2d4a2d;color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:bold;">Book Your Call</a></p>';
  }

  // ── Candidate auto-response email ──
  try {
    if (email) {
      GmailApp.sendEmail(email, config.emailSubject,
        '',
        {
          htmlBody: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
            '<h2 style="color:#2d4a2d;">Hi ' + firstName + ',</h2>' +
            '<p>Thank you so much for getting in touch — we\'re really pleased you\'re interested in joining our team at ' + config.brandName + '.</p>' +
            '<p>We\'ve received your application and one of our team will give you a quick call within the next 24 hours to have an informal chat. It\'s nothing formal — just a chance for us to tell you a bit more about the role and for you to ask any questions.</p>' +
            calendlyBlock +
            '<p>If you have any questions in the meantime, feel free to reply to this email.</p>' +
            '<br><p>Warm regards,<br><strong>' + config.signOff + '</strong></p></div>',
          name: config.senderName
        }
      );
    }
  } catch(emailErr) {
    console.error('Candidate email error: ' + emailErr);
  }

  // ── Shortlist alert ──
  if (status === 'Shortlist') {
    try {
      GmailApp.sendEmail(config.managerEmail, 'New Shortlisted Applicant - ' + firstName + ' ' + lastName,
        '',
        {
          htmlBody: '<div style="font-family:Arial,sans-serif;">' +
            '<h3 style="color:#2d4a2d;">New Shortlisted Application</h3>' +
            '<p><strong>Name:</strong> ' + firstName + ' ' + lastName + '</p>' +
            '<p><strong>Role:</strong> ' + role + '</p>' +
            '<p><strong>Location:</strong> ' + config.brandName + '</p>' +
            '<p><strong>Phone:</strong> ' + mobile + '</p>' +
            '<p><strong>Email:</strong> ' + email + '</p>' +
            '<p><strong>Score:</strong> ' + score + '/' + maxScore + '</p>' +
            '<p><strong>Experience:</strong> ' + experience + '</p>' +
            '<p><a href="https://docs.google.com/spreadsheets/d/' + SHEET_ID + '/edit">View in Tracker</a></p></div>',
          name: config.senderName
        }
      );
    } catch(alertErr) {
      console.error('Manager alert email error: ' + alertErr);
    }
  }
}

// ───────────────────────── Editor test: run before deploying ─────────────────────────
// Writes one fake row per home through writeApplication(), checks it landed on the right tab,
// deletes it, and logs PASS/FAIL. Sends no emails.
function testAllRoutes() {
  var routes = [
    { source: 'Melksham Landing Page',       role: 'Care Assistant', tab: 'Melksham' },
    { source: 'York Landing Page',           role: 'Home Carer',     tab: 'Able carers' },
    { source: 'Limetree House Landing Page', role: 'Care Assistant', tab: 'Limetree House' },
    { source: 'The Lodge Landing Page',      role: 'Care Assistant', tab: 'The Lodge' }
  ];
  var sheet = SpreadsheetApp.openById(SHEET_ID);
  var allPassed = true;

  routes.forEach(function(r) {
    var marker = 'testAllRoutes ' + new Date().toISOString();
    var payload = {
      source: r.source, role: r.role, timestamp: new Date().toISOString(),
      firstName: 'TEST', lastName: 'ROUTE', phone: '+44 7543 277144', email: '  Test.Route@Example.COM ',
      postcode: 'yo26 6dl', shifts: 'Days', hours: 'Full-time', experience: '3+ years experience',
      availability: 'Immediately', 'requires-sponsorship': 'No', message: marker,
      channel: 'test', campaign: 'testAllRoutes'
    };
    var result = 'FAIL';
    var detail = '';
    try {
      var app = buildApplication(payload);
      var rowNum = writeApplication(app);
      var tab = sheet.getSheetByName(r.tab);
      var written = tab.getRange(rowNum, 1, 1, BASE_HEADERS.length + EXTRA_HEADERS.length).getValues()[0];
      var header = tab.getRange(1, 1, 1, tab.getLastColumn()).getValues()[0];
      var checks = [
        [app.tabName === r.tab, 'routed to ' + app.tabName],
        [written[1] === r.source && written[11] === marker, 'row content'],
        [written[5] === '07543 277144', 'phone ' + written[5]],
        [written[6] === 'test.route@example.com', 'email ' + written[6]],
        [written[7] === 'YO26 6DL', 'postcode ' + written[7]],
        [written[17] === 'Immediately' && written[18] === 'test' && written[19] === 'testAllRoutes', 'new columns'],
        [EXTRA_HEADERS.every(function(h) { return header.indexOf(h) > -1; }), 'headers present']
      ];
      var failed = checks.filter(function(c) { return !c[0]; }).map(function(c) { return c[1]; });
      tab.deleteRow(rowNum);
      result = failed.length ? 'FAIL' : 'PASS';
      detail = failed.length ? ' — ' + failed.join('; ') : ' — row ' + rowNum + ' written and deleted';
    } catch(err) {
      detail = ' — ' + err;
    }
    if (result === 'FAIL') allPassed = false;
    console.log(result + ': ' + r.tab + ' (' + r.source + ')' + detail);
  });

  console.log(allPassed ? 'ALL ROUTES PASS' : 'ONE OR MORE ROUTES FAILED');
  return allPassed;
}
