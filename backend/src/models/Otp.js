const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema(
  {
    contact: {
      type: String,
      required: true,
      index: true,
    },
    otpCode: {
      type: String,
      required: true,
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // Automatically delete document when expiresAt is reached
    },
  },
  {
    timestamps: true,
  }
);

const Otp = mongoose.model('Otp', otpSchema);

module.exports = Otp;
