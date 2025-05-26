const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const csvParser = require('csv-parser');
const csvWriter = require('csv-writer').createObjectCsvWriter;
require('dotenv').config();

const app = express();
const PORT = 3000;

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const csvPath = path.join(__dirname, 'records.csv');
const headers = [
  { id: 'name', title: 'name' },
  { id: 'email', title: 'email' },
  { id: 'contact', title: 'contact' },
  { id: 'parentName', title: 'parentName' },
  { id: 'parentContact', title: 'parentContact' },
  { id: 'address', title: 'address' },
  { id: 'dob', title: 'dob' },
  { id: 'gender', title: 'gender' },
  { id: 'vadya', title: 'vadya' },
  { id: 'reference', title: 'reference' },
  { id: 'photo', title: 'photo' }
];

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'public/uploads'),
    filename: (req, file, cb) => cb(null, `photo-${Date.now()}${path.extname(file.originalname)}`)
  })
});

// Home page
app.get('/', (req, res) => {
  let count = 0;

  if (fs.existsSync(csvPath)) {
    fs.createReadStream(csvPath)
      .pipe(csvParser())
      .on('data', (row) => {
        if (row.name && row.email && row.contact) count++;
      })
      .on('end', () => {
        res.render('form', {
          data: {},
          editing: false,
          formAction: '/submit',
          message: null,
          submissionCount: count,
          showPopup: false,
          popupMessage: null,
        });
      });
  } else {
    res.render('form', {
      data: {},
      editing: false,
      formAction: '/submit',
      message: null,
      submissionCount: 0,
      showPopup: false,
      popupMessage: null,
    });
  }
});


app.get('/search', (req, res) => {
  let count = 0;
  const email = req.query.email;
  if (!email) {
    return res.render('form', { data: {}, editing: false, formAction: '/submit', 
    message: 'Please provide an email to search.',
    showPopup: false,
    popupMessage: 'Please provide an email to search.', 
  });
  }

  const results = [];
  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', row => {
      if (row.name && row.email && row.contact) count++;
      if (row.email === email) results.push(row);
    })
    .on('end', () => {
      if (results.length > 0) {
        const row = results[0];

        // ✅ Convert keys to lowercase to match EJS form fields
        const data = {
          name: row.name,
          email: row.email,
          contact: row.contact,
          parentName: row.parentName,
          parentContact: row.parentContact,
          address: row.address,
          dob: row.dob,
          gender: row.gender,
          vadya: row.vadya,
          reference: row.reference,
          photo: row.photo
        };
        res.render('form', {
          data,
          editing: true,
          formAction: `/edit?email=${email}`,
          message: 'Record found. You can update now.',
          submissionCount: count,
          showPopup: false,
          popupMessage: 'Record found. You can update now.',
        });
      } else {
        res.render('form', {
          data: {},
          editing: false,
          formAction: '/submit',
          message: 'No record found for that email.',
          submissionCount: count,
          showPopup: false,
          popupMessage: 'No record found for that email.',
        });
      }
    });
});

app.post('/submit', upload.single('photo'), (req, res) => {
  const formData = {
    name: req.body.name?.trim() || '',
    email: req.body.email?.trim() || '',
    contact: req.body.contact?.trim() || '',
    parentName: req.body.parentName?.trim() || '',
    parentContact: req.body.parentContact?.trim() || '',
    address: req.body.address?.trim() || '',
    dob: req.body.dob?.trim() || '',
    gender: req.body.gender?.trim() || '',
    vadya: req.body.vadya?.trim() || '',
    reference: req.body.reference?.trim() || '',
    photo: req.file ? `/uploads/${req.file.filename}` : ''
  };

  if (!formData.name || !formData.email || !formData.contact) {
    return res.render('form', {
      data: formData,
      editing: false,
      formAction: '/submit',
      message: 'Name, Email, and Contact are required.',
      showPopup: false,
      popupMessage: 'Name, Email, and Contact are required.',
    });
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!formData.email || !emailRegex.test(formData.email)) {
    return res.render('form', {
      data: formData,
      editing: false,
      formAction: '/submit',
      message: 'Invalid email address.',
      showPopup: false,
      popupMessage: 'Invalid email address.',
      
    });
  }
  const contactRegex = /^\d{10}$/;
  if (!contactRegex.test(formData.contact)) {
    return res.render('form', {
      data: formData,
      editing: false,
      formAction: '/submit',
      message: 'Contact number must be a valid 10-digit number.',
      showPopup: false,
      popupMessage: 'Contact number must be a valid 10-digit number.',
    });
  }

  const records = [];
  let found = false;

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', row => {
      if (row.email === formData.email) {
        // If email already exists, do not add new record, just mark found
        found = true;
      }
      records.push(row);
    })
    .on('end', () => {
      if (found) {
        // Email already exists: show error
        return res.render('form', {
          data: formData,
          editing: false,
          formAction: '/submit',
          message: null,
          showPopup: true,
          popupMessage: 'A record with this email already exists. Please use search option to edit.',
          
        });
      } else {
        // Append new record
        records.push(formData);

        const writer = csvWriter({ path: csvPath, header: headers });
        writer.writeRecords(records).then(() => {
          res.render('form', {
            data: {},
            editing: false,
            formAction: '/submit',
            message: null,
            showPopup: true,
            popupMessage: 'Form submitted successfully!'
          });
        });
        const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // User phone from form
        const userPhone = formData.contact;
        // Format it with country code if needed (India: +91)
        const formattedPhone = userPhone.startsWith('+') ? userPhone : '+91' + userPhone;
        // Message to the user
        const smsBody = `Hello ${formData.name}, your Swarajya Dhol Tasha Pathak admission form has been submitted successfully. Thank you!`;

        client.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        })
        .then(message => {
          console.log('SMS sent: ', message.sid);
        })
        .catch(err => {
          console.error('SMS failed: ', err);
        });

      }
    });
});

app.post('/edit', upload.single('photo'), (req, res) => {
  const email = req.query.email;
  if (!email) {
    return res.render('form', {
      data: {},
      editing: false,
      formAction: '/submit',
      message: null,
      showPopup: true,
      popupMessage: 'Email query missing for edit.'
    });
  }

  const updatedData = {
    name: req.body.name?.trim() || '',
    email: req.body.email?.trim() || '',
    contact: req.body.contact?.trim() || '',
    parentName: req.body.parentName?.trim() || '',
    parentContact: req.body.parentContact?.trim() || '',
    address: req.body.address?.trim() || '',
    dob: req.body.dob?.trim() || '',
    gender: req.body.gender?.trim() || '',
    vadya: req.body.vadya?.trim() || '',
    reference: req.body.reference?.trim() || '',
    photo: req.file ? `/uploads/${req.file.filename}` : req.body.existingPhoto || ''
  };

  if (!updatedData.name || !updatedData.email || !updatedData.contact) {
    return res.render('form', {
      data: updatedData,
      editing: true,
      formAction: `/edit?email=${email}`,
      message: 'Name, Email, and Contact are required.',
      showPopup: false,
      popupMessage: 'Name, Email, and Contact are required.',
    });
  }

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;

  if (!updatedData.email || !emailRegex.test(updatedData.email)) {
    return res.render('form', {
      data: updatedData,
      editing: false,
      formAction: '/submit',
      message: 'Invalid email address.',
      showPopup: false,
      popupMessage: 'Invalid email address.',
      
    });
  }
  const contactRegex = /^\d{10}$/;
  if (!contactRegex.test(updatedData.contact)) {
    return res.render('form', {
      data: updatedData,
      editing: false,
      formAction: '/submit',
      message: 'Contact number must be a valid 10-digit number.',
      showPopup: false,
      popupMessage: 'Contact number must be a valid 10-digit number.',
      
    });
  }

  const rows = [];
  let recordFound = false;

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', row => {
      if (row.email === email) {
        // Replace record
        rows.push(updatedData);
        recordFound = true;
      } else {
        rows.push(row);
      }
    })
    .on('end', () => {
      if (!recordFound) {
        // If record not found, optionally add new record
        rows.push(updatedData);
      }
      const twilio = require('twilio');
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        // User phone from form
        const userPhone = updatedData.contact;
        // Format it with country code if needed (India: +91)
        const formattedPhone = userPhone.startsWith('+') ? userPhone : '+91' + userPhone;
        // Message to the user
        const smsBody = `Hello ${updatedData.name}, your Swarajya Dhol Tasha Pathak admission form has been updated successfully. Thank you!`;

        client.messages.create({
          body: smsBody,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: formattedPhone
        })
        .then(message => {
          console.log('SMS sent: ', message.sid);
        })
        .catch(err => {
          console.error('SMS failed: ', err);
        });

      const writer = csvWriter({ path: csvPath, header: headers });
      writer.writeRecords(rows).then(() => {
        res.render('form', {
          data: {},
          editing: true,
          formAction: `/edit?email=${updatedData.email}`,
          message: null,
          showPopup: true,
          popupMessage: recordFound ? 'Record updated successfully!' : 'Record not found, added new entry!'
        });
      }).catch(err => {
        console.error(err);
        res.render('form', {
          data: updatedData,
          editing: true,
          formAction: `/edit?email=${updatedData.email}`,
          message: null,
          showPopup: true,
          popupMessage: 'Error saving record.',
        });
      });
    });
});


app.get('/stats', (req, res) => {
  let count = 0;

  if (!fs.existsSync(csvPath)) {
    return res.send('No submissions found.');
  }

  fs.createReadStream(csvPath)
    .pipe(csvParser())
    .on('data', (row) => {
      // Count rows with non-empty required fields
      if (row.Name && row.Email && row.Contact) {
        count++;
      }
    })
    .on('end', () => {
      res.send(`<h2>Total valid submissions: ${count}</h2>`);
    });
});


app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
