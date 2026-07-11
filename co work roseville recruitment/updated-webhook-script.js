function doPost(e) {
  var sheet = SpreadsheetApp.openById('1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo');
  var data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch(err) {
    return ContentService.createTextOutput('Error parsing JSON');
  }

  var source = data.source || 'Unknown';
  var tabName = source.indexOf('Melksham') > -1 ? 'Melksham' : source.indexOf('York') > -1 ? 'York' : 'Other';

  // ── Location-specific config ──
  var locationConfig = {
    'Melksham': {
      locationName: 'The Old Parsonage',
      managerEmail: 'manager.oldparsonage@rosevillecaregroup.co.uk',
      senderName: 'The Old Parsonage Careers',
      signOff: 'The Team at The Old Parsonage<br>Roseville Care Group'
    },
    'York': {
      locationName: 'Able Carers',
      managerEmail: 'manager.ablecarers@rosevillecaregroup.co.uk',
      senderName: 'Able Carers Careers',
      signOff: 'The Team at Able Carers<br>Roseville Care Group'
    }
  };

  var config = locationConfig[tabName] || {
    locationName: 'Roseville Care Group',
    managerEmail: 'manager.oldparsonage@rosevillecaregroup.co.uk',
    senderName: 'Roseville Care Group Careers',
    signOff: 'The Team<br>Roseville Care Group'
  };

  var tab = sheet.getSheetByName(tabName);
  if (!tab) {
    tab = sheet.insertSheet(tabName);
    tab.appendRow(['Timestamp','Source','Role','First Name','Last Name','Mobile','Email','Postcode','Shift Preference','Hours Per Week','Care Experience','Message','Requires Sponsorship','Score','Status','Jo Notes','Date Called']);
    tab.getRange('1:1').setFontWeight('bold');
  }

  var firstName = data.firstName || data['first-name'] || '';
  var lastName = data.lastName || data['last-name'] || '';
  var mobile = data.mobile || data.phone || '';
  var email = data.email || '';
  var postcode = data.postcode || '';
  var shift = data.shift || data['shift-pattern'] || '';
  var hours = data.hours || data['hours-per-week'] || '';
  var experience = data.experience || data['care-experience'] || '';
  var message = data.message || data.notes || '';
  var sponsorship = data.sponsorship || data['requires-sponsorship'] || '';
  var role = data.role || '';
  var timestamp = data.timestamp || new Date().toISOString();

  var score = 0;
  if (shift && shift.toLowerCase().indexOf('day') > -1) score++;
  if (shift && (shift.toLowerCase().indexOf('evening') > -1 || shift.toLowerCase().indexOf('night') > -1)) score++;
  if (hours && hours.toLowerCase().indexOf('full') > -1) score++;
  if (experience && experience.toLowerCase().indexOf('experience') > -1 && experience.indexOf('No experience') === -1) score++;
  if (experience && experience.indexOf('3+') > -1) score++;
  if (message && message.trim().length > 0) score++;

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

  // ── Candidate auto-response email (location-specific) ──
  try {
    if (email) {
      GmailApp.sendEmail(email, 'Thanks for applying — ' + config.locationName,
        '',
        {
          htmlBody: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">' +
            '<h2 style="color:#2d4a2d;">Hi ' + firstName + ',</h2>' +
            '<p>Thank you so much for getting in touch — we\'re really pleased you\'re interested in joining our team at ' + config.locationName + '.</p>' +
            '<p>We\'ve received your application and one of our team will give you a quick call within the next 24 hours to have an informal chat. It\'s nothing formal — just a chance for us to tell you a bit more about the role and for you to ask any questions.</p>' +
            '<p>If you have any questions in the meantime, feel free to reply to this email.</p>' +
            '<br><p>Warm regards,<br><strong>' + config.signOff + '</strong></p></div>',
          name: config.senderName,
          replyTo: config.managerEmail
        }
      );
    }
  } catch(emailErr) {
    Logger.log('Candidate email error: ' + emailErr);
  }

  // ── Shortlist alert to location manager ──
  if (status === 'Shortlist') {
    try {
      GmailApp.sendEmail(config.managerEmail, 'New Shortlisted Applicant - ' + firstName + ' ' + lastName,
        '',
        {
          htmlBody: '<div style="font-family:Arial,sans-serif;">' +
            '<h3 style="color:#2d4a2d;">New Shortlisted Application</h3>' +
            '<p><strong>Name:</strong> ' + firstName + ' ' + lastName + '</p>' +
            '<p><strong>Role:</strong> ' + role + '</p>' +
            '<p><strong>Location:</strong> ' + config.locationName + '</p>' +
            '<p><strong>Phone:</strong> ' + mobile + '</p>' +
            '<p><strong>Email:</strong> ' + email + '</p>' +
            '<p><strong>Score:</strong> ' + score + '/6</p>' +
            '<p><strong>Experience:</strong> ' + experience + '</p>' +
            '<p><a href="https://docs.google.com/spreadsheets/d/1ueL81uMGJHbE14fVfwTbiVDb4nu9R6xQdGH9dCvfVmo/edit">View in Tracker</a></p></div>',
          name: config.senderName,
          replyTo: config.managerEmail
        }
      );
    } catch(joErr) {
      Logger.log('Manager alert email error: ' + joErr);
    }
  }

  return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
}
