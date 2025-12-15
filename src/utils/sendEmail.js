const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // ou ton SMTP
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

exports.sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"FutureMakers Hub" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  });
};
