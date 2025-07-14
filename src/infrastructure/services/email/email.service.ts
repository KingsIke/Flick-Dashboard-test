/* eslint-disable prettier/prettier */
// /* eslint-disable prettier/prettier */
// import { Injectable } from '@nestjs/common';
// import nodemailer from 'nodemailer';
// import dotenv from 'dotenv';
// import { config } from "../../../config/email/email.config";

// dotenv.config();
// @Injectable()
// export class EmailService {
//   private transporter = nodemailer.createTransport({
//     host: config.emailService.host,
//     port: 465,
//     secure: false,
//     auth: {
//       user: config.emailService.from,
//       pass: config.emailService.password,
//     },
//   });

//   async sendVerificationEmail(to: string, otp: string) {
//     await this.transporter.sendMail({
//       from: '"Flick" <noreply@getflick.app>',
//       to,
//       subject: 'Verify your email',
//       html: `<p>Your OTP is <strong>${otp}</strong></p>`,
//     });
//   }

//   async sendPasswordResetEmail(to: string, otp: string) {
//     await this.transporter.sendMail({
//       from: '"Flick" <noreply@getflick.app>',
//       to,
//       subject: 'Reset your password',
//       html: `<p>Your password reset OTP is <strong>${otp}</strong></p>`,
//     });
//   }
// }


/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
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

  async sendVerificationEmail(to: string, otp: string) {
    await this.transporter.sendMail({
      from: '" Flick " <' + this.configService.get<string>('EMAIL_USER') + '>',
      to,
      subject: 'Verify your email',
      html: `<p>Your OTP is <strong>${otp}</strong></p>`,
    });
  }

  async sendPasswordResetEmail(to: string, otp: string) {
    await this.transporter.sendMail({
      from: '" Flick " <' + this.configService.get<string>('EMAIL_USER') + '>',

      to,
      subject: 'Reset your password',
      html: `<p>Your password reset OTP is <strong>${otp}</strong></p>`,
    });
  }

   async sendPayoutOtp(email: string, otp: string, details: { amount: number; beneficiary_name: string; bank_name: string; account_number: string }) {
       await this.transporter.sendMail({
      from: '" Flick " <' + this.configService.get<string>('EMAIL_USER') + '>',

      to:email,
      subject: 'Reset your password',
      html: `Sending NGN ${details.amount} to ${details.beneficiary_name}, ${details.bank_name}, ${details.account_number}. Your OTP is ${otp}.`,
    });
   }
}