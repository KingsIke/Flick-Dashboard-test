/* eslint-disable prettier/prettier */
// // import dotenv from 'dotenv';
// // import * as dotenv from 'dotenv';
// // dotenv.config();

// export const emailConfig = {
//   port: process.env.PORT || 3000,
//   // mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
//   // jwtSecret: process.env.JWT_SECRET || 'adbirt_dsp',
//   // frontendUrl: process.env.FRONTEND_URL || 'https://admanager.adbirt.com',
//   emailService: {
//     from: process.env.EMAIL_USER || 'no-reply@bajiku.com',
//     password: process.env.EMAIL_PASSWORD || '#TeamBajiku1',
//     host: process.env.EMAIL_HOST || 'smtp.zoho.com',
//   },
// };


import { ConfigFactory } from '@nestjs/config';

export const emailConfig: ConfigFactory = () => ({
  port: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  emailService: {
    from: process.env.EMAIL_USER || 'no-reply@bajiku.com',
    password: process.env.EMAIL_PASSWORD || '#TeamBajiku1',
    host: process.env.EMAIL_TRANSPORTER_HOST || 'smtp.zoho.com',
  },
});