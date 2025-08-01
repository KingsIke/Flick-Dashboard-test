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

dotenv.config();

export const typeOrmConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: "localhost",
  port: 5432,
  username: "postgres",
  password: "453622Ike",
  database: "flickTest",
 entities: [User, Account, Wallet, Transaction, Bank, PaymentPage,  Beneficiary],
  synchronize: true,
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  migrationsRun: true,
};



// import { Client } from 'pg';

// const client = new Client({
//   user: 'postgres',
//   host: 'localhost',
//   password: '453622Ike',
//   port: 5432,
//   database: 'postgres', // NOT flickTest!
// });

// (async () => {
//   await client.connect();

//   await client.query(`
//     SELECT pg_terminate_backend(pid)
//     FROM pg_stat_activity
//     WHERE datname = 'flickTest'
//       AND pid <> pg_backend_pid()
//   `);

//   await client.query(`DROP DATABASE IF EXISTS "flickTest"`);

//   await client.end();
// })();