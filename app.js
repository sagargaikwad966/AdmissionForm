const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const path = require('path');
const bodyParser = require('body-parser');
const { sendSuccessSMS } = require('./twilio');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB setup
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected successfully'))
  .catch(err => console.error('MongoDB connection error:', err));


const admissionSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  contact: String,
  parentName: String,
  parentContact: String,
  address: String,
  dob: String,
  gender: String,
  vadya: String,
  reference: String,
  photo: String,
});

const Admission = mongoose.model('Admission', admissionSchema);

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'public/uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});

const upload = multer({ storage });

app.get('/', async (req, res) => {
  const submissionCount = await Admission.countDocuments();
  res.render('form', {
    data: {},
    editing: false,
    message: null,
    formAction: '/submit',
    submissionCount,
    showPopup: false,
    popupMessage: '',
  });
});

app.get('/search', async (req, res) => {
  const email = req.query.email;
  const record = await Admission.findOne({ email });
  const submissionCount = await Admission.countDocuments();

  if (!record) {
    return res.render('form', {
      data: {},
      editing: false,
      message: 'No record found for the given email.',
      formAction: '/submit',
      submissionCount,
      showPopup: false,
      popupMessage: '',
    });
  }

  res.render('form', {
    data: record,
    editing: true,
    message: null,
    formAction: '/edit',
    submissionCount,
    showPopup: false,
    popupMessage: '',
  });
});

app.post('/submit', upload.single('photo'), async (req, res) => {
  const data = req.body;

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(data.email)) {
    return res.render('form', {
      data,
      editing: false,
      message: 'Invalid email address.',
      formAction: '/submit',
      submissionCount: await Admission.countDocuments(),
      showPopup: false,
      popupMessage: '',
    });
  }

  const contactRegex = /^[0-9]{10}$/;
  if (!contactRegex.test(data.contact)) {
    return res.render('form', {
      data,
      editing: false,
      message: 'Invalid contact number.',
      formAction: '/submit',
      submissionCount: await Admission.countDocuments(),
      showPopup: false,
      popupMessage: '',
    });
  }

  if (await Admission.findOne({ email: data.email })) {
    return res.render('form', {
      data,
      editing: false,
      message: 'A record with this email already exists.',
      formAction: '/submit',
      submissionCount: await Admission.countDocuments(),
      showPopup: false,
      popupMessage: '',
    });
  }

  data.photo = req.file ? '/uploads/' + req.file.filename : '';
  const newRecord = new Admission(data);
  await newRecord.save();

  const userPhone = data.contact;
        // Format it with country code if needed (India: +91)
  const formattedPhone = userPhone.startsWith('+') ? userPhone : '+91' + userPhone;
        // Message to the user
  const smsBody = `Hello ${data.name}, your Swarajya Dhol Tasha Pathak admission form has been submitted successfully. Thank you!`;

  await sendSuccessSMS(formattedPhone,smsBody);

  res.render('form', {
    data: {},
    editing: false,
    message: null,
    formAction: '/submit',
    submissionCount: await Admission.countDocuments(),
    showPopup: true,
    popupMessage: 'Your admission form has been successfully submitted!',
  });
});

app.post('/edit', upload.single('photo'), async (req, res) => {
  const data = req.body;

  const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i;
  if (!emailRegex.test(data.email)) {
    return res.render('form', {
      data,
      editing: false,
      message: 'Invalid email address.',
      formAction: '/submit',
      submissionCount: await Admission.countDocuments(),
      showPopup: false,
      popupMessage: '',
    });
  }

  const contactRegex = /^[0-9]{10}$/;
  if (!contactRegex.test(data.contact)) {
    return res.render('form', {
      data,
      editing: true,
      message: 'Invalid contact number.',
      formAction: '/edit',
      submissionCount: await Admission.countDocuments(),
      showPopup: false,
      popupMessage: '',
    });
  }

  const update = { ...data };
  update.photo = req.file ? '/uploads/' + req.file.filename : data.existingPhoto;
  delete update.existingPhoto;
  delete update.editing;

  await Admission.findOneAndUpdate({ email: data.email }, update);
  const userPhone = data.contact;
        // Format it with country code if needed (India: +91)
  const formattedPhone = userPhone.startsWith('+') ? userPhone : '+91' + userPhone;
        // Message to the user
  const smsBody = `Hello ${data.name}, your Swarajya Dhol Tasha Pathak admission form has been updated successfully. Thank you!`;

  await sendSuccessSMS(formattedPhone,smsBody);

  res.render('form', {
    data: update,
    editing: true,
    message: 'Record updated successfully!',
    formAction: '/edit',
    submissionCount: await Admission.countDocuments(),
    showPopup: true,
    popupMessage: 'Record updated successfully!',
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
