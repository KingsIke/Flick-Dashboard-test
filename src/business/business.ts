/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AddBusinessDto } from 'src/application/dtos/auth.dto';
import { AccountRepository } from 'src/infrastructure/repositories/account.repository';
import { TransactionRepository } from 'src/infrastructure/repositories/transaction.repository';
import { UserRepository } from 'src/infrastructure/repositories/user.repository';
import { WalletRepository } from 'src/infrastructure/repositories/wallet.repository';
import { EmailService } from 'src/infrastructure/services/email/email.service';
import * as crypto from 'crypto';


@Injectable()
export class BusinessService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
  ) {}

  

  async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts'] });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const existingAccount = await this.accountRepository.findByBusinessId(addBusinessDto.businessId);
    if (existingAccount) throw new HttpException('Business ID already exists', HttpStatus.BAD_REQUEST);

    const account = await this.accountRepository.save(
      this.accountRepository.create({
        businessId: addBusinessDto.businessId,
        business_name: addBusinessDto.business_name,
        business_type: addBusinessDto.business_type,
        checkout_settings: {
          customization: {
            primaryColor: '#ff2600',
            brandName: addBusinessDto.business_name,
            showLogo: false,
            showBrandName: false,
            secondaryColor: '#ffe8e8',
          },
          card: true,
          bank_transfer: true,
        },
        merchantCode: `CUS_${crypto.randomBytes(8).toString('hex')}`,
        webhook_url: 'https://3y10e3mvk2.execute-api.us-east-2.amazonaws.com/production/hooks/test-outbound',
        settlementType: { settledType: 'flexible', fee: '0' },
        FPR: { merchant: false, customer: true },
        YPEM: { bankAccount: false, payoutBalance: true },
        users: [user],
      }),
    );

    const wallet = await this.walletRepository.save(
      this.walletRepository.create({
        balances: [{ currency: addBusinessDto.currency, collection_balance: 0, payout_balance: 0, api_balance: addBusinessDto.currency === 'NGN' ? 0 : undefined }],
        account,
      }),
    );

    return {
      message: 'Business added successfully',
      account: { id: account.id, businessId: account.businessId },
      wallet: { id: wallet.id, balances: wallet.balances },
    };
  }

  async getBalances(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet'] });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const balances = user.accounts.flatMap(account => account.wallet.balances);
    return { data: balances };
  }

  async getTransactions(accountId: string) {
    const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet', 'wallet.transactions'] });
    if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

    const transactions = account.wallet.transactions.map(tx => ({
      ...tx,
      dated_ago: this.getTimeAgo(tx.dated),
    }));
    return { data: transactions };
  }

  async getUserInfo(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet'] });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    return {
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        business_email: user.email,
        supportEmail: user.supportEmail || '',
        supportPhone: user.supportPhone || '',
        phone: user.phone,
        country: user.country,
        bizAddress: user.bizAddress,
        avatar: user.avatar,
        website: user.website,
        referral_code: user.referral_code,
        isEmailVerified: user.verified,
        isVerified: user.isVerified,
        isLive: user.isLive,
        business_Id: user.accounts[0]?.id,
        businessId: user.accounts[0]?.businessId,
        business_name: user.accounts[0]?.business_name,
        business_type: user.accounts[0]?.business_type,
        checkout_settings: user.accounts[0]?.checkout_settings,
        merchantCode: user.accounts[0]?.merchantCode,
        webhook_url: user.accounts[0]?.webhook_url,
        settlementType: user.accounts[0]?.settlementType,
        isVulaUser: user.accounts[0]?.isVulaUser,
        is_identity_only: user.accounts[0]?.is_identity_only,
        is_regular: user.accounts[0]?.is_regular,
        is_otc: user.accounts[0]?.is_otc,
        is_portco: user.accounts[0]?.is_portco,
        is_tx: user.accounts[0]?.is_tx,
        is_vc: user.accounts[0]?.is_vc,
        FPR: user.accounts[0]?.FPR,
        YPEM: user.accounts[0]?.YPEM,
        dated: user.accounts[0]?.dated,
        lowLimit: 3500, 
        vc_code: `CUS_${crypto.randomBytes(8).toString('hex')}`,
        is_data: true, 
        alias: '', 
        password: '********',
        total_whitelabelling: true, 
        is_payment: true, 
      },
    };
  }

  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const days = Math.floor(diffInSeconds / (3600 * 24));
    return `${days} days ago`;
  }
}