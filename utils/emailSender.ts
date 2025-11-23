import nodemailer from 'nodemailer';

export async function sendAccountCreationEmail(userEmail: string, password: string, message:string): Promise<void> {
  // Create a transporter object using SMTP transport with Gmail
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER, // Your Gmail email address
      pass: process.env.SMTP_PASS, // Your Gmail account password or app-specific password
    },
  });

  // Email content
  const mailOptions = {
    from: '"NCIC Website" <no-reply@NCIC.com>', // Sender address
    to: userEmail, // List of recipients
    subject: 'Account Creation', // Subject line
    text: `${message} Your password is: ${password}`, // Plain text body
    html: `<p>${message}</p><p>Your password is: <strong>${password}</strong> <br> Please make sure <strong> to change your password </strong> <br> You are blessed!</p>`, // HTML body
  };

  // Send the email
  await transporter.sendMail(mailOptions);
}
