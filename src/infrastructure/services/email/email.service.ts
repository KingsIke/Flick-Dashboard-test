/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException, Logger  } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  private readonly apiEndpoints = {
    verification: 'https://urc9a6l2y8.execute-api.us-east-2.amazonaws.com/production/mail/test_email_verification',
    passwordReset: 'https://urc9a6l2y8.execute-api.us-east-2.amazonaws.com/production/mail/test_email_reset',
    payout: 'https://urc9a6l2y8.execute-api.us-east-2.amazonaws.com/production/mail/test_email_payout',
  };

  constructor(private readonly configService: ConfigService) {}

  // 🔹 Send Verification Email
  async sendVerificationEmail(to: string, otp: string, name?: string): Promise<void> {
    const payload = { to, otp, name: name || 'User' };
    await this.sendEmailRequest(this.apiEndpoints.verification, payload, `verification OTP ${otp}`, to);
  }

  // 🔹 Send Password Reset Email
  async sendPasswordResetEmail(to: string, otp: string, name?: string): Promise<void> {
    const payload = { to, otp, name: name || 'User' };
    await this.sendEmailRequest(this.apiEndpoints.passwordReset, payload, `password reset OTP ${otp}`, to);
  }

  // 🔹 Send Payout OTP Email
  async sendPayoutOtp(
    to: string,
    otp: string,
    details: {
      amount: number;
      beneficiary_name: string;
      bank_name: string;
      account_number: string;
      name?: string;
    },
  ): Promise<void> {
    const payload = {
      to,
      otp,
      ...details,
      name: details.name || 'User',
    };
    await this.sendEmailRequest(this.apiEndpoints.payout, payload, `payout OTP ${otp}`, to);
  }

  // 🔹 Centralized API Caller
  private async sendEmailRequest(endpoint: string, payload: any, label: string, recipient: string): Promise<void> {
    try {
      this.logger.log(`Sending ${label} via external API to ${recipient}`);
      this.logger.debug(`API URL: ${endpoint}`);
      this.logger.debug(`Payload: ${JSON.stringify(payload, null, 2)}`);

      const response = await axios.post(endpoint, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      this.logger.log(`API Response Status: ${response.status}`);
      this.logger.debug(`API Response Data: ${JSON.stringify(response.data, null, 2)}`);

      if (response.status >= 200 && response.status < 300) {
        this.logger.log(`Successfully sent ${label} to ${recipient}`);
      } else {
        this.logger.error(`External API returned non-success status: ${response.status}`);
        throw new InternalServerErrorException('External email service returned an error');
      }
    } catch (error: any) {
      this.logger.error(`Failed to send ${label} to ${recipient}`);

      if (error.response) {
        this.logger.error(`Response Status: ${error.response.status}`);
        this.logger.error(`Response Data: ${JSON.stringify(error.response.data, null, 2)}`);
      } else if (error.request) {
        this.logger.error(`No response received: ${JSON.stringify(error.request, null, 2)}`);
      } else {
        this.logger.error(`Error Message: ${error.message}`);
      }

      this.logger.warn(`Fallback OTP for ${recipient}: ${payload.otp}`);

      throw new InternalServerErrorException(`Failed to send ${label}. Please try again.`);
    }
  }
}


