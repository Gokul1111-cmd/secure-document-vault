const { Resend } = require('resend');
const env = require('../config/env');

/**
 * Sends an OTP verification email to the viewer.
 * @param {string} email - The recipient email address.
 * @param {string} otpCode - The 6-digit verification code.
 */
const sendOTPEmail = async (email, otpCode) => {
  try {
    console.log('[Email Service] Attempting to send OTP email to:', email);
    console.log('[Email Service] Target API Key:', env.resendApiKey ? 'Present (First 5 chars: ' + env.resendApiKey.substring(0, 5) + '...)' : 'MISSING');

    if (!env.resendApiKey) {
      console.warn('[Email Service] Cannot send email: RESEND_API_KEY is missing in env.js.');
      return;
    }

    // Initialize Resend lazily inside the function to avoid load-time crashes
    const resend = new Resend(env.resendApiKey);

    const { data, error } = await resend.emails.send({
      from: 'Secure Document Vault <onboarding@resend.dev>',
      to: email,
      subject: 'Verification Code: ' + otpCode,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
          <h2 style="color: #333;">Secure Document Access</h2>
          <p>Your verification code is:</p>
          <div style="background: #f4f4f4; padding: 20px; text-align: center; border-radius: 4px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #2563eb;">${otpCode}</span>
          </div>
          <p style="color: #666; font-size: 14px; margin-top: 20px;">This code will expire in 10 minutes. If you did not request this, please ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      console.error('[Resend Error]:', error);
      throw new Error(error.message || 'Failed to send email verification code.');
    }

    console.log('[Email Service] Email sent successfully:', data.id);
    return data;
  } catch (err) {
    console.error('[sendOTPEmail Error]:', err);
    throw err;
  }
};

module.exports = {
  sendOTPEmail,
};
