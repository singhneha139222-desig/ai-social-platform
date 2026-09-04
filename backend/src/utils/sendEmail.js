const nodemailer = require('nodemailer');
const logger = require('./logger');

/**
 * Send email using Nodemailer (Ethereal Email for dev, or generic SMTP)
 * @param {Object} options { email, subject, message }
 */
const sendEmail = async (options) => {
  // Use Ethereal test account by default if not provided in .env
  let transporter;
  
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  } else {
    // Generate test SMTP service account from ethereal.email
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: testAccount.user, // generated ethereal user
        pass: testAccount.pass, // generated ethereal password
      },
    });
  }

  const message = {
    from: `${process.env.FROM_NAME || 'AI Social'} <${process.env.FROM_EMAIL || 'noreply@aisocial.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || `<p>${options.message.replace(/\n/g, '<br>')}</p>`,
  };

  const info = await transporter.sendMail(message);
  
  logger.info(`Email sent to ${options.email}. Message ID: ${info.messageId}`);
  
  // Log the ethereal URL for easy testing
  if (info.messageId && nodemailer.getTestMessageUrl(info)) {
    logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    console.log(`\n========================================\nEMAIL PREVIEW URL: ${nodemailer.getTestMessageUrl(info)}\n========================================\n`);
  }
};

module.exports = sendEmail;
