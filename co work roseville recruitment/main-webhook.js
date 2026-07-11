function doPost(e) {
  var sheet = SpreadsheetApp.openById('1wSZeKo4pmvtxbgHOwEzDNOxD7zBdgWoRrGsUZXZXk3I');
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput('Error parsing JSON');
  }

  var source = data.source || 'Unknown';

  // ── Tab routing ──
  var tabName;
  if (source.indexOf('Melksham') > -1) {
    tabName = 'Melksham';
  } else if (source.indexOf('Limetree') > -1) {
    tabName = 'Limetree House';
  } else if (source.indexOf('Lodge') > -1) {
    tabName = 'The Lodge';
  } else {
    tabName = 'York';
  }

  var tab = sheet.getSheetByName(tabName);
  if (!tab) {
    tab = sheet.insertSheet(tabName);
    tab.appendRow(['Timestamp','Source','Role','First Name','Last Name','Mobile','Email','Postcode','Shift Preference','Hours Per Week','Care Experience','Message','Requires Sponsorship','Score','Status','Jo Notes','Date Called']);
    tab.getRange('1:1').setFontWeight('bold');
  }

  // ── Field mapping ──
  var firstName = data.firstName || data['first-name'] || '';
  var lastName = data.lastName || data['last-name'] || '';
  var mobile = data.mobile || data.phone || '';
  var email = data.email || '';
  var postcode = data.postcode || '';
  var shift = data.shift || data['shift-pattern'] || data.shifts || data.availability || '';
  var hours = data.hours || data['hours-per-week'] || '';
  var experience = data.experience || data['care-experience'] || '';
  var message = data.message || data.notes || '';
  var sponsorship = data.sponsorship || data['requires-sponsorship'] || '';
  var role = data.role || '';
  var timestamp = data.timestamp || new Date().toISOString();

  // ── Scoring ──
  var score = 0;
  if (shift && shift.toLowerCase().indexOf('day') > -1) score++;
  if (shift && (shift.toLowerCase().indexOf('evening') > -1 || shift.toLowerCase().indexOf('night') > -1)) score++;
  if (hours && hours.toLowerCase().indexOf('full') > -1) score++;
  if (experience && experience.toLowerCase().indexOf('experience') > -1 && experience.indexOf('No experience') === -1) score++;
  if (experience && experience.indexOf('3+') > -1) score++;
  if (message && message.trim().length > 0) score++;
  if (data.hasCar && data.hasCar.toLowerCase() === 'yes') score++;

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

  var row = [timestamp, source, role, firstName, lastName, mobile, email, postcode, shift, hours, experience, message, sponsorship, score, status, '', ''];
  tab.appendRow(row);

  var lastRow = tab.getLastRow();
  tab.getRange(lastRow, 15).setBackground(statusColor);

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
    Logger.log('Candidate email error: ' + emailErr);
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
            '<p><strong>Score:</strong> ' + score + '/7</p>' +
            '<p><strong>Experience:</strong> ' + experience + '</p>' +
            '<p><a href="https://docs.google.com/spreadsheets/d/1wSZeKo4pmvtxbgHOwEzDNOxD7zBdgWoRrGsUZXZXk3I/edit">View in Tracker</a></p></div>',
          name: config.senderName
        }
      );
    } catch(alertErr) {
      Logger.log('Manager alert email error: ' + alertErr);
    }
  }

  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}
