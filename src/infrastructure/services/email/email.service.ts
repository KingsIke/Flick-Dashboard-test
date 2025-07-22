/* eslint-disable prettier/prettier */
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

// import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;;

  constructor(private configService: ConfigService) {
    const emailAccount = this.configService.get<string>('EMAIL_USER');
    const emailPassword = this.configService.get<string>('EMAIL_PASSWORD');

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('EMAIL_HOST'),
      port:  465,
      secure: true,
      auth: {
     user: emailAccount,
        pass: emailPassword,
      },
    });
  }

  async sendVerificationEmail(to: string, otp: string): Promise<void> {
   
      try{
    await this.transporter.sendMail({
      from: '" Flick " <' + this.configService.get<string>('EMAIL_USER') + '>',
      to,
      subject: 'Verify your email',
      html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
    });
     console.log(`Verification OTP ${otp} sent to ${to}`);
    } catch (error) {
      console.error(`Failed to send verification OTP to ${to}:`, error);
      throw new InternalServerErrorException('Failed to send verification email');
    }
  }

  async sendPasswordResetEmail(to: string, otp: string) {
    try{
    await this.transporter.sendMail({
      from: '" Flick " <' + this.configService.get<string>('EMAIL_USER') + '>',

      to,
      subject: 'Reset your password',
      html: `<p>Your password reset OTP is <strong>${otp}</strong></p>`,
    });
       console.log(`Password reset OTP ${otp} sent to ${to}`);
    } catch (error) {
      console.error(`Failed to send password reset OTP to ${to}:`, error);
      throw new InternalServerErrorException('Failed to send password reset email');
    }
  }

    async sendPayoutOtp(email: string, otp: string, details: { amount: number; beneficiary_name: string; bank_name: string; account_number: string }): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Flick Dashboard" <${process.env.SMTP_USER || 'your-email@gmail.com'}>`,
        to: email,
        subject: 'Payout Confirmation OTP',
        text: `You are sending NGN ${details.amount} to ${details.beneficiary_name}, ${details.bank_name}, ${details.account_number}. Your OTP is ${otp}. It expires in 10 minutes.`,
      });
      console.log(`Payout OTP ${otp} sent to ${email} for transfer of NGN ${details.amount} to ${details.beneficiary_name}, ${details.bank_name}, ${details.account_number}`);
    } catch (error) {
      console.error(`Failed to send payout OTP to ${email}:`, error);
      console.log(`Fallback OTP for ${email}: ${otp}`); 
      throw new InternalServerErrorException('Failed to send payout OTP. Check logs for OTP.');
    }
  }
}