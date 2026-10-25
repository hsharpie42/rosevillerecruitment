/**
 * Roseville Care Group — Recruitment Form Webhook (Code.gs)
 *
 * One script serves every landing page (Melksham, Limetree House, The Lodge, York).
 * Each page POSTs JSON to this web app's /exec URL. The script:
 *   1. appends a row to the tracker spreadsheet (CONFIG.SHEET_ID) on the location's tab
 *   2. emails the candidate an auto-response
 *   3. emails the location manager (every application, not only shortlisted ones)
 *   4. if the spreadsheet write fails, emails the full application to the manager and
 *      CONFIG.FALLBACK_EMAIL so no candidate is ever lost
 *
 * Everything is logged with console.log so it shows under Executions for web-app runs.
 * Open the /exec URL in a browser (GET) to see which spreadsheet THIS deployment writes to.
 */

var CONFIG = {
  // Roseville Recruitment Tracker. Change this one line to move every location to another file.
  SHEET_ID: '1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo',
  // Gets a copy of every error and of any application that could not be saved.
  FALLBACK_EMAIL: 'harry42.sharp@gmail.com',
  // true  = manager is emailed for every application (score and status in the subject)
  // false = manager is emailed only for Shortlist, as the old script did
  NOTIFY_MANAGER_ON_EVERY_APPLICATION: true,
  SCRIPT_VERSION: '2026-10-25.1'
};

var HEADERS = ['Timestamp', 'Source', 'Role', 'First Name', 'Last Name', 'Mobile', 'Email',
  'Postcode', 'Shift Preference', 'Hours Per Week', 'Care Experience', 'Message',
  'Requires Sponsorship', 'Score', 'Status', 'Jo Notes', 'Date Called'];

var LOCATIONS = [
  { match: 'Melksham', tab: 'Melksham', brandName: 'The Old Parsonage',
    managerEmail: 'manager.oldparsonage@rosevillecaregroup.co.uk',
    calendlyUrl: 'https://calendly.com/manager-oldparsonage-rosevillecaregroup/application-call-the-old-parsonage' },
  { match: 'Limetree', tab: 'Limetree House', brandName: 'Limetree House',
    managerEmail: 'manager.limetrees@rosevillecaregroup.co.uk',
    calendlyUrl: 'https://calendly.com/manager-limetrees-rosevillecaregroup/application-call-limetree-house' },
  { match: 'Lodge', tab: 'The Lodge', brandName: 'The Lodge',
    managerEmail: 'manager.lodge@rosevillecaregroup.co.uk',
    calendlyUrl: 'https://calendly.com/manager-lodge-rosevillecaregroup/application-call-the-lodge' },
  { match: 'York', tab: 'York', brandName: 'Able Carers',
    managerEmail: 'manager.ablecarers@rosevillecaregroup.co.uk',
    calendlyUrl: 'https://calendly.com/manager-ablecarers-rosevillecaregroup/application-call-able-carers' }
];

function locationFor(source) {
  for (var i = 0; i < LOCATIONS.length; i++) {
    if (source.indexOf(LOCATIONS[i].match) > -1) return LOCATIONS[i];
  }
  return LOCATIONS[LOCATIONS.length - 1]; // York / Able Carers, as before
}

// ───────────────────────── GET: diagnostics ─────────────────────────
// Visit the deployment's /exec URL in a browser to confirm what it is wired to.
function doGet() {
  var lines = ['Roseville recruitment webhook', 'version: ' + CONFIG.SCRIPT_VERSION,
    'runs as: ' + Session.getEffectiveUser().getEmail(),
    'sheet id: ' + CONFIG.SHEET_ID];
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
    lines.push('sheet name: ' + ss.getName());
    lines.push('sheet url: ' + ss.getUrl());
    lines.push('tabs: ' + ss.getSheets().map(function (s) { return s.getName() + ' (' + (s.getLastRow() - 1) + ' rows)'; }).join(', '));
  } catch (err) {
    lines.push('SHEET ERROR: ' + err);
  }
  try { lines.push('email quota remaining today: ' + MailApp.getRemainingDailyQuota()); }
  catch (err) { lines.push('EMAIL ERROR: ' + err); }
  return ContentService.createTextOutput(lines.join('\n')).setMimeType(ContentService.MimeType.TEXT);
}

// ───────────────────────── POST: an application ─────────────────────────
function doPost(e) {
  var result = { ok: false, saved: false, candidateEmailed: false, managerEmailed: false, errors: [] };
  var data = parseBody(e);
  if (!data) {
    console.error('Could not parse request body: ' + JSON.stringify(e && e.postData));
    notifyFallback('Recruitment webhook: unreadable submission', 'Raw body:\n' + (e && e.postData ? e.postData.contents : '(none)'));
    return respond(result, 'Error parsing body');
  }

  var app = buildApplication(data);
  console.log('Application received: ' + JSON.stringify(app));

  // 1. Save to tracker
  try {
    app.rowNumber = appendToTracker(app);
    result.saved = true;
    console.log('Saved to tab "' + app.location.tab + '" row ' + app.rowNumber);
  } catch (err) {
    result.errors.push('sheet: ' + err);
    console.error('Tracker write FAILED: ' + err);
  }

  // 2. Candidate auto-response
  if (app.email) {
    try {
      sendCandidateEmail(app);
      result.candidateEmailed = true;
    } catch (err) {
      result.errors.push('candidate email: ' + err);
      console.error('Candidate email FAILED: ' + err);
    }
  }

  // 3. Manager notification (always when the save failed, so the data is not lost)
  var shouldNotify = CONFIG.NOTIFY_MANAGER_ON_EVERY_APPLICATION || app.status === 'Shortlist' || !result.saved;
  if (shouldNotify) {
    try {
      sendManagerEmail(app, result.saved);
      result.managerEmailed = true;
    } catch (err) {
      result.errors.push('manager email: ' + err);
      console.error('Manager email FAILED: ' + err);
    }
  }

  // 4. Fallback copy if anything went wrong
  if (result.errors.length) {
    notifyFallback('Recruitment webhook problem — ' + app.firstName + ' ' + app.lastName + ' (' + app.location.brandName + ')',
      'Errors:\n' + result.errors.join('\n') + '\n\nFull application:\n' + JSON.stringify(app, null, 2));
  }

  result.ok = result.saved;
  console.log('Result: ' + JSON.stringify(result));
  return respond(result, result.ok ? 'OK' : 'ERROR');
}

function parseBody(e) {
  if (!e) return null;
  if (e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (ignored) { /* fall through */ }
  }
  if (e.parameter && Object.keys(e.parameter).length) return e.parameter; // form-encoded fallback
  return null;
}

function buildApplication(data) {
  var source = data.source || 'Unknown';
  var app = {
    timestamp: data.timestamp || new Date().toISOString(),
    source: source,
    role: data.role || '',
    firstName: data.firstName || data['first-name'] || '',
    lastName: data.lastName || data['last-name'] || '',
    mobile: data.mobile || data.phone || '',
    email: data.email || '',
    postcode: data.postcode || '',
    shift: data.shift || data['shift-pattern'] || data.shifts || data.availability || '',
    hours: data.hours || data['hours-per-week'] || '',
    experience: data.experience || data['care-experience'] || '',
    message: data.message || data.notes || '',
    sponsorship: data.sponsorship || data['requires-sponsorship'] || '',
    hasCar: data.hasCar || '',
    location: locationFor(source)
  };

  // Scoring — identical to the previous script (0–7)
  var score = 0;
  var shift = app.shift.toLowerCase(), hours = app.hours.toLowerCase(), exp = app.experience.toLowerCase();
  if (shift.indexOf('day') > -1) score++;
  if (shift.indexOf('evening') > -1 || shift.indexOf('night') > -1) score++;
  if (hours.indexOf('full') > -1) score++;
  if (exp.indexOf('experience') > -1 && app.experience.indexOf('No experience') === -1) score++;
  if (app.experience.indexOf('3+') > -1) score++;
  if (app.message.trim().length > 0) score++;
  if (app.hasCar.toLowerCase() === 'yes') score++;

  var status = 'Rejected', colour = '#f4cccc';
  var spons = app.sponsorship.toLowerCase();
  if (spons === 'yes' || spons.indexOf('require') > -1) {
    status = 'Rejected - Sponsorship'; score = 0;
  } else if (score >= 3) {
    status = 'Shortlist'; colour = '#d9ead3';
  } else if (score >= 1) {
    status = 'Warm Pool'; colour = '#fff2cc';
  }
  app.score = score; app.status = status; app.statusColour = colour;
  return app;
}

function appendToTracker(app) {
  var ss = SpreadsheetApp.openById(CONFIG.SHEET_ID);
  var tab = ss.getSheetByName(app.location.tab);
  if (!tab) {
    tab = ss.insertSheet(app.location.tab);
    tab.appendRow(HEADERS);
    tab.getRange('1:1').setFontWeight('bold');
  }
  tab.appendRow([app.timestamp, app.source, app.role, app.firstName, app.lastName, app.mobile, app.email,
    app.postcode, app.shift, app.hours, app.experience, app.message, app.sponsorship, app.score, app.status, '', '']);
  var row = tab.getLastRow();
  tab.getRange(row, HEADERS.indexOf('Status') + 1).setBackground(app.statusColour);
  SpreadsheetApp.flush();
  return row;
}

function sendCandidateEmail(app) {
  var loc = app.location;
  var calendly = app.status === 'Shortlist'
    ? '<p>To make things easy, you can book a time that suits you using the link below. Simply pick a slot and we\'ll call you then.</p>' +
      '<p style="margin:20px 0;"><a href="' + loc.calendlyUrl + '" style="display:inline-block;background:#2d4a2d;color:#ffffff;padding:12px 28px;border-radius:4px;text-decoration:none;font-weight:bold;">Book Your Call</a></p>'
    : '';
  MailApp.sendEmail({
    to: app.email,
    subject: 'Thanks for applying — ' + loc.brandName,
    name: loc.brandName + ' Careers',
    replyTo: loc.managerEmail,
    htmlBody: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
      '<h2 style="color:#2d4a2d;">Hi ' + app.firstName + ',</h2>' +
      '<p>Thank you so much for getting in touch — we\'re really pleased you\'re interested in joining our team at ' + loc.brandName + '.</p>' +
      '<p>We\'ve received your application and one of our team will give you a quick call within the next 24 hours to have an informal chat. It\'s nothing formal — just a chance for us to tell you a bit more about the role and for you to ask any questions.</p>' +
      calendly +
      '<p>If you have any questions in the meantime, feel free to reply to this email.</p>' +
      '<br><p>Warm regards,<br><strong>The Team at ' + loc.brandName + '<br>Roseville Care Group</strong></p></div>'
  });
  console.log('Candidate email sent to ' + app.email);
}

function sendManagerEmail(app, saved) {
  var loc = app.location;
  var subject = (saved ? '' : 'ACTION NEEDED (not saved to tracker) — ') +
    app.status + ' applicant: ' + app.firstName + ' ' + app.lastName + ' — ' + loc.brandName;
  var trackerUrl = 'https://docs.google.com/spreadsheets/d/' + CONFIG.SHEET_ID + '/edit';
  MailApp.sendEmail({
    to: loc.managerEmail,
    subject: subject,
    name: loc.brandName + ' Careers',
    htmlBody: '<div style="font-family:Arial,sans-serif;">' +
      '<h3 style="color:#2d4a2d;">New application — ' + app.status + '</h3>' +
      (saved ? '' : '<p style="color:#b00;"><strong>This application could NOT be written to the tracker. Please add it by hand.</strong></p>') +
      '<p><strong>Name:</strong> ' + app.firstName + ' ' + app.lastName + '</p>' +
      '<p><strong>Role:</strong> ' + app.role + '</p>' +
      '<p><strong>Location:</strong> ' + loc.brandName + '</p>' +
      '<p><strong>Phone:</strong> ' + app.mobile + '</p>' +
      '<p><strong>Email:</strong> ' + app.email + '</p>' +
      '<p><strong>Postcode:</strong> ' + app.postcode + '</p>' +
      '<p><strong>Shifts:</strong> ' + app.shift + ' &nbsp; <strong>Hours:</strong> ' + app.hours + '</p>' +
      '<p><strong>Experience:</strong> ' + app.experience + '</p>' +
      '<p><strong>Sponsorship:</strong> ' + app.sponsorship + '</p>' +
      '<p><strong>Message:</strong> ' + app.message + '</p>' +
      '<p><strong>Score:</strong> ' + app.score + '/7</p>' +
      '<p><a href="' + trackerUrl + '">View in Tracker</a>' + (saved ? ' (tab "' + loc.tab + '", row ' + app.rowNumber + ')' : '') + '</p></div>'
  });
  console.log('Manager email sent to ' + loc.managerEmail);
}

function notifyFallback(subject, body) {
  try {
    MailApp.sendEmail({ to: CONFIG.FALLBACK_EMAIL, subject: subject, body: body });
  } catch (err) {
    console.error('Fallback email FAILED: ' + err);
  }
}

function respond(result, text) {
  // Pages post with mode:'no-cors' so they cannot read this, but it shows under Executions and in curl tests.
  return ContentService.createTextOutput(text + ' ' + JSON.stringify(result)).setMimeType(ContentService.MimeType.TEXT);
}

// ───────────────────────── Run from the editor ─────────────────────────
// Select selfTest in the function dropdown and press Run. Check the Execution log,
// the tracker's Melksham tab, and the inboxes.
function selfTest() {
  var fake = {
    postData: { contents: JSON.stringify({
      source: 'Melksham Landing Page', role: 'Care Assistant', firstName: 'Test', lastName: 'Applicant',
      mobile: '07000000000', email: CONFIG.FALLBACK_EMAIL, postcode: 'SN12 6AA',
      shift: 'Days and evenings', hours: 'Full time', experience: '3+ years experience',
      message: 'selfTest run ' + new Date().toISOString(), sponsorship: 'No'
    }) }
  };
  var out = doPost(fake).getContent();
  console.log('selfTest result: ' + out);
  console.log('Email quota remaining: ' + MailApp.getRemainingDailyQuota());
  return out;
}
