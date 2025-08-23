/* eslint-disable prettier/prettier */
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import * as dotenv from 'dotenv';
import { Account } from '../../domain/entities/account.entity';
import { Bank } from '../../domain/entities/bank.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { User } from '../../domain/entities/user.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { PaymentPage } from '../../domain/entities/payment.entity';
import { Beneficiary } from '../../domain/entities/beneficiary.entity';
import { ConfigService } from '@nestjs/config';
import { Country } from 'src/domain/entities/country.entity';

dotenv.config();

export const typeOrmConfig1: TypeOrmModuleOptions = {
  type: 'postgres',
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "453622Ike",
  database: "flickTest",
 entities: [User, Account, Wallet, Transaction, Bank, PaymentPage,  Beneficiary, Country],
  synchronize: true,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
};




export const typeOrmConfig = (configService: ConfigService = new ConfigService()): TypeOrmModuleOptions => {
  const connectionString = configService.get<string>('DATABASE_URL') || 'postgresql://Flick:Flick12345@@postgresql-177046-0.cloudclusters.net:10031/Flick';
  const url = new URL(connectionString);

  return {
    type: 'postgres',
    host: url.hostname,
    port: parseInt(url.port, 10),
    username: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
    entities: [User, Account, Wallet, Transaction, Bank, PaymentPage, Beneficiary, Country],
    synchronize: true,
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    migrationsRun: true,
    logging: ['error', 'query'],
  };
};

// // export const 1typeOrmConfig: TypeOrmModuleOptions = {
// //   type: 'postgres',
// // host: "postgresql-198541-0.cloudclusters.net",
// // port: 19940,
// // username: "user_internal",
// // password: "Flick12@",
// // database: "Flick",
// //  entities: [User, Account, Wallet, Transaction, Bank, PaymentPage,  Beneficiary, Country],
// //   synchronize: true,
// //   migrations: [__dirname + '/../migrations/*{.ts,.js}'],
// //   migrationsRun: true,
// // };




// // import { Client } from 'pg';

// // const client = new Client({
// //   user: 'postgres',
// //   host: 'localhost',
// //   password: '453622Ike',
// //   port: 5432,
// //   database: 'postgres', // NOT flickTest!
// // });

// // (async () => {
// //   await client.connect();

// //   await client.query(`
// //     SELECT pg_terminate_backend(pid)
// //     FROM pg_stat_activity
// //     WHERE datname = 'flickTest'
// //       AND pid <> pg_backend_pid()
// //   `);

// //   await client.query(`DROP DATABASE IF EXISTS "flickTest"`);

// //   await client.end();
// // })();

// /* eslint-disable prettier/prettier */
// import { TypeOrmModuleOptions } from '@nestjs/typeorm';
// import * as dotenv from 'dotenv';
// import { ConfigService } from '@nestjs/config';
// import { Account } from '../../domain/entities/account.entity';
// import { Bank } from '../../domain/entities/bank.entity';
// import { Transaction } from '../../domain/entities/transaction.entity';
// import { User } from '../../domain/entities/user.entity';
// import { Wallet } from '../../domain/entities/wallet.entity';
// import { PaymentPage } from '../../domain/entities/payment.entity';
// import { Beneficiary } from '../../domain/entities/beneficiary.entity';
// import { Country } from '../../domain/entities/country.entity';

// dotenv.config();

// export const typeOrmConfig = (configService: ConfigService): TypeOrmModuleOptions => {
//   return {
//     type: 'postgres',
//     host: configService.get<string>('DB_HOST') || 'localhost',
//     port: parseInt(configService.get<string>('DB_PORT') || '5432', 10),
//     username: configService.get<string>('DB_USERNAME') || 'user_internal',
//     password: configService.get<string>('DB_PASSWORD') || 'Flick12345',
//     database: configService.get<string>('DB_NAME') || 'Flick',
//     entities: [User, Account, Wallet, Transaction, Bank, PaymentPage, Beneficiary, Country],
//     synchronize: false,
//     migrations: [__dirname + '/../migrations/*{.ts,.js}'],
//     migrationsRun: true,
//     logging: ['error', 'query'],
//   };
// };

// /* eslint-disable prettier/prettier */
