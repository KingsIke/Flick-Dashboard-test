/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AddBusinessDto, CardDetailsDto, CreateChargeDto, FundPayoutBalanceDto, NGNPayoutDto, NubanCreateMerchantDto, USDCompletePayoutDto } from 'src/application/dtos/auth.dto';
import { AccountRepository } from '../infrastructure/repositories/account.repository';
import { TransactionRepository } from '../infrastructure/repositories/transaction.repository';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { WalletRepository } from '../infrastructure/repositories/wallet.repository';
import { EmailService } from '../infrastructure/services/email/email.service';
import * as crypto from 'crypto';
import { PaymentPageRepository } from '../infrastructure/repositories/payment.repository';
import { TokenEncryptionUtil } from '../config/utils/TokenEncryptionUtil';
import { EncryptionUtil } from '../config/utils/EncryptionUtil';
import { BankRepository } from '../infrastructure/repositories/bank.repository';
import { validate } from 'class-validator';
import { Wallet } from 'src/domain/entities/wallet.entity';


@Injectable()
export class BusinessService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly accountRepository: AccountRepository,
    private readonly walletRepository: WalletRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
     private readonly paymentPageRepository: PaymentPageRepository,
    private readonly tokenEncryptionUtil: TokenEncryptionUtil,
    private readonly encryptionUtil: EncryptionUtil,
    private readonly bankRepository: BankRepository
  ) {}

  

 async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
    try {
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
              primaryColor: '#035c22',
              brandName: addBusinessDto.business_name,
              showLogo: true,
              showBrandName: false,
              secondaryColor: '#eaeaea',
            },
            card: true,
            bank_transfer: true,
          },
          merchantCode: `SUB_${crypto.randomBytes(8).toString('hex')}`,
          superMerchantCode: `CUS_${crypto.randomBytes(8).toString('hex')}`,
          webhook_url: 'https://3y10e3mvk2.execute-api.us-east-2.amazonaws.com/production/hooks/test-outbound',
          settlementType: { settledType: 'flexible', fee: '0' },
          FPR: { merchant: false, customer: true },
          YPEM: { bankAccount: false, payoutBalance: true },
          users: [user],
          isVulaUser: false,
          is_identity_only: false,
          is_regular: true,
          is_otc: false,
          is_portco: false,
          is_tx: false,
          is_vc: false,
          isLive: false,
          dated: new Date(),
        }),
      );
      console.log(`Account created: ${account.id} for businessId: ${addBusinessDto.businessId}`);

      const currencies = addBusinessDto.currencies && addBusinessDto.currencies.length > 0 ? addBusinessDto.currencies : ['NGN'];
      const walletData: Partial<Wallet> = {
        balances: currencies.map(currency => ({
          currency,
          collection_balance: 0,
          payout_balance: 1000,
          api_balance: currency === 'NGN' ? 0 : undefined,
        })),
        account,
      };
      const wallet = await this.walletRepository.save(
        this.walletRepository.create(walletData),
      );
      console.log(`Wallet created: ${wallet.id} for account: ${account.id}`);

      const initialTransactions = [];
      for (const currency of currencies) {
        // const balance = wallet.balances.find(b => b.currency === currency);
        const transaction = this.transactionRepository.create({
          eventname: 'Initial Funding',
          transtype: 'credit',
          total_amount: 1000,
          settled_amount: 1000,
          fee_charged: 0,
          currency_settled: currency,
          dated: new Date(),
          status: 'success',
          initiator: user.email,
          type: 'Inflow',
          transactionid: `flick-${crypto.randomUUID()}`,
          narration: `Initial wallet funding for ${currency} for new business`,
          balance_before: 0,
          balance_after: 1000,
          channel: 'system',
          beneficiary_bank: null,
          email: user.email,
          wallet,
        });
        await this.transactionRepository.save(transaction);
        console.log(`Transaction created: ${transaction.transactionid} for currency: ${currency}`);
        initialTransactions.push({
          transactionid: transaction.transactionid,
          amount: transaction.total_amount,
          currency: transaction.currency_settled,
          status: transaction.status,
          dated: transaction.dated,
        });
      }

      return {
        message: 'Business added successfully',
        account: { id: account.id, businessId: account.businessId },
        wallet: { id: wallet.id, balances: wallet.balances },
        initialTransactions,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Add business error:', error);
      throw new HttpException('Failed to add business', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
   async getBalances(userId: string) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet'] });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const balances = user.accounts.flatMap(account => {
        if (!account.wallet) {
          console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
          return [];
        }
        return account.wallet.balances;
      });

      return { data: balances };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get balances error:', error);
      throw new HttpException('Failed to retrieve balances', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

   async getTransactions(accountId: string) {
    try {
      const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet', 'wallet.transactions'] });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      if (!account.wallet) {
        console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
        return {
          message: 'No transactions available due to missing wallet',
          stats: {
            range: 'all time',
            currency: 'NGN',
            total_amount: 0,
            transaction_no: '0',
          },
          data: [],
        };
      }

      const transactions = account.wallet.transactions.map(tx => ({
        ...tx,
        dated_ago: this.getTimeAgo(tx.dated),
        total_amount: tx.total_amount.toString(),
        settled_amount: tx.settled_amount.toString(),
        balance_before: tx.balance_before.toString(),
        balance_after: tx.balance_after.toString(),
      }));
      return {
        message: 'collection transactions fetched successfully',
        stats: {
          range: 'all time',
                   currency: 'NGN', // Adjust if multi-currency

          total_amount: transactions.reduce((sum, tx) => sum + (tx.type === 'Inflow' ? Number(tx.total_amount) : 0), 0),
          transaction_no: transactions.filter(tx => tx.type === 'Inflow').length.toString(),
        },
        data: transactions.filter(tx => tx.type === 'Inflow'),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get transactions error:', error);
      throw new HttpException('Failed to retrieve transactions', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getUserInfo(userId: string) {
    try{
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
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get user info error:', error);
      throw new HttpException('Failed to retrieve user info', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async createCharge(userId: string, chargeDto: CreateChargeDto) {
    try {
      const account = await this.accountRepository.findOne({ where: { id: chargeDto.accountId },
      relations: ['wallet'], });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      if (!account.wallet) {
        console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
        throw new HttpException('Cannot create charge: Account has no wallet', HttpStatus.BAD_REQUEST);
      }

      const transactionId = `flick-${crypto.randomUUID()}`;
      const charges = Math.round(chargeDto.amount * 0.0135);
      const amountPayable = chargeDto.amount;
      const nairaEquivalent = chargeDto.currency === 'NGN' ? amountPayable : amountPayable * 1;
      const paymentUrl = `https://checkout.paywithflick.co/pages/${crypto.randomBytes(5).toString('hex')}`;

      const wallet = account.wallet;
      const balance = wallet.balances.find(b => b.currency === chargeDto.currency)?.payout_balance || 0;

      console.log("real")

      const transaction = this.transactionRepository.create({
        eventname: 'Charge',
        transtype: 'credit',
        total_amount: chargeDto.amount + charges,
        settled_amount: amountPayable,
        fee_charged: charges,
        currency_settled: chargeDto.currency,
        dated: new Date(),
        status: 'pending',
        initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
        type: 'Inflow',
        transactionid: transactionId,
        narration: 'Charge initiated',
        balance_before: balance,
        balance_after: balance,
        channel: 'card',
        beneficiary_bank: null,
        email: (await this.userRepository.findOne({ where: { id: userId } })).email,
        wallet,
      });

      await this.transactionRepository.save(transaction);
      console.log("hello")

      return {
        data: {
          transactionId,
          url: paymentUrl,
          currency: chargeDto.currency,
          currency_collected: chargeDto.currency,
          nairaEquivalent,
          amount: chargeDto.amount + charges,
          charges,
          amountPayable,
          payableFxAmountString: `₦${amountPayable.toFixed(2)}`,
          payableAmountString: `₦${amountPayable.toFixed(2)}`,
          rate: 1,
          currency_settled: chargeDto.currency,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create charge error:', error);
      throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

    async nubanCreateMerchant(userId: string, nubanDto: NubanCreateMerchantDto) {
    try {
      const { accountId, bankCode, bankName, accountNumber } = nubanDto;

      const account = await this.accountRepository.findOne({ where: { id: accountId } });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const bank = await this.bankRepository.findOne({ where: { bank_code: bankCode, bank_name: bankName } });
      if (!bank) throw new HttpException('Invalid bank code or name', HttpStatus.BAD_REQUEST);

      return {
        status: 200,
        message: 'successfully generated merchant nuban',
        data: [
          {
            bank_code: bankCode,
            bank_name: bankName,
            account_name: `Flick ${account.business_name}`,
            account_number: accountNumber,
          },
        ],
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Nuban create merchant error:', error);
      throw new HttpException('Failed to generate merchant nuban', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async getPaymentPages(accountId: string) {
    try {
      const paymentPages = await this.paymentPageRepository.findByAccountId(accountId);
      if (!paymentPages.length) throw new HttpException('No payment pages found', HttpStatus.NOT_FOUND);

      return { data: paymentPages };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get payment pages error:', error);
      throw new HttpException('Failed to retrieve payment pages', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

    async fundPayoutBalance(userId: string, fundDto: FundPayoutBalanceDto) {
    try {
      const account = await this.accountRepository.findOne({ where: { id: fundDto.accountId }, relations: ['wallet'] });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const wallet = account.wallet;
      if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);

      const transactionId = `Flick-${crypto.randomUUID()}`;
      let transaction;

      if (fundDto.method === 'bank_transfer') {
         if (!fundDto.bankCode || !fundDto.bankName || !fundDto.accountNumber) {
          throw new HttpException('Bank details required for bank transfer', HttpStatus.BAD_REQUEST);
        }
        const nuban = await this.nubanCreateMerchant(userId, 
         {
          accountId: fundDto.accountId,
          bankCode: fundDto.bankCode,
          bankName: fundDto.bankName,
          accountNumber: fundDto.accountNumber,
        }
      );
      
        const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
        transaction = this.transactionRepository.create({
          eventname: 'Fund Payout Balance',
          transtype: 'credit',
          total_amount: fundDto.amount,
          settled_amount: fundDto.amount,
          fee_charged: 0,
          currency_settled: 'NGN',
          dated: new Date(),
          status: 'pending',
          initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
          type: 'Inflow',
          transactionid: transactionId,
          narration: 'Fund payout balance via bank transfer',
          
          balance_before: balance,
          balance_after: balance + fundDto.amount,
          // balance_before: wallet.balances[0].payout_balance,
          // balance_after: wallet.balances[0].payout_balance + fundDto.amount,
          channel: 'bank_transfer',
          beneficiary_bank: nuban.data[0].bank_name,
          email: (await this.userRepository.findOne({ where: { id: userId } })).email,
          wallet,
        });
        await this.transactionRepository.save(transaction);
        return {
          message: 'Fund payout balance initiated via bank transfer',
          virtualAccount: nuban.data[0],
        };
      } else if (fundDto.method === 'card') {
        if (!fundDto.cardNumber || !fundDto.cvv || !fundDto.cardDate || !fundDto.cardName) {
          throw new HttpException('Card details required', HttpStatus.BAD_REQUEST);
        }
        const cardDetails = new CardDetailsDto();
        cardDetails.cardNumber = fundDto.cardNumber;
        cardDetails.cvv = fundDto.cvv;
        cardDetails.cardDate = fundDto.cardDate;
        cardDetails.cardName = fundDto.cardName;
        cardDetails.amount = fundDto.amount;

        const errors = await validate(cardDetails);
        if (errors.length > 0) {
          throw new HttpException(errors[0].constraints[Object.keys(errors[0].constraints)[0]], HttpStatus.BAD_REQUEST);
        }

        const paymentType = this.encryptionUtil.determinePaymentType(fundDto.cardNumber);
        if (!paymentType) throw new HttpException('Invalid card number use unsupported card', HttpStatus.BAD_REQUEST);

        const cardDetailsString = `${fundDto.cardNumber.replace(/\s+/g, '')}|${fundDto.cvv}|${fundDto.cardDate}|${fundDto.cardName.replace(/\s+/g, '')}|${transactionId}|${fundDto.amount}`;
        console.log(`Card details before encryption: ${cardDetailsString}`);
        const encryptedCardDetails = this.encryptionUtil.encrypter(cardDetailsString);
        if (!encryptedCardDetails) throw new HttpException('Incorrect input format', HttpStatus.INTERNAL_SERVER_ERROR);
         const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
        transaction = this.transactionRepository.create({
          eventname: 'Fund Payout Balance',
          transtype: 'credit',
          total_amount: fundDto.amount,
          settled_amount: fundDto.amount,
          fee_charged: 0,
          currency_settled: 'NGN',
          dated: new Date(),
          status: 'pending',
          initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
          type: 'Inflow',
          transactionid: transactionId,
          narration: `Fund payout balance via card (${paymentType})`,
          
          balance_before: balance,
          balance_after: balance + fundDto.amount,
          // balance_before: wallet.balances[0].payout_balance,
          // balance_after: wallet.balances[0].payout_balance + fundDto.amount,
          channel: 'card',
          beneficiary_bank: null,
          email: (await this.userRepository.findOne({ where: { id: userId } })).email,
          wallet,
        });
        await this.transactionRepository.save(transaction);

        return {
          statusCode: 200,
          status: 'success',
          requireAuth: true,
          transactionId,
          cardDetails: encryptedCardDetails,
          authorizationMode: paymentType.toLowerCase(),
          authorizationFields: paymentType,
          amount: fundDto.amount.toString(),
          message: `Waiting for ${paymentType} / Please send ${paymentType}`,
        };
      } else if (fundDto.method === 'payout_balance') {
        if (wallet.balances[0].payout_balance < fundDto.amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

         return { message: 'Coming Soon' };

          // const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
        // transaction = this.transactionRepository.create({
        //   eventname: 'Fund Payout Balance',
        //   transtype: 'credit',
        //   total_amount: fundDto.amount,
        //   settled_amount: fundDto.amount,
        //   fee_charged: 0,
        //   currency_settled: 'NGN',
        //   dated: new Date(),
        //   status: 'completed',
        //   initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
        //   type: 'Inflow',
        //   transactionid: transactionId,
        //   narration: 'Fund payout balance from existing payout balance',
      //  balance_before: balance,
          // balance_after: balance,
        //   channel: 'payout_balance',
        //   beneficiary_bank: null,
        //   email: (await this.userRepository.findOne({ where: { id: userId } })).email,
        //   wallet,
        // });
        // await this.transactionRepository.save(transaction);
        // return { message: 'Payout balance funded successfully' };
      } else {
        throw new HttpException('Invalid funding method', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Fund payout balance error:', error);
      throw new HttpException('Failed to fund payout balance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // async fundPayoutBalance(userId: string, fundDto: { accountId: string; amount: number; method: 'bank_transfer' | 'card' | 'payout_balance'; cardDetails?: string }) {
  //   try {
  //     const account = await this.accountRepository.findOne({ where: { id: fundDto.accountId }, relations: ['wallet'] });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     const wallet = account.wallet;
  //     if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);

  //     const transactionId = `Flick-${crypto.randomUUID()}`;
  //     let transaction;

  //     if (fundDto.method === 'bank_transfer') {
  //       const nuban = await this.nubanCreateMerchant(userId, fundDto.accountId);
  //       transaction = this.transactionRepository.create({
  //         eventname: 'Fund Payout Balance',
  //         transtype: 'credit',
  //         total_amount: fundDto.amount,
  //         settled_amount: fundDto.amount,
  //         fee_charged: 0,
  //         currency_settled: 'NGN',
  //         dated: new Date(),
  //         status: 'pending',
  //         initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //         type: 'Inflow',
  //         transactionid: transactionId,
  //         narration: 'Fund payout balance via bank transfer',
  //         balance_before: wallet.balances[0].payout_balance,
  //         balance_after: wallet.balances[0].payout_balance + fundDto.amount,
  //         channel: 'bank_transfer',
  //         beneficiary_bank: nuban.data[0].bank_name,
  //         email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //         wallet,
  //       });
  //       await this.transactionRepository.save(transaction);
  //       return {
  //         message: 'Fund payout balance initiated via bank transfer',
  //         virtualAccount: nuban.data[0],
  //       };
  //     } else if (fundDto.method === 'card') {
  //       if (!fundDto.cardNumber || !fundDto.cvv || !fundDto.cardDate || !fundDto.cardName) {
  //         throw new HttpException('Card details required', HttpStatus.BAD_REQUEST);
  //       }

  //       // Validate card details using Joi
  //       const cardDetails = {
  //         cardNumber: fundDto.cardNumber,
  //         cvv: fundDto.cvv,
  //         cardDate: fundDto.cardDate,
  //         cardName: fundDto.cardName,
  //         amount: fundDto.amount.toString(),
  //       };
  //       const { error } = CardDetailsValidation.validate(cardDetails);
  //       if (error) throw new HttpException(error.details[0].message, HttpStatus.BAD_REQUEST);

  //       // Determine payment type (OTP or PIN)
  //       const paymentType = this.encryptionUtil.determinePaymentType(fundDto.cardNumber);
  //       if (!paymentType) throw new HttpException('Invalid card number use unsupported card', HttpStatus.BAD_REQUEST);

  //       // Encrypt card details
  //       const cardDetailsString = `${fundDto.cardNumber.replace(/\s+/g, '')}|${fundDto.cvv}|${fundDto.cardDate}|${fundDto.cardName.replace(/\s+/g, '')}|${transactionId}|${fundDto.amount}`;
  //       console.log(`Card details before encryption: ${cardDetailsString}`);
  //       const encryptedCardDetails = this.encryptionUtil.encrypter(cardDetailsString);
  //       if (!encryptedCardDetails) throw new HttpException('Incorrect input format', HttpStatus.INTERNAL_SERVER_ERROR);

  //       // Mock card processing; integrate with payment gateway in production
  //       transaction = this.transactionRepository.create({
  //         eventname: 'Fund Payout Balance',
  //         transtype: 'credit',
  //         total_amount: fundDto.amount,
  //         settled_amount: fundDto.amount,
  //         fee_charged: 0,
  //         currency_settled: 'NGN',
  //         dated: new Date(),
  //         status: 'pending',
  //         initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //         type: 'Inflow',
  //         transactionid: transactionId,
  //         narration: `Fund payout balance via card (${paymentType})`,
  //         balance_before: wallet.balances[0].payout_balance,
  //         balance_after: wallet.balances[0].payout_balance + fundDto.amount,
  //         channel: 'card',
  //         beneficiary_bank: null,
  //         email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //         wallet,
  //       });
  //       await this.transactionRepository.save(transaction);

  //       return {
  //         statusCode: 200,
  //         status: 'success',
  //         requireAuth: true,
  //         transactionId,
  //         cardDetails: encryptedCardDetails,
  //         authorizationMode: paymentType.toLowerCase(),
  //         authorizationFields: paymentType,
  //         amount: fundDto.amount.toString(),
  //         message: `Waiting for ${paymentType} / Please send ${paymentType}`,
  //       };
  //       // if (!fundDto.cardDetails) throw new HttpException('Card details required', HttpStatus.BAD_REQUEST);
  //       // // Mock card processing; integrate with payment gateway
  //       // transaction = this.transactionRepository.create({
  //       //   eventname: 'Fund Payout Balance',
  //       //   transtype: 'credit',
  //       //   total_amount: fundDto.amount,
  //       //   settled_amount: fundDto.amount,
  //       //   fee_charged: 0,
  //       //   currency_settled: 'NGN',
  //       //   dated: new Date(),
  //       //   status: 'pending',
  //       //   initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       //   type: 'Inflow',
  //       //   transactionid: transactionId,
  //       //   narration: 'Fund payout balance via card',
  //       //   balance_before: wallet.balances[0].payout_balance,
  //       //   balance_after: wallet.balances[0].payout_balance + fundDto.amount,
  //       //   channel: 'card',
  //       //   beneficiary_bank: null,
  //       //   email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       //   wallet,
  //       // });
  //       // await this.transactionRepository.save(transaction);
  //       // return {
  //       //   statusCode: 200,
  //       //   status: 'success',
  //       //   requireAuth: true,
  //       //   transactionId,
  //       //   message: 'Charge initiated',
  //       //   authorizationMode: 'redirect',
  //       //   amount: fundDto.amount.toString(),
  //       // };
  //     } else if (fundDto.method === 'payout_balance') {
  //       if (wallet.balances[0].payout_balance < fundDto.amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);
  //       // transaction = this.transactionRepository.create({
  //       //   eventname: 'Fund Payout Balance',
  //       //   transtype: 'credit',
  //       //   total_amount: fundDto.amount,
  //       //   settled_amount: fundDto.amount,
  //       //   fee_charged: 0,
  //       //   currency_settled: 'NGN',
  //       //   dated: new Date(),
  //       //   status: 'completed',
  //       //   initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       //   type: 'Inflow',
  //       //   transactionid: transactionId,
  //       //   narration: 'Fund payout balance from existing payout balance',
  //       //   balance_before: wallet.balances[0].payout_balance,
  //       //   balance_after: wallet.balances[0].payout_balance, // No change since it's internal
  //       //   channel: 'payout_balance',
  //       //   beneficiary_bank: null,
  //       //   email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       //   wallet,
  //       // });
  //       // await this.transactionRepository.save(transaction);
  //       // return { message: 'Payout balance funded successfully' };
  //        return { message: 'Coming Soon' };
  //     } else {
  //       throw new HttpException('Invalid funding method', HttpStatus.BAD_REQUEST);
  //     }
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Fund payout balance error:', error);
  //     throw new HttpException('Failed to fund payout balance', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

    async getAllBusinesses(userId: string) {
      try {
        const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet'] });
        if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  
        const businesses = user.accounts.map(account => ({
          lowLimit: 300,
          business_Id: account.id,
          isVulaUser: account.isVulaUser,
          checkout_settings: account.checkout_settings,
          avatar: user.avatar || 'https://qrabaebwebhookbucket.s3.amazonaws.com/nuTtkNMbSnPZiWJ-GT3SF%2Fjulius-image.png',
          vc_code: `CUS_${crypto.randomBytes(8).toString('hex')}`,
          is_data: true,
          clonedMerchCode: account.superMerchantCode || `CUS_${crypto.randomBytes(8).toString('hex')}`,
          supportEmail: user.supportEmail || ' ',
          email: user.email,
          country: user.country,
          name: user.name,
          bizClass: 'sub_business',
          alias: ' ',
          bizAddress: user.bizAddress,
          password: '',
          token: '', // Token should be handled securely; not returned here
          business_type: account.business_type,
          is_identity_only: account.is_identity_only,
          is_regular: account.is_regular,
          id: account.businessId,
          phone: user.phone,
          is_otc: account.is_otc,
          business_email: user.email,
          isEmailVerified: user.verified,
          is_payment: true,
          business_name: account.business_name,
          website: user.website,
          is_portco: account.is_portco,
          businessId: account.businessId,
          total_whitelabelling: true,
          FPR: account.FPR,
          superMerchantCode: account.superMerchantCode || `CUS_${crypto.randomBytes(8).toString('hex')}`,
          is_tx: account.is_tx,
          merchantCode: account.merchantCode,
          isVerified: user.isVerified,
          is_vc: account.is_vc,
          webhook_url: account.webhook_url,
          dated: account.dated || new Date().toISOString(),
          YPEM: account.YPEM,
          referral_code: user.referral_code,
          supportPhone: user.supportPhone || ' ',
          settlementType: account.settlementType,
          isLive: account.isLive,
          balances: account.wallet ? account.wallet.balances : [],
        }));
  
        return {
          status: 200,
          data: businesses,
        };
      } catch (error) {
        if (error instanceof HttpException) throw error;
        console.error('Get all businesses error:', error);
        throw new HttpException('Failed to retrieve businesses', HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }

    
      async initiateNGNPayout(userId: string, payoutDto: NGNPayoutDto) {
        try {
          const { amount, account_number, bank_code, beneficiary_name, currency, narration, accountId } = payoutDto;
    
          const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet'] });
          if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    
          const wallet = account.wallet;
          if (!wallet) {
            console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
            throw new HttpException('Cannot initiate payout: Account has no wallet', HttpStatus.BAD_REQUEST);
          }
    
          const user = await this.userRepository.findOne({ where: { id: userId } });
          if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    
          const bank = await this.bankRepository.findOne({ where: { bank_code: bank_code } });
          if (!bank) throw new HttpException('Invalid bank code', HttpStatus.BAD_REQUEST);
    
          const amountNum = parseFloat(amount);
          if (isNaN(amountNum) || amountNum <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    
          const balance = wallet.balances.find(b => b.currency === currency)?.payout_balance || 0;
          if (balance < amountNum) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);
    
          const payoutId = `Flick-${crypto.randomBytes(5).toString('hex')}`;
          const otp = crypto.randomInt(100000, 999999).toString();
          const otpExpiresAt = this.getOtpExpiry();
    
          // Store OTP in user entity (or a separate table if preferred)
          await this.userRepository.updateUser(user.id, {
            payoutOtp: otp,
            payoutOtpExpiresAt: otpExpiresAt,
            pendingPayoutId: payoutId,
          });
    
          // Create pending transaction
          const transaction = this.transactionRepository.create({
            eventname: 'Payout',
            transtype: 'debit',
            total_amount: amountNum,
            settled_amount: amountNum,
            fee_charged: 0,
            currency_settled: currency,
            dated: new Date(),
            status: 'pending',
            initiator: user.email,
            type: 'Outflow',
            transactionid: payoutId,
            narration: narration,
            balance_before: balance,
            balance_after: balance,
            channel: 'bank_transfer',
            beneficiary_bank: bank.bank_name,
            email: user.email,
            wallet,
          });
          await this.transactionRepository.save(transaction);
          console.log(`Payout transaction initiated: ${transaction.transactionid} for ${currency}`);
    
          // Send OTP to email and phone
          await this.emailService.sendPayoutOtp(user.email, otp, {
            amount: amountNum,
            beneficiary_name,
            bank_name: bank.bank_name,
            account_number,
          });
    
          return {
            status: 200,
            Id: payoutId,
            email: user.email,
            phone: user.phone,
            bank_name: bank.bank_name,
            message: 'Please enter the otp sent to your registered mobile number or email',
          };
        } catch (error) {
          if (error instanceof HttpException) throw error;
          console.error('Initiate NGN payout error:', error);
          throw new HttpException('Failed to initiate NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    
      async completeNGNPayout(userId: string, completeDto: USDCompletePayoutDto) {
        try {
          const { Id, token } = completeDto;
    
          const user = await this.userRepository.findOne({ where: { id: userId } });
          if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    
          if (user.payoutOtp !== token || !user.payoutOtpExpiresAt || user.payoutOtpExpiresAt < new Date() || user.pendingPayoutId !== Id) {
            throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
          }
    
          const transaction = await this.transactionRepository.findOne({ where: { transactionid: Id, wallet: { account: { users: { id: userId } } } }, relations: ['wallet'] });
          if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);
    
          const wallet = transaction.wallet;
          const balance = wallet.balances.find(b => b.currency === transaction.currency_settled);
          if (!balance) throw new HttpException('Currency balance not found', HttpStatus.BAD_REQUEST);
    
          if (balance.payout_balance < transaction.total_amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);
    
          // Update wallet balance
          balance.payout_balance -= transaction.total_amount;
          await this.walletRepository.save(wallet);
          console.log(`Wallet updated: ${wallet.id}, new ${transaction.currency_settled} balance: ${balance.payout_balance}`);
    
          // Update transaction status
          transaction.status = 'completed';
          transaction.balance_after = balance.payout_balance;
          await this.transactionRepository.save(transaction);
          console.log(`Payout transaction completed: ${transaction.transactionid}`);
    
          // Clear OTP
          await this.userRepository.updateUser(user.id, {
            payoutOtp: null,
            payoutOtpExpiresAt: null,
            pendingPayoutId: null,
          });
    
          return {
            status: 200,
            Id,
            message: 'Payout queued successfully',
          };
        } catch (error) {
          if (error instanceof HttpException) throw error;
          console.error('Complete NGN payout error:', error);
          throw new HttpException('Failed to complete NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      }
    
      // async initiateUSDPayout(userId: string, payoutDto: USDPayoutDto) {
      //   try {
      //     const { amount, beneficiary_id, currency, debit_currency, narration, accountId } = payoutDto;
    
      //     const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet'] });
      //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
    
      //     const wallet = account.wallet;
      //     if (!wallet) {
      //       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
      //       throw new HttpException('Cannot initiate payout: Account has no wallet', HttpStatus.BAD_REQUEST);
      //     }
    
      //     const user = await this.userRepository.findOne({ where: { id: userId } });
      //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    
      //     // Assume Beneficiary entity exists
      //     const beneficiary = await this.bankRepository.findOne({ where: { id: beneficiary_id } });
      //     if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.BAD_REQUEST);
    
      //     const amountNum = parseFloat(amount);
      //     if (isNaN(amountNum) || amountNum <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    
      //     const fee = amountNum * 0.25; // 25% fee as per response
      //     const totalAmount = amountNum + fee;
    
      //     const balance = wallet.balances.find(b => b.currency === debit_currency)?.payout_balance || 0;
      //     if (balance < totalAmount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);
    
      //     const payoutId = crypto.randomBytes(5).toString('hex');
      //     const transactionId = `GI${payoutId}`;
    
      //     // Update wallet balance
      //     const balanceObj = wallet.balances.find(b => b.currency === debit_currency);
      //     balanceObj.payout_balance -= totalAmount;
      //     await this.walletRepository.save(wallet);
      //     console.log(`Wallet updated: ${wallet.id}, new ${debit_currency} balance: ${balanceObj.payout_balance}`);
    
      //     // Create transaction
      //     const transaction = this.transactionRepository.create({
      //       eventname: 'Payout',
      //       transtype: 'debit',
      //       total_amount: totalAmount,
      //       settled_amount: amountNum,
      //       fee_charged: fee,
      //       currency_settled: currency,
      //       dated: new Date(),
      //       status: 'initiated',
      //       initiator: user.email,
      //       type: 'Outflow',
      //       transactionid: transactionId,
      //       narration: narration,
      //       balance_before: balance,
      //       balance_after: balance - totalAmount,
      //       channel: 'bank_transfer',
      //       beneficiary_bank: beneficiary.bank_name || 'wise',
      //       email: user.email,
      //       wallet,
      //     });
      //     await this.transactionRepository.save(transaction);
      //     console.log(`Payout transaction initiated: ${transaction.transactionid} for ${currency}`);
    
      //     return {
      //       status: 200,
      //       message: 'Payout queued successfully',
      //       transaction_status: 'initiated',
      //       meta: {
      //         Id: transactionId,
      //         debit_currency,
      //         amount,
      //         credit_currency: currency,
      //         fee_charged: fee,
      //         total_amount: totalAmount,
      //         dated: transaction.dated.toISOString(),
      //         beneficiary_id,
      //         bank_name: beneficiary.bank_name || 'wise',
      //         account_no: beneficiary.account_number || 'BE67902244707497',
      //         sort_code: beneficiary.sort_code || 'TRWIBEB1XXX',
      //       },
      //     };
      //   } catch (error) {
      //     if (error instanceof HttpException) throw error;
      //     console.error('Initiate USD payout error:', error);
      //     throw new HttpException('Failed to initiate USD payout', HttpStatus.INTERNAL_SERVER_ERROR);
      //   }
      // }
  private getTimeAgo(date: Date): string {
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    const days = Math.floor(diffInSeconds / (3600 * 24));
    return `${days} days ago`;
  }

    private getOtpExpiry(minutes = 10): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
}