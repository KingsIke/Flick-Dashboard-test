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

export const typeOrmConfig2: TypeOrmModuleOptions = {
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
  const connectionString = configService.get<string>('DATABASE_URL');
  
  const url = new URL(connectionString);

  return {
    type: 'postgres' as const,
    host: url.hostname,
    port: parseInt(url.port, 10),
    username: url.username,
    password: decodeURIComponent(url.password),
    database: url.pathname.slice(1),
   entities: [User, Account, Wallet, Transaction, Bank, PaymentPage,  Beneficiary, Country],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    migrationsRun: true,
    logging: ['error', 'query', 'migration'],
  };
};
