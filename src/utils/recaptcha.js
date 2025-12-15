// src/utils/recaptcha.js
const axios = require("axios");

const verifyRecaptcha = async (token) => {
  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify`,
      null,
      {
        params: {
          secret: process.env.RECAPTCHA_SECRET_KEY,
          response: token,
        },
      }
    );
    return response.data.success && response.data.score >= 0.5; // Adjust score threshold as needed
  } catch (err) {
    console.error("reCAPTCHA verification failed:", err);
    return false;
  }
};

module.exports = { verifyRecaptcha };