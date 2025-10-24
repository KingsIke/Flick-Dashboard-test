/* eslint-disable prettier/prettier */
import { DataSource } from "typeorm";
import { Account } from '../../domain/entities/account.entity';
import { Bank } from '../../domain/entities/bank.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { User } from '../../domain/entities/user.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { PaymentPage } from '../../domain/entities/payment.entity';
import { Country } from '../../domain/entities/country.entity';
import { Beneficiary } from "../../domain/entities/beneficiary.entity";
import { ConfigService } from "@nestjs/config";
// import * as dotenv from "dotenv";


// // export const AppDataSource1 = new DataSource({
// //  type: 'postgres',
// //   host: 'localhost',
// //   port: 5432,
// //   username: 'postgres',
// //   password: '453622Ike',
// //   database: 'flickTest',
// //   synchronize: true,
// //   entities: [User, Account, Wallet, Transaction, Bank, PaymentPage, Country,  Beneficiary],
// //   migrations: ['src/migrations/**/*{.ts,.js}'],
// // });


// // const configService = new ConfigService();
// // const connectionString = configService.get<string>('DATABASE_URL') || 'postgresql://Flick:Flick12345@postgresql-177046-0.cloudclusters.net:10031/Flick';
// // const url = new URL(connectionString);

// // export const AppDataSource = new DataSource({
// //   type: "postgres",
// //   host: url.hostname,
// //   port: parseInt(url.port, 10),
// //   username: url.username,
// //   password: decodeURIComponent(url.password),
// //   database: url.pathname.slice(1),
// //   entities: [User, Account, Wallet, Transaction, Bank, PaymentPage, Country, Beneficiary],
// //   synchronize: true, // Must be false in production
// //   // migrations: ["src/migrations/**/*{.ts,.js}"], // Ensure this matches your migrations directory
// //   // migrationsRun: true,
// //   logging: ["error", "query"],
// //   // ssl: {
// //   //   rejectUnauthorized: false, // Required for CloudClusters
// //   // },
// // });

// dotenv.config();
// const connectionString = process.env.DATABASE_URL || 'postgresql://Flick:Flick12345@postgresql-177046-0.cloudclusters.net:10031/Flick';
// if (!connectionString) throw new Error("DATABASE_URL is not set");
// const url = new URL(connectionString);

// export const AppDataSource = new DataSource({
//   type: "postgres",
//   host: url.hostname,
//   port: parseInt(url.port, 10),
//   username: url.username,
//   password: decodeURIComponent(url.password),
//   database: url.pathname.slice(1),
//   entities: [User, Account, Wallet, Transaction, Bank, PaymentPage, Country, Beneficiary],
//   synchronize: false, // Must be false in production
//   migrations: ["src/migrations/**/*{.ts,.js}"],
//   migrationsRun: true,
//   logging: ["error", "query"],
//   ssl: {
//     rejectUnauthorized: false,
//   },
// });

// // import { DataSource } from 'typeorm';
// // import { typeOrmConfig1 } from './path-to-config';

// // const dataSource = new DataSource({ ...typeOrmConfig1, dropSchema: true, synchronize: true });

// // dataSource.initialize().then(() => {
// //   console.log('Schema dropped and re-synced');
// //   return dataSource.destroy();
// // });



// import { DataSource } from 'typeorm';
// import { typeOrmConfig } from './typeorm.config.js';

// export const AppDataSource = new DataSource({
//   ...typeOrmConfig() as any,
//   cli: {
//     migrationsDir: 'src/migrations',
//   },
//   entities: ['src/**/*.entity{.ts,.js}'],
//   migrations: ['src/migrations/*{.ts,.js}'],
// });

// export default AppDataSource;

// data-source.ts

// import { typeOrmConfig } from './typeorm.config';

// const configService = new ConfigService();

// export const AppDataSource = new DataSource({
//   ...typeOrmConfig(configService) as any,
  
//   // CLI configuration
//   cli: {
//     migrationsDir: 'src/migrations',
//   },
  
//   // Explicit paths for production
//    entities: [User, Account, Wallet, Transaction, Bank, PaymentPage,  Beneficiary, Country],
//   migrations: ['dist/migrations/*{.ts,.js}'],
  
//   // Production-specific settings
//   synchronize: false,
//   migrationsRun: true
// });

// export default AppDataSource;

import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://Flick:Flick12345@postgresql-177046-0.cloudclusters.net:10031/Flick',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});