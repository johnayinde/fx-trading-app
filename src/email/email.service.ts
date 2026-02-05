import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";

/**
 * Service for sending emails including OTP verification emails
 * using SMTP transport configured via environment variables
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get("SMTP_HOST"),
      port: this.configService.get("SMTP_PORT"),
      secure: this.configService.get("SMTP_SECURE") === "true",
      auth: {
        user: this.configService.get("SMTP_USER"),
        pass: this.configService.get("SMTP_PASSWORD"),
      },
    });
  }

  /**
   * Send OTP verification email to user
   * @param email - Recipient email address
   * @param otp - 6-digit OTP code
   * @throws Error in production if email sending fails
   */
  async sendOTP(email: string, otp: string): Promise<void> {
    try {
      const mailOptions = {
        from: this.configService.get("SMTP_FROM"),
        to: email,
        subject: "Verify Your Email - FX Trading App",
        html: this.getOTPEmailTemplate(otp),
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.log(`OTP sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${email}`, error.stack);
      // In development, we don't throw error to allow testing without email setup
      if (this.configService.get("NODE_ENV") === "production") {
        throw error;
      }
    }
  }

  /**
   * Generate HTML email template for OTP verification
   * @param otp - 6-digit OTP code
   * @returns HTML email template string
   */
  private getOTPEmailTemplate(otp: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .otp-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 5px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Email Verification</h1>
          </div>
          <div class="content">
            <h2>Welcome to FX Trading App!</h2>
            <p>Thank you for registering. Please use the OTP below to verify your email address:</p>
            
            <div class="otp-box">
              <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code:</p>
              <div class="otp-code">${otp}</div>
            </div>
            
            <p><strong>Important:</strong></p>
            <ul>
              <li>This OTP is valid for 10 minutes</li>
              <li>Do not share this code with anyone</li>
              <li>If you didn't request this, please ignore this email</li>
            </ul>
            
            <p>Best regards,<br>FX Trading App Team</p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} FX Trading App. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
