/* eslint-disable prettier/prettier */
import { DataSource } from "typeorm";
import { Account } from '../../domain/entities/account.entity';
import { Bank } from '../../domain/entities/bank.entity';
import { Transaction } from '../../domain/entities/transaction.entity';
import { User } from '../../domain/entities/user.entity';
import { Wallet } from '../../domain/entities/wallet.entity';
import { PaymentPage } from '../../domain/entities/payment.entity';


export const AppDataSource = new DataSource({
 type: 'postgres',
  host: 'localhost',
  port: 5432,
  username: 'postgres',
  password: '453622Ike',
  database: 'flickTest',
  synchronize: true,
  entities: [User, Account, Wallet, Transaction, Bank, PaymentPage],
  migrations: ['src/migrations/**/*{.ts,.js}'],
});