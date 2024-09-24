import nodemailer from "nodemailer";

export const sendVerificationEmail = async (email, verifyCode) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Email Verification",
    html: `<p>Your verification code is <strong>${verifyCode}</strong>. It will expire in 1 day.</p>`,
  };

  await transporter.sendMail(mailOptions);
};
