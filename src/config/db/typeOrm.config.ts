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

