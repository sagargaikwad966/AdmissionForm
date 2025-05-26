require('dotenv').config();

const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_API_KEY,          // SKxxxx...
  process.env.TWILIO_API_SECRET,       // Secret
  { accountSid: process.env.TWILIO_ACCOUNT_SID }  // ACxxxx...
);


function sendSuccessSMS(to, message) {
  return client.messages.create({
    body: message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: to,
  });
}

module.exports = { sendSuccessSMS };
