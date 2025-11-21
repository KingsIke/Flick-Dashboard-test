/* eslint-disable prettier/prettier */
import { ConfigFactory } from '@nestjs/config';

export const emailConfig: ConfigFactory = () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  emailService: {
    from: process.env.EMAIL_USER || 'no-reply@bajiku.com',
    password: process.env.EMAIL_PASSWORD || '#TeamBajiku1',
    host: process.env.EMAIL_TRANSPORTER_HOST || 'smtp.zoho.com',
  },
});