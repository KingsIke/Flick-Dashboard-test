/* eslint-disable prettier/prettier */



import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { typeOrmConfig } from './config/db/typeOrm.config';
import { User } from './domain/entities/user.entity';
import { AuthService } from './auth/auth';
import { EmailService } from './infrastructure/services/email/email.service';
import { UserRepository } from './infrastructure/repositories/user.repository';
import { ConfigModule } from '@nestjs/config';
import { emailConfig } from './config/email/email.config';
import { AuthController } from './auth/auth.controller';
import { JwtModule } from '@nestjs/jwt';
import { Account } from './domain/entities/account.entity';
import { Transaction } from './domain/entities/transaction.entity';
import { Wallet } from './domain/entities/wallet.entity';
import { Bank } from './domain/entities/bank.entity';
import { BankService } from './infrastructure/services/banks/bank.service';
import { AccountRepository } from './infrastructure/repositories/account.repository';
import { WalletRepository } from './infrastructure/repositories/wallet.repository';
import { JwtStrategy } from './auth/jwt.strategy';
import { BankRepository } from './infrastructure/repositories/bank.repository';
import { TransactionRepository } from './infrastructure/repositories/transaction.repository';
import { BusinessController } from './business/business.controller';
import { BusinessService } from './business/business';
import { TokenEncryptionUtil } from './config/utils/TokenEncryptionUtil';



@Module({
  imports: [
     ConfigModule.forRoot({
       envFilePath: '.env',
      isGlobal: true,
      load: [emailConfig],
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    TypeOrmModule.forFeature([User, Account, Wallet, Transaction, Bank]), 
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
    }),
  ],
  controllers: [AuthController, BusinessController],
  providers: [AuthService, EmailService, BankService, UserRepository, AccountRepository, WalletRepository, TransactionRepository, BankRepository, JwtStrategy, BusinessService,TokenEncryptionUtil],
  exports: [AuthService, BusinessService],

})
export class AppModule {}
