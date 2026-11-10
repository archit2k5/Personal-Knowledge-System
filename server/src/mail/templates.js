export function getVerifyEmailTemplate(name, verifyUrl) {
  return {
    subject: 'Verify your email address - Personal Knowledge Chat',
    text: `Hi ${name},\n\nPlease verify your email address by visiting the following link:\n${verifyUrl}\n\nThis link is valid for 24 hours.\n\nIf you did not create this account, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Verify your email</h2>
        <p>Hi ${name},</p>
        <p>Thanks for signing up for Personal Knowledge Chat. Please click the button below to verify your email address:</p>
        <p style="margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Verify Email Address
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">This link expires in 24 hours. If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${verifyUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  };
}

export function getResetPasswordTemplate(name, resetUrl) {
  return {
    subject: 'Reset your password - Personal Knowledge Chat',
    text: `Hi ${name},\n\nWe received a request to reset your password. Use the following link to choose a new password:\n${resetUrl}\n\nThis link is valid for 1 hour.\n\nIf you did not request a password reset, you can safely ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Reset your password</h2>
        <p>Hi ${name},</p>
        <p>We received a request to reset your password for Personal Knowledge Chat. Click the button below to choose a new password:</p>
        <p style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">
            Reset Password
          </a>
        </p>
        <p style="color: #64748b; font-size: 14px;">This link expires in 1 hour. If the button above doesn't work, copy and paste this URL into your browser:</p>
        <p style="color: #64748b; font-size: 14px; word-break: break-all;">${resetUrl}</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you did not request a password reset, please ignore this email. Your password will not change.</p>
      </div>
    `,
  };
}

export function getPasswordChangedTemplate(name) {
  return {
    subject: 'Your password was changed - Personal Knowledge Chat',
    text: `Hi ${name},\n\nYour password for Personal Knowledge Chat has been successfully updated.\n\nAll your existing sessions have been logged out for security.\n\nIf you did not make this change, please contact support immediately.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
        <h2>Password Changed</h2>
        <p>Hi ${name},</p>
        <p>Your password for Personal Knowledge Chat has been successfully updated.</p>
        <p>All active sessions across your devices have been logged out for your security.</p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
        <p style="color: #dc2626; font-size: 13px;">If you did not make this change, please reach out to support immediately.</p>
      </div>
    `,
  };
}

