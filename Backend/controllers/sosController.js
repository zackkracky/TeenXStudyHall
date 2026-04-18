const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendSOS = async (req, res) => {
  try {
    const { message } = req.body;

    const sms = await client.messages.create({
      body: message || "🚨 Emergency! Blood required urgently!",
      from: process.env.TWILIO_PHONE,
      to: process.env.MY_PHONE
    });

    res.json({
      success: true,
      sid: sms.sid
    });

  } catch (error) {
    console.log(error);

    res.json({
      success: false,
      message: "SMS failed"
    });
  }
};

module.exports = { sendSOS };