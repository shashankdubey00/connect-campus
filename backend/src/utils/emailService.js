import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD || process.env.EMAIL_PASS, // Support both variable names
    },
  });
};

// Send OTP email
export const sendOTPEmail = async (email, otp) => {
  try {
    // Validate email config
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('Email service not configured');
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();

    const mailOptions = {
      from: `"Connect Campus" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Password Reset OTP - Connect Campus',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background: linear-gradient(135deg, #00a8ff 0%, #00ff96 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #fff; margin: 0;">Connect Campus</h1>
          </div>
          <div style="background: #fff; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #666; font-size: 16px; line-height: 1.6;">
              You have requested to reset your password. Use the following OTP (One-Time Password) to verify your identity:
            </p>
            <div style="background: #f8f9fa; border: 2px solid #00a8ff; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0;">
              <h1 style="color: #00a8ff; font-size: 36px; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">
                ${otp}
              </h1>
            </div>
            <p style="color: #666; font-size: 14px; line-height: 1.6;">
              <strong>This OTP will expire in 10 minutes.</strong>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </p>
          </div>
        </div>
      `,
      text: `
        Connect Campus - Password Reset OTP
        
        You have requested to reset your password. Use the following OTP to verify your identity:
        
        OTP: ${otp}
        
        This OTP will expire in 10 minutes.
        
        If you didn't request this password reset, please ignore this email.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending OTP email:', error);
    return { success: false, message: error.message };
  }
};

// Verify transporter connection (optional - for testing)
export const verifyEmailConfig = async () => {
  try {
    if (!process.env.EMAIL_USER || (!process.env.EMAIL_PASSWORD && !process.env.EMAIL_PASS)) {
      return { success: false, message: 'Email service not configured' };
    }

    const transporter = createTransporter();
    await transporter.verify();
    return { success: true, message: 'Email service configured correctly' };
  } catch (error) {
    console.error('Email config verification failed:', error);
    return { success: false, message: error.message };
  }
};

