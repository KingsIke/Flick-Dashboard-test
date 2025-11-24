/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AddBusinessDto,
  CardChargeDto,
  CardDetailsDto,
  ConvertAndFundDto,
  CreateChargeDto,
  CreateForeignFundChargeDto,
  CreatePaymentLinkDto,
  FundPayoutBalanceDto,
  FundWalletDto,
  NGNCompletePayoutDto,
  NGNPayoutDto,
  NubanChargeDto,
  NubanCreateMerchantDto,
  ProcessForeignPaymentDto,
  SaveBeneficiaryDto,
  TransactionFilterDto,
  USDPayoutDto,
} from '../application/dtos/auth.dto';
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
import { CountryRepository } from '../infrastructure/repositories/country.repository';
import { BeneficiaryRepository } from '../infrastructure/repositories/beneficiary.repository';
import { ExchangeRateService } from '../infrastructure/services/exchange-rate/exchange-rate.service';
import { Beneficiary } from '../domain/entities/beneficiary.entity';
import { Transaction } from 'src/domain/entities/transaction.entity';

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
    private readonly bankRepository: BankRepository,
    private readonly countryRepository: CountryRepository,
    private readonly beneficiaryRepository: BeneficiaryRepository,
    private readonly exchangeRateService: ExchangeRateService,
  ) {}

  async createCharge(userId: string, chargeDto: CreateChargeDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet'],
      });

      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const account = user.accounts[0];
      if (!account || !account.wallet) {
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }
      console.log(
        'USER :',
        user,
        'ACCOUNT :',
        account,
        'WALLET :',
        account.wallet,
      );

      const transactionid = `flick-${chargeDto.transactionId || crypto.randomUUID()}`;
      const accessCode = crypto.randomBytes(5).toString('hex');
      const charges = Math.round(chargeDto.amount * 0.0135);
      const amountPayable = chargeDto.amount;
      const paymentUrl = `https://checkout.paywithflick.co/pages/${accessCode}`;

      // Determine which balance to fund based on the charge type
      const balanceType = chargeDto.balanceType || 'collection';

      const transaction = this.transactionRepository.create({
        eventname: 'Charge',
        transtype: 'credit',
        total_amount: amountPayable + charges,
        settled_amount: amountPayable,
        fee_charged: charges,
        currency_settled: 'NGN',
        dated: new Date(),
        status: 'CardPending',
        initiator: user.email,
        type: 'Pending',
        transactionid,
        narration: 'Charge initiated',
        balance_before: 0,
        balance_after: 0,
        channel: 'card',
        email: user.email,
        wallet: account.wallet,
        balanceType: balanceType,
      });

      await this.transactionRepository.save(transaction);
      console.log('SAVE......:', this.transactionRepository);

      return {
        statusCode: 200,
        status: 'success',
        message: 'Charge created successfully',
        data: {
          transactionid,
          url: paymentUrl,
          currency: 'NGN',
          currency_collected: 'NGN',
          nairaEquivalent: amountPayable + charges,
          amount: amountPayable + charges,
          charges,
          amountPayable,
          payableFxAmountString: `₦${amountPayable.toFixed(2)}`,
          payableAmountString: `₦${amountPayable.toFixed(2)}`,
          rate: 1,
          currency_settled: 'NGN',
          balanceType,
        },
      };
    } catch (error) {
      console.error('Create charge error:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Failed to create charge',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async createCardCharge(userId: string, chargeDto: CardChargeDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.accounts || user.accounts.length === 0) {
        throw new HttpException(
          'No account found for user',
          HttpStatus.NOT_FOUND,
        );
      }

      if (user.accounts.length > 1) {
        throw new HttpException(
          'User has multiple accounts, which is not allowed',
          HttpStatus.BAD_REQUEST,
        );
      }

      const account = user.accounts[0];
      if (!account.wallet) {
        throw new HttpException(
          'Wallet not found for account',
          HttpStatus.NOT_FOUND,
        );
      }

      let transaction: Transaction;
      const transactionId = chargeDto.transactionId;

      const normalizeAmount = (value: any): string => {
        return parseFloat(Number(value).toFixed(2)).toFixed(2);
      };

      const receivedAmountStr = normalizeAmount(chargeDto.amount);

      if (transactionId) {
        transaction = await this.transactionRepository.findOne({
          where: {
            transactionid: transactionId,
            wallet: { id: account.wallet.id },
          },
          relations: ['wallet'],
        });

        if (!transaction) {
          throw new HttpException(
            'Invalid transaction ID or transaction not associated with user wallet',
            HttpStatus.BAD_REQUEST,
          );
        }

        if (transaction.status !== 'CardPending') {
          throw new HttpException(
            'Transaction is not in Pending',
            HttpStatus.BAD_REQUEST,
          );
        }

        const expectedAmountStr = normalizeAmount(transaction.settled_amount);
        if (receivedAmountStr !== expectedAmountStr) {
          throw new HttpException(
            `Incorrect amount. Expected ${expectedAmountStr}, received ${receivedAmountStr}`,
            HttpStatus.BAD_REQUEST,
          );
        }

        const now = new Date();
        const transactionTime = new Date(transaction.dated);
        const timeDiffMs = now.getTime() - transactionTime.getTime();
        const timeDiffMinutes = timeDiffMs / (1000 * 60);

        if (timeDiffMinutes > 40) {
          throw new HttpException(
            'The 40-minute time allocated to this payment has expired',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      const paymentType = this.encryptionUtil.determinePaymentType(
        chargeDto.cardNumber,
      );
      if (!paymentType) {
        throw new HttpException(
          'Invalid card number or unsupported card',
          HttpStatus.BAD_REQUEST,
        );
      }

      const cardDetailsString = `${chargeDto.cardNumber.replace(/\s+/g, '')}|${chargeDto.cvv}|${chargeDto.cardDate}|${chargeDto.cardName.replace(/\s+/g, '')}|${chargeDto.amount}`;
      const encryptedCardDetails =
        this.encryptionUtil.encrypter(cardDetailsString);
      if (!encryptedCardDetails) {
        throw new HttpException(
          'Failed to encrypt card details',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const amount = parseFloat(receivedAmountStr);
      const fee = Math.round(amount * 0.0135);
      const total = amount - fee;

      const currency = transaction?.currency_settled || 'NGN';

      if (transaction) {
        let targetBalance = account.wallet.balances.find(
          (b) => b.currency === currency,
        );
        if (!targetBalance) {
          targetBalance = {
            currency,
            api_balance: 0,
            payout_balance: 0,
            collection_balance: 0,
          };
          account.wallet.balances.push(targetBalance);
        }
        const balanceType = transaction.balanceType || 'collection';

        switch (balanceType) {
          case 'api':
            targetBalance.api_balance += amount;
            transaction.eventname = 'Fund API Balance';
            transaction.narration = `Fund API balance via card (${paymentType})`;
            transaction.balance_before = targetBalance.api_balance - amount;
            transaction.balance_after = targetBalance.api_balance;
            break;
          case 'collection':
          default:
            targetBalance.payout_balance += amount;
            targetBalance.collection_balance += amount;
            transaction.eventname = 'Fund Payout Balance';
            transaction.narration = `Fund payout balance via card (${paymentType})`;
            transaction.balance_before = targetBalance.payout_balance - amount;
            transaction.balance_after = targetBalance.payout_balance;
            break;
        }

        transaction.status = 'success';
        transaction.type = 'Inflow';

        await this.walletRepository.save(account.wallet);
      }

      await this.transactionRepository.save(transaction);
      console.log(
        `Transaction ${transactionId} ${transactionId === chargeDto.transactionId ? 'updated' : 'created'} for card payment`,
      );

      return {
        cardDetails: encryptedCardDetails,
        transactionId,
      };
    } catch (error) {
      console.error('Create card charge error:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Failed to create card charge',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async createNubanCharge(userId: string, nubanDto: NubanChargeDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (!user.accounts || user.accounts.length === 0) {
        throw new HttpException(
          'No account found for user',
          HttpStatus.NOT_FOUND,
        );
      }

      if (user.accounts.length > 1) {
        throw new HttpException(
          'User has multiple accounts, which is not allowed',
          HttpStatus.BAD_REQUEST,
        );
      }

      const account = user.accounts[0];
      const wallet = account.wallet;

      if (!wallet) {
        throw new HttpException(
          'Wallet not found for account',
          HttpStatus.NOT_FOUND,
        );
      }

      const existingTransaction = await this.transactionRepository.findOne({
        where: {
          transactionid: nubanDto.transactionId,
          wallet: { id: wallet.id },
        },
        relations: ['wallet'],
      });

      if (existingTransaction) {
        throw new HttpException(
          'Transaction ID already exists',
          HttpStatus.BAD_REQUEST,
        );
      }

      const currency = 'NGN';
      const amount = nubanDto.amount;
      const balanceType = nubanDto.balanceType || 'collection';

      let targetBalance = wallet.balances.find((b) => b.currency === currency);

      if (!targetBalance) {
        targetBalance = {
          currency,
          api_balance: 0,
          payout_balance: 0,
          collection_balance: 0,
        };
        wallet.balances.push(targetBalance);
      }

      let beforeBalance = 0;

      if (balanceType === 'api') {
        beforeBalance = targetBalance.api_balance;
        targetBalance.api_balance += amount;
      } else {
        beforeBalance = targetBalance.collection_balance;
        targetBalance.collection_balance += amount;
        targetBalance.payout_balance += amount;
      }

      await this.walletRepository.save(wallet);

      const transaction = this.transactionRepository.create({
        eventname: 'NUBAN Funding',
        transtype: 'credit',
        total_amount: amount,
        settled_amount: amount,
        fee_charged: 0,
        currency_settled: currency,
        dated: new Date(),
        status: 'Success',
        initiator: user.email,
        type: 'Inflow',
        transactionid: nubanDto.transactionId,
        narration:
          nubanDto.description || `NUBAN funding (${balanceType} balance)`,
        balance_before: beforeBalance,
        balance_after:
          balanceType === 'api'
            ? targetBalance.api_balance
            : targetBalance.collection_balance,
        channel: 'nuban',
        email: user.email,
        wallet,
        balanceType,
      });

      await this.transactionRepository.save(transaction);

      return {
        statusCode: 200,
        status: 'success',
        message: 'NUBAN deposit added successfully',
        data: {
          transactionId: nubanDto.transactionId,
          amount,
          balanceType,
          currency,
        },
      };
    } catch (error) {
      console.error('Create NUBAN charge error:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Failed to create NUBAN charge',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async nubanCreateMerchant(userId: string, nubanDto: NubanCreateMerchantDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const account = await this.accountRepository.findOne({
        where: { id: nubanDto.accountId },
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      // Simulate NUBAN creation (replace with actual bank API integration)
      const virtualAccount = {
        bank_code: nubanDto.bankCode,
        bank_name: nubanDto.bankName,
        account_name: nubanDto.accountName,
        account_number: nubanDto.accountNumber,
      };

      return { data: [virtualAccount] };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('NUBAN create merchant error:', error);
      throw new HttpException(
        'Failed to create NUBAN merchant',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fundPayoutBalance(userId: string, fundDto: FundPayoutBalanceDto) {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: fundDto.accountId },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const wallet = account.wallet;
      if (!wallet) {
        console.warn(
          `Account ${account.id} (businessId: ${account.businessId}) has no wallet`,
        );
        throw new HttpException(
          'Cannot fund payout balance: Account has no wallet',
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const transactionId = `flick-${crypto.randomUUID()}`;
      const currency = 'NGN';
      let balance = wallet.balances?.find((b) => b.currency === currency);

      if (!balance) {
        balance = { currency, api_balance: 0 };
        wallet.balances = [balance];
        await this.walletRepository.save(wallet);
      }

      if (fundDto.method === 'bank_transfer') {
        if (!fundDto.bankCode || !fundDto.bankName || !fundDto.accountNumber) {
          throw new HttpException(
            'Bank details required for bank transfer',
            HttpStatus.BAD_REQUEST,
          );
        }

        const nuban = await this.nubanCreateMerchant(userId, {
          accountId: fundDto.accountId,
          bankCode: fundDto.bankCode,
          bankName: fundDto.bankName,
          accountNumber: fundDto.accountNumber,
          accountName: fundDto.accountName || '',
        });

        const transaction = this.transactionRepository.create({
          eventname: 'Fund Payout Balance',
          transtype: 'credit',
          total_amount: fundDto.amount,
          settled_amount: fundDto.amount,
          fee_charged: 0,
          currency_settled: currency,
          dated: new Date(),
          status: 'success',
          initiator: user.email,
          type: 'Inflow',
          transactionid: transactionId,
          narration: 'Fund payout balance via bank transfer',
          balance_before: 0,
          balance_after: 0,
          channel: 'bank_transfer',
          beneficiary_bank: nuban.data[0].bank_name,
          email: user.email,
          wallet,
        });

        await this.transactionRepository.save(transaction);
        console.log(
          `Transaction created: ${transaction.transactionid} for fund payout balance via bank transfer`,
        );

        return {
          message: `Payout balance funding of ${transaction.total_amount} initiated via bank transfer`,
          virtualAccount: nuban.data[0],
        };
      } else if (fundDto.method === 'card') {
        if (
          !fundDto.cardNumber ||
          !fundDto.cvv ||
          !fundDto.cardDate ||
          !fundDto.cardName
        ) {
          throw new HttpException(
            'Card details required',
            HttpStatus.BAD_REQUEST,
          );
        }

        const cardDetails = new CardDetailsDto();
        cardDetails.cardNumber = fundDto.cardNumber;
        cardDetails.cvv = fundDto.cvv;
        cardDetails.cardDate = fundDto.cardDate;
        cardDetails.cardName = fundDto.cardName;
        cardDetails.amount = fundDto.amount;

        const errors = await validate(cardDetails);
        if (errors.length > 0) {
          throw new HttpException(
            errors[0].constraints[Object.keys(errors[0].constraints)[0]],
            HttpStatus.BAD_REQUEST,
          );
        }

        const paymentType = this.encryptionUtil.determinePaymentType(
          fundDto.cardNumber,
        );
        if (!paymentType)
          throw new HttpException(
            'Invalid card number use unsupported card',
            HttpStatus.BAD_REQUEST,
          );

        const cardDetailsString = `${fundDto.cardNumber.replace(/\s+/g, '')}|${fundDto.cvv}|${fundDto.cardDate}|${fundDto.cardName.replace(/\s+/g, '')}|${transactionId}|${fundDto.amount}`;
        const encryptedCardDetails =
          this.encryptionUtil.encrypter(cardDetailsString);
        if (!encryptedCardDetails)
          throw new HttpException(
            'Incorrect input format',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );

        const transaction = this.transactionRepository.create({
          eventname: 'Fund Payout Balance',
          transtype: 'credit',
          total_amount: fundDto.amount,
          settled_amount: fundDto.amount,
          fee_charged: 0,
          currency_settled: currency,
          dated: new Date(),
          status: 'success',
          initiator: user.email,
          type: 'Inflow',
          transactionid: transactionId,
          narration: `Fund payout balance via card (${paymentType})`,
          balance_before: 0,
          balance_after: 0,
          channel: 'card',
          beneficiary_bank: null,
          email: user.email,
          wallet,
        });

        await this.transactionRepository.save(transaction);
        console.log(
          `Transaction created: ${transaction.transactionid} for fund payout balance via card`,
        );

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
        if (wallet.balances[0].payout_balance < fundDto.amount)
          throw new HttpException(
            'Insufficient payout balance',
            HttpStatus.BAD_REQUEST,
          );

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
      }
      //  else if (fundDto.method === 'api_transfer' || fundDto.method === 'api_card') {
      //   if (fundDto.method === 'api_transfer' && (!fundDto.bankCode || !fundDto.bankName || !fundDto.accountNumber)) {
      //     throw new HttpException('Bank details required for API transfer', HttpStatus.BAD_REQUEST);
      //   }
      //   if (fundDto.method === 'api_card' && (!fundDto.cardNumber || !fundDto.cvv || !fundDto.cardDate || !fundDto.cardName)) {
      //     throw new HttpException('Card details required for API card', HttpStatus.BAD_REQUEST);
      //   }

      //   const transactions = wallet.transactions || [];
      //   let currentApiBalance = 0;
      //   transactions.forEach(tx => {
      //     if (!['completed', 'success'].includes(tx.status)) return;
      //     if (tx.eventname === 'Fund API Balance') {
      //       currentApiBalance += tx.settled_amount;
      //     }
      //   });

      //   const transaction = this.transactionRepository.create({
      //     eventname: 'Fund API Balance',
      //     transtype: 'credit',
      //     total_amount: fundDto.amount,
      //     settled_amount: fundDto.amount,
      //     fee_charged: 0,
      //     currency_settled: currency,
      //     dated: new Date(),
      //     status: 'pending',
      //     initiator: user.email,
      //     type: 'Inflow',
      //     transactionid: transactionId,
      //     narration: `Fund API balance via ${fundDto.method}`,
      //     balance_before: currentApiBalance,
      //     balance_after: currentApiBalance + fundDto.amount,
      //     channel: fundDto.method === 'api_transfer' ? 'bank_transfer' : 'card',
      //     beneficiary_bank: fundDto.method === 'api_transfer' ? fundDto.bankName : null,
      //     email: user.email,
      //     wallet,
      //   });

      //   await this.transactionRepository.save(transaction);
      //   console.log(`Transaction created: ${transaction.transactionid} for fund API balance via ${fundDto.method}`);

      //   return {
      //     message: `API balance funding initiated via ${fundDto.method}`,
      //     transactionId,
      //   };
      // }
      else {
        throw new HttpException(
          'Invalid funding method',
          HttpStatus.BAD_REQUEST,
        );
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Fund payout balance error:', error);
      throw new HttpException(
        'Failed to fund payout balance',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fundWallet1(userId: string, fundWalletDto: FundWalletDto) {
    try {
      console.log(
        '1: Funding wallet for userId:',
        userId,
        'DTO:',
        fundWalletDto,
      );
      const account = await this.accountRepository.findOne({
        where: { id: fundWalletDto.accountId, user: { id: userId } },
        relations: ['wallet'],
      });
      if (!account || !account.wallet)
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );

      const wallet = account.wallet;
      const currency = fundWalletDto.currency_collected;
      const amount = parseFloat(fundWalletDto.amount.toString()) / 100; // Convert cents to units
      const charges = amount * 0.0002; // Mimic FUND_WALLET_LINK charges
      const amountPayable = amount + charges;

      console.log(
        '2: Updating balance for currency:',
        currency,
        'amountPayable:',
        amountPayable,
      );
      let targetBalance = wallet.balances.find((b) => b.currency === currency);
      if (!targetBalance) {
        targetBalance = {
          currency,
          api_balance: 0,
          payout_balance: 0,
          collection_balance: 0,
        };
        wallet.balances.push(targetBalance);
      }
      targetBalance.payout_balance += amountPayable;
      targetBalance.collection_balance += amountPayable;
      await this.walletRepository.save(wallet);

      console.log('3: Creating funding transaction');
      const transactionId = `Flick-${crypto.randomUUID()}`;
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const transaction = this.transactionRepository.create({
        eventname: `Funding ${currency}`,
        transtype: 'credit',
        total_amount: amount,
        settled_amount: amountPayable,
        fee_charged: charges,
        currency_settled: currency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Inflow',
        transactionid: transactionId,
        narration: `Funding of ${amountPayable} ${currency}`,
        balance_before: targetBalance.payout_balance - amountPayable,
        balance_after: targetBalance.payout_balance,
        channel: 'external',
        email: user.email,
        wallet,
      });

      console.log('4: Saving funding transaction');
      await this.transactionRepository.save(transaction);

      console.log('5: Funding successful');
      return {
        statusCode: 200,
        status: 'success',
        message: 'Transaction created successfully',
        data: {
          transactionId,
          url: `https://checkout.global.paywithflick.co/pages/${crypto.randomBytes(8).toString('base64url')}`,
          currency,
          currency_collected: currency,
          nairaEquivalent: 0,
          amount,
          charges,
          amountPayable,
          payableFxAmountString: `${currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : '€'}${amountPayable.toFixed(2)}`,
          payableAmountString: `${currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency === 'NGN' ? '₦' : '€'}${amountPayable.toFixed(2)}`,
          rate: 1,
          currency_settled: currency,
        },
      };
    } catch (error) {
      console.error('Fund wallet error:', error);
      throw new HttpException(
        error.message || 'Failed to fund wallet',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async fundWallet(userId: string, fundWalletDto: FundWalletDto) {
    try {
      const allowedCurrencies = ['EUR', 'GBP', 'USD', 'NGN'];
      const currency = fundWalletDto.currency_collected?.toUpperCase();

      if (!allowedCurrencies.includes(currency)) {
        throw new HttpException(
          `Funding in ${currency} is not supported`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log(
        '1: Funding wallet for userId:',
        userId,
        'DTO:',
        fundWalletDto,
      );

      const account = await this.accountRepository.findOne({
        where: { id: fundWalletDto.accountId, user: { id: userId } },
        relations: ['wallet'],
      });

      if (!account || !account.wallet) {
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const wallet = account.wallet;
      const amount = parseFloat(fundWalletDto.amount.toString());
      const charges = amount * 0.0002;
      const amountPayable = amount;

      console.log(
        '2: Updating balance for currency:',
        currency,
        'amountPayable:',
        amountPayable,
      );

      let targetBalance = wallet.balances.find((b) => b.currency === currency);
      if (!targetBalance) {
        targetBalance = {
          currency,
          api_balance: 0,
          payout_balance: 0,
          collection_balance: 0,
        };
        wallet.balances.push(targetBalance);
      }

      targetBalance.payout_balance += amountPayable;
      targetBalance.collection_balance += amountPayable;
      await this.walletRepository.save(wallet);

      console.log('3: Creating funding transaction');
      const transactionId = `Flick-${crypto.randomUUID()}`;
      const user = await this.userRepository.findOne({ where: { id: userId } });

      const transaction = this.transactionRepository.create({
        eventname: `Funding ${currency}`,
        transtype: 'credit',
        total_amount: amount,
        settled_amount: amountPayable,
        fee_charged: charges,
        currency_settled: currency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Inflow',
        transactionid: transactionId,
        narration: `Funding of ${amountPayable} ${currency}`,
        balance_before: targetBalance.payout_balance - amountPayable,
        balance_after: targetBalance.payout_balance,
        channel: 'external',
        email: user.email,
        wallet,
      });

      console.log('4: Saving funding transaction');
      await this.transactionRepository.save(transaction);

      console.log('5: Funding successful');
      const symbol = currency === 'USD' ? '$' : currency === 'GBP' ? '£' : '€';

      return {
        statusCode: 200,
        status: 'success',
        message: 'Transaction created successfully',
        data: {
          transactionId,
          url: `https://checkout.global.paywithflick.co/pages/${crypto.randomBytes(8).toString('base64url')}`,
          currency,
          currency_collected: currency,
          nairaEquivalent: 0,
          amount,
          charges,
          amountPayable,
          payableFxAmountString: `${symbol}${amountPayable.toFixed(2)}`,
          payableAmountString: `${symbol}${amountPayable.toFixed(2)}`,
          rate: 1,
          currency_settled: currency,
        },
      };
    } catch (error) {
      console.error('Fund wallet error:', error);
      throw new HttpException(
        error.message || 'Failed to fund wallet',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getBalances(userId: string, accountId: string) {
    try {
      console.log(
        '1: Fetching balances for userId:',
        userId,
        'accountId:',
        accountId,
      );
      const account = await this.accountRepository.findOne({
        where: { id: accountId, user: { id: userId } },
        relations: ['wallet'],
      });
      if (!account || !account.wallet) {
        console.error('Account or wallet not found for accountId:', accountId);
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const wallet = await this.walletRepository.findOne({
        where: { id: account.wallet.id },
      });
      if (!wallet) {
        console.error('Wallet not found for walletId:', account.wallet.id);
        throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
      }
      console.log(
        '2: Wallet ID:',
        wallet.id,
        'Raw balances:',
        JSON.stringify(wallet.balances),
      );

      const supportedCurrencies = [
        'NGN',
        'GHS',
        'KES',
        'USD',
        'GBP',
        'EUR',
        'CAD',
      ];
      const balances = supportedCurrencies.map((currency) => {
        const balance = wallet.balances.find(
          (b) => b.currency === currency,
        ) || {
          currency,
          collection_balance: 0,
          payout_balance: 0,
          api_balance: 0,
        };
        const multiplier = 100;

        return {
          currency,
          collection_balance: Number(
            (balance.collection_balance * multiplier).toFixed(2),
          ),
          payout_balance: Number(
            (balance.payout_balance * multiplier).toFixed(2),
          ),
          api_balance: Number(
            (balance.api_balance * multiplier || 0).toFixed(2),
          ),
        };
      });
      console.log('3: Formatted balances:', JSON.stringify(balances));

      return {
        status: 200,
        message: 'Balance retrieved successfully',
        data: balances,
      };
    } catch (error) {
      console.error('Get balances error:', error);
      throw new HttpException(
        error.message || 'Failed to retrieve balances',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async initiateNGNPayout(userId: string, payoutDto: NGNPayoutDto) {
    try {
      const {
        amount,
        account_number,
        bank_code,
        beneficiary_name,
        currency,
        narration,
        accountId,
      } = payoutDto;

      const account = await this.accountRepository.findOne({
        where: { id: accountId },
        relations: ['wallet', 'wallet.transactions'],
      });
      console.log('User:', userId);
      console.log('Account Id:', account);
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const wallet = account.wallet;
      if (!wallet) {
        console.warn(
          `Account ${account.id} (businessId: ${account.businessId}) has no wallet`,
        );
        throw new HttpException(
          'Cannot initiate payout: Account has no wallet',
          HttpStatus.BAD_REQUEST,
        );
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const bank = await this.bankRepository.findOne({
        where: { bank_code: bank_code },
      });
      if (!bank)
        throw new HttpException('Invalid bank code', HttpStatus.BAD_REQUEST);

      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum <= 0)
        throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach((tx) => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(
            `Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`,
          );
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });

      if (payoutBalance < amountNum)
        throw new HttpException(
          'Insufficient payout balance',
          HttpStatus.BAD_REQUEST,
        );

      const payoutId = `Flick-${crypto.randomBytes(5).toString('hex')}`;
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpiresAt = this.getOtpExpiry();

      await this.userRepository.updateUser(user.id, {
        payoutOtp: otp,
        payoutOtpExpiresAt: otpExpiresAt,
        pendingPayoutId: payoutId,
      });

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
        balance_before: payoutBalance,
        balance_after: payoutBalance,
        channel: 'bank_transfer',
        beneficiary_bank: bank.bank_name,
        email: user.email,
        wallet,
      });
      await this.transactionRepository.save(transaction);
      console.log(
        `Payout transaction initiated: ${transaction.transactionid} for ${currency}`,
      );

      try {
        await this.emailService.sendPayoutOtp(user.email, otp, {
          amount: amountNum,
          beneficiary_name,
          bank_name: bank.bank_name,
          account_number,
        });
      } catch (error) {
        console.error(`Failed to send OTP for payout ${payoutId}:`, error);
        console.log(`Fallback OTP for ${user.email}: ${otp}`);
      }

      return {
        status: 200,
        Id: payoutId,
        email: user.email,
        phone: user.phone,
        bank_name: bank.bank_name,
        message:
          'Please enter the otp sent to your registered mobile number or email',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Initiate NGN payout error:', error);
      throw new HttpException(
        'Failed to initiate NGN payout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async completeNGNPayout1(userId: string, completeDto: NGNCompletePayoutDto) {
    try {
      const { Id, token } = completeDto;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      if (
        user.payoutOtp !== token ||
        !user.payoutOtpExpiresAt ||
        user.payoutOtpExpiresAt < new Date() ||
        user.pendingPayoutId !== Id
      ) {
        throw new HttpException(
          'Invalid or expired OTP',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transaction = await this.transactionRepository.findOne({
        where: {
          transactionid: Id,
          wallet: { account: { user: { id: userId } } },
        },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!transaction)
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

      const wallet = transaction.wallet;
      if (!wallet) {
        console.warn(`Transaction ${Id} has no associated wallet`);
        throw new HttpException(
          'Cannot complete payout: No wallet found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach((tx) => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(
            `Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`,
          );
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });

      if (payoutBalance < transaction.total_amount)
        throw new HttpException(
          'Insufficient payout balance',
          HttpStatus.BAD_REQUEST,
        );

      transaction.status = 'completed';
      transaction.balance_after = payoutBalance - transaction.total_amount;
      await this.transactionRepository.save(transaction);
      console.log(`Payout transaction completed: ${transaction.transactionid}`);

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
      throw new HttpException(
        'Failed to complete NGN payout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async completeNGNPayout(userId: string, completeDto: NGNCompletePayoutDto) {
    try {
      const { Id, token } = completeDto;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      if (
        user.payoutOtp !== token ||
        !user.payoutOtpExpiresAt ||
        user.payoutOtpExpiresAt < new Date() ||
        user.pendingPayoutId !== Id
      ) {
        throw new HttpException(
          'Invalid or expired OTP',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transaction = await this.transactionRepository.findOne({
        where: {
          transactionid: Id,
          wallet: { account: { user: { id: userId } } },
        },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!transaction)
        throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

      const wallet = transaction.wallet;
      if (!wallet) {
        console.warn(`Transaction ${Id} has no associated wallet`);
        throw new HttpException(
          'Cannot complete payout: No wallet found',
          HttpStatus.BAD_REQUEST,
        );
      }

      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach((tx) => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(
            `Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`,
          );
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });

      if (payoutBalance < transaction.total_amount)
        throw new HttpException(
          'Insufficient payout balance',
          HttpStatus.BAD_REQUEST,
        );

      // Deduct from wallet balances, similar to convertAndFund outflow
      const currency = transaction.currency_settled;
      const balance = wallet.balances.find((b) => b.currency === currency);
      if (!balance) {
        console.error(`No ${currency} balance found in wallet`);
        throw new HttpException(
          `No ${currency} balance found`,
          HttpStatus.BAD_REQUEST,
        );
      }

      if (balance.payout_balance < transaction.total_amount) {
        console.error(
          `Insufficient ${currency} payout balance - required: ${transaction.total_amount}, available: ${balance.payout_balance}`,
        );
        throw new HttpException(
          `Insufficient ${currency} payout balance`,
          HttpStatus.BAD_REQUEST,
        );
      }

      balance.payout_balance -= transaction.total_amount;
      // Optionally: balance.collection_balance -= transaction.total_amount; // Uncomment if you want to deduct from collection_balance too (not done in convertAndFund outflow)

      await this.walletRepository.save(wallet);
      console.log(
        `Deducted ${transaction.total_amount} from ${currency} payout_balance in wallet ${wallet.id}`,
      );

      // Proceed with updating transaction
      transaction.status = 'Success';
      transaction.balance_after = payoutBalance - transaction.total_amount;
      await this.transactionRepository.save(transaction);
      console.log(`Payout transaction completed: ${transaction.transactionid}`);

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
      throw new HttpException(
        'Failed to complete NGN payout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getTransactions1(userId: string) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['wallet', 'wallet.transactions'],
      });

      if (!account) {
        throw new HttpException(
          'Account not found for user',
          HttpStatus.NOT_FOUND,
        );
      }

      if (!account.wallet) {
        console.warn(
          `Account ${account.id} (businessId: ${account.businessId}) has no wallet`,
        );
        return {
          message: 'No transactions available due to missing wallet',
          stats: {
            range: 'all time',
            currency: 'NGN',
            total_inflow_amount: 0,
            total_outflow_amount: 0,
            total_transaction_no: '0',
          },
          data: [],
        };
      }
      console.log('yes');
      console.log(account);
      const transactions = account.wallet.transactions
        .filter((tx) => tx.status !== 'CardPending')
        .map((tx) => ({
          ...tx,
          dated_ago: this.getTimeAgo(tx.dated),
          total_amount: parseFloat(tx.total_amount.toString()),
          settled_amount: parseFloat(tx.settled_amount.toString()),
          balance_before: parseFloat(tx.balance_before.toString()),
          balance_after: parseFloat(tx.balance_after.toString()),
        }));

      return {
        message: 'All transactions fetched successfully',
        stats: {
          range: 'all time',
          currency: 'NGN',
          total_inflow_amount: transactions
            .filter((tx) => tx.type === 'Inflow')
            .reduce((sum, tx) => sum + tx.total_amount, 0),
          total_outflow_amount: transactions
            .filter((tx) => tx.type === 'Outflow')
            .reduce((sum, tx) => sum + tx.total_amount, 0),
          total_transaction_no: transactions.length.toString(),
        },
        data: transactions,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get transactions error:', error);
      throw new HttpException(
        'Failed to retrieve transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTransactions2(accountId: string) {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
      if (!account.wallet) {
        console.warn(
          `Account ${account.id} (businessId: ${account.businessId}) has no wallet`,
        );
        return {
          message: 'No transactions available due to missing wallet',
          stats: {
            range: 'all time',
            currency: 'NGN',
            total_inflow_amount: 0,
            total_outflow_amount: 0,
            total_transaction_no: '0',
          },
          data: [],
        };
      }

      const transactions = account.wallet.transactions
        .filter((tx) => tx.status !== 'CardPending')
        .map((tx) => ({
          ...tx,
          dated_ago: this.getTimeAgo(tx.dated),
          total_amount: parseFloat(tx.total_amount.toString()),
          settled_amount: parseFloat(tx.settled_amount.toString()),
          balance_before: parseFloat(tx.balance_before.toString()),
          balance_after: parseFloat(tx.balance_after.toString()),
        }));

      return {
        message: 'All transactions fetched successfully',
        stats: {
          range: 'all time',
          currency: 'NGN', // Adjust if multi-currency
          total_inflow_amount: transactions
            .filter((tx) => tx.type === 'Inflow')
            .reduce((sum, tx) => sum + tx.total_amount, 0),
          total_outflow_amount: transactions
            .filter((tx) => tx.type === 'Outflow')
            .reduce((sum, tx) => sum + tx.total_amount, 0),
          total_transaction_no: transactions.length.toString(),
        },
        data: transactions,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get transactions error:', error);
      throw new HttpException(
        'Failed to retrieve transactions',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getTransactions(userId: string, filterDto: TransactionFilterDto) {
    const { startDate, endDate, status, type, currency } = filterDto;

    const account = await this.accountRepository.findOne({
      where: { user: { id: userId } },
      relations: ['wallet', 'wallet.transactions'],
    });

    if (!account || !account.wallet) {
      return {
        message: 'No transactions available',
        stats: {
          range: 'all time',
          currency: currency || 'NGN',
          total_inflow_amount: 0,
          total_outflow_amount: 0,
          total_transaction_no: '0',
        },
        data: [],
      };
    }

    let transactions = account.wallet.transactions;

    transactions = transactions.filter((tx) => tx.type !== 'CardPending');

    const start = startDate ? new Date(startDate) : new Date('2025-01-01');
    const end = endDate ? new Date(endDate) : new Date();
    transactions = transactions.filter(
      (tx) => tx.dated >= start && tx.dated <= end,
    );

    if (status?.length) {
      const statusSet = new Set(status.map((s) => s.toLowerCase()));
      transactions = transactions.filter((tx) =>
        statusSet.has(tx.status.toLowerCase()),
      );
    }
    //   if (status) {
    //   transactions = transactions.filter(tx => tx.status.toLowerCase() === status.toLowerCase());
    // }

    if (type) {
      transactions = transactions.filter((tx) => tx.type === type);
    }

    // if (type?.length) {
    //   const typeSet = new Set(type);
    //   transactions = transactions.filter(tx => tx.type === (typeSet.has('Inflow') ? 'Inflow' : 'Outflow'));
    // }

    if (currency) {
      transactions = transactions.filter(
        (tx) => tx.currency_settled?.toUpperCase() === currency.toUpperCase(),
      );
    }

    const mapped = transactions.map((tx) => ({
      ...tx,
      dated_ago: this.getTimeAgo(tx.dated),
      total_amount: parseFloat(tx.total_amount.toString()),
      settled_amount: parseFloat(tx.settled_amount.toString()),
      balance_before: parseFloat(tx.balance_before.toString()),
      balance_after: parseFloat(tx.balance_after.toString()),
    }));

    return {
      message: 'Filtered transactions fetched successfully',
      stats: {
        range: startDate && endDate ? `${startDate} to ${endDate}` : 'all time',
        currency: currency || 'NGN',
        total_inflow_amount: mapped
          .filter((tx) => tx.type === 'Inflow')
          .reduce((sum, tx) => sum + tx.total_amount, 0),
        total_outflow_amount: mapped
          .filter((tx) => tx.type === 'Outflow')
          .reduce((sum, tx) => sum + tx.total_amount, 0),
        total_transaction_no: mapped.length.toString(),
      },
      data: mapped,
    };
  }

  async getAccount(userId: string) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['wallet'], // ✅ Only include actual relations
      });

      if (!account) {
        throw new HttpException(
          'Account not found for user',
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        status: 200,
        message: 'Account retrieved successfully',
        data: {
          accountId: account.id,
          businessId: account.businessId,
          business_name: account.business_name,
          currency: account.currency,
          wallet: account.wallet
            ? {
                walletId: account.wallet.id,
                balances: account.wallet.balances, // ✅ This is a column, not a relation
              }
            : null,
        },
      };
    } catch (error) {
      console.error('Get account error:', error);
      throw error instanceof HttpException
        ? error
        : new HttpException(
            'Failed to retrieve account',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
    }
  }

  async getUserAccount(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['accounts'], // important to load accounts
    });

    if (!user || !user.accounts.length) {
      throw new HttpException(
        'No account found for this user',
        HttpStatus.NOT_FOUND,
      );
    }

    // Return the first account for simplicity
    return user.accounts[0];
  }
  async getUserInfo(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet'],
      });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

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
          // bizAddress: user.bizAddress,
          avatar: user.avatar,
          website: user.website,
          referral_code: user.referral_code,
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
      throw new HttpException(
        'Failed to retrieve user info',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createPaymentLink0(
    userId: string,
    createPaymentLinkDto: CreatePaymentLinkDto,
  ) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['paymentPages'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const accessCode = crypto.randomBytes(5).toString('hex');
      const paymentUrl = `https://dash-checkout.paywithflick.co/pages/${accessCode}`;

      const exchangeRate = await this.exchangeRateService.getExchangeRate(
        createPaymentLinkDto.currency_collected,
        createPaymentLinkDto.currency_settled,
      );

      const settledAmount =
        createPaymentLinkDto.currency_collected ===
        createPaymentLinkDto.currency_settled
          ? parseFloat(createPaymentLinkDto.amount)
          : Math.round(parseFloat(createPaymentLinkDto.amount) / exchangeRate);

      const paymentPage = this.paymentPageRepository.create({
        access_code: accessCode,
        paymentUrl,
        currency: createPaymentLinkDto.currency_collected,
        currency_collected: createPaymentLinkDto.currency_collected,
        exchange_rate: exchangeRate,
        settled_amount: settledAmount,
        amount: parseFloat(createPaymentLinkDto.amount),
        amountPayable: 1,
        payableAmountString: '₦1.00',
        payableFxAmountString: '₦1.00',
        rate: 1,
        currency_settled: createPaymentLinkDto.currency_settled,
        description: createPaymentLinkDto.description,
        productType: createPaymentLinkDto.product_type,
        account,
      });

      await this.paymentPageRepository.save(paymentPage);

      return {
        status: 200,
        message: 'link generated successfully',
        data: {
          access_code: accessCode,
          url: paymentUrl,
          currency: createPaymentLinkDto.currency_collected,
          currency_collected: createPaymentLinkDto.currency_collected,
          exchange_rate: exchangeRate,
          settled_amount: settledAmount,
          amount: parseFloat(createPaymentLinkDto.amount),
          amountPayable: 1, // Example static value, replace with dynamic logic
          payableAmountString: '₦1.00', // Example static value, replace with dynamic logic
          payableFxAmountString: '₦1.00', // Example static value, replace with dynamic logic
          rate: 1, // Example static value, replace with dynamic logic
          currency_settled: createPaymentLinkDto.currency_settled,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create payment link error:', error);
      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createPaymentLink1(
    userId: string,
    createPaymentLinkDto: CreatePaymentLinkDto,
  ) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['paymentPages'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const accessCode = crypto.randomBytes(5).toString('hex');
      const paymentUrl = `https://dash-checkout.paywithflick.co/pages/${accessCode}`;

      const exchangeRate = await this.exchangeRateService.getExchangeRate(
        createPaymentLinkDto.currency_collected,
        createPaymentLinkDto.currency_settled,
      );

      const settledAmount =
        createPaymentLinkDto.currency_collected ===
        createPaymentLinkDto.currency_settled
          ? parseFloat(createPaymentLinkDto.amount)
          : Math.round(parseFloat(createPaymentLinkDto.amount) / exchangeRate);

      const paymentPage = this.paymentPageRepository.create({
        access_code: accessCode,
        paymentUrl: paymentUrl,
        currency: createPaymentLinkDto.currency_collected,
        currency_collected: createPaymentLinkDto.currency_collected,
        exchange_rate: exchangeRate,
        settled_amount: settledAmount,
        amount: parseFloat(createPaymentLinkDto.amount),
        amountPayable: parseFloat(createPaymentLinkDto.amount),
        payableAmountString: `₦${parseFloat(createPaymentLinkDto.amount).toFixed(2)}`,
        payableFxAmountString: `$${(parseFloat(createPaymentLinkDto.amount) / exchangeRate).toFixed(2)}`,
        rate: exchangeRate,
        currency_settled: createPaymentLinkDto.currency_settled,
        description: createPaymentLinkDto.description,
        productType: createPaymentLinkDto.product_type,
        account: account,
        status: 'active',
        source: 'api',
        isFixedAmount: true,
        dated: new Date(),
        CustomerCode: account.merchantCode || 'DEFAULT_CODE',
      });

      await this.paymentPageRepository.save(paymentPage);

      return {
        status: 200,
        message: 'link generated successfully',
        data: {
          access_code: accessCode,
          url: paymentUrl,
          currency: createPaymentLinkDto.currency_collected,
          currency_collected: createPaymentLinkDto.currency_collected,
          exchange_rate: exchangeRate,
          settled_amount: settledAmount,
          amount: parseFloat(createPaymentLinkDto.amount),
          amountPayable: parseFloat(createPaymentLinkDto.amount),
          payableAmountString: `₦${parseFloat(createPaymentLinkDto.amount).toFixed(2)}`,
          payableFxAmountString: `$${(parseFloat(createPaymentLinkDto.amount) / exchangeRate).toFixed(2)}`,
          rate: exchangeRate,
          currency_settled: createPaymentLinkDto.currency_settled,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create payment link error:', error);
      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async createPaymentLink2(
    userId: string,
    createPaymentLinkDto: CreatePaymentLinkDto,
  ) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['paymentPages'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const accessCode = crypto.randomBytes(5).toString('hex');
      const paymentUrl = `https://dash-checkout.paywithflick.co/pages/${accessCode}`;

      let exchangeRate = 1;
      let settledAmount = parseFloat(createPaymentLinkDto.amount);

      // Only get exchange rate if currencies are different
      if (
        createPaymentLinkDto.currency_collected !==
        createPaymentLinkDto.currency_settled
      ) {
        exchangeRate = await this.exchangeRateService.getExchangeRate(
          createPaymentLinkDto.currency_collected,
          createPaymentLinkDto.currency_settled,
        );
        settledAmount = Math.round(
          parseFloat(createPaymentLinkDto.amount) / exchangeRate,
        );
      }

      const amount = parseFloat(createPaymentLinkDto.amount);

      const paymentPage = this.paymentPageRepository.create({
        access_code: accessCode,
        paymentUrl: paymentUrl,
        currency: createPaymentLinkDto.currency_collected,
        currency_collected: createPaymentLinkDto.currency_collected,
        exchange_rate: exchangeRate,
        settled_amount: settledAmount,
        amount: amount,
        amountPayable: amount,
        payableAmountString: `${amount.toFixed(2)}`,
        payableFxAmountString: `${settledAmount.toFixed(2)}`,
        rate: exchangeRate,
        currency_settled: createPaymentLinkDto.currency_settled,
        description: createPaymentLinkDto.description,
        productType: createPaymentLinkDto.product_type,
        account: account,
        status: 'active',
        source: 'api',
        isFixedAmount: true,
        dated: new Date(),
        CustomerCode: account.merchantCode || 'DEFAULT_CODE',
      });

      await this.paymentPageRepository.save(paymentPage);

      return {
        status: 200,
        message: 'link generated successfully',
        data: {
          access_code: accessCode,
          url: paymentUrl,
          currency: createPaymentLinkDto.currency_collected,
          currency_collected: createPaymentLinkDto.currency_collected,
          exchange_rate: exchangeRate,
          settled_amount: settledAmount,
          amount: amount,
          amountPayable: amount,
          payableAmountString: `${amount.toFixed(2)}`,
          payableFxAmountString: `${settledAmount.toFixed(2)}`,
          rate: exchangeRate,
          currency_settled: createPaymentLinkDto.currency_settled,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create payment link error:', error);
      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async createPaymentLink(
    userId: string,
    createPaymentLinkDto: CreatePaymentLinkDto,
  ) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['paymentPages'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      if (
        !this.exchangeRateService.isCurrencyPairSupported(
          createPaymentLinkDto.currency_collected,
          createPaymentLinkDto.currency_settled,
        )
      ) {
        throw new HttpException(
          'Unsupported currency pair',
          HttpStatus.BAD_REQUEST,
        );
      }

      const accessCode = crypto.randomBytes(5).toString('hex');
      const paymentUrl = `https://checkout.global.paywithflick.co/pages/${accessCode}`;

      let exchangeRate = 1;
      let settledAmount = parseFloat(createPaymentLinkDto.amount);

      // Only get exchange rate and calculate if currencies are different
      if (
        createPaymentLinkDto.currency_collected !==
        createPaymentLinkDto.currency_settled
      ) {
        exchangeRate = await this.exchangeRateService.getExchangeRate(
          createPaymentLinkDto.currency_collected,
          createPaymentLinkDto.currency_settled,
        );

        // Simple conversion: amount * exchange rate
        settledAmount = parseFloat(createPaymentLinkDto.amount) * exchangeRate;
        settledAmount = Math.round(settledAmount * 100) / 100; // Round to 2 decimal places
      }

      const amount = parseFloat(createPaymentLinkDto.amount);

      const paymentPage = this.paymentPageRepository.create({
        access_code: accessCode,
        paymentUrl: paymentUrl,
        currency: createPaymentLinkDto.currency_collected,
        currency_collected: createPaymentLinkDto.currency_collected,
        exchange_rate: exchangeRate,
        settled_amount: settledAmount,
        amount: amount,
        amountPayable: amount,
        payableAmountString: `${amount.toFixed(2)}`,
        payableFxAmountString: `${settledAmount.toFixed(2)}`,
        rate: exchangeRate,
        currency_settled: createPaymentLinkDto.currency_settled,
        description: createPaymentLinkDto.description,
        productType: createPaymentLinkDto.product_type,
        account: account,
        status: 'active',
        source: 'api',
        isFixedAmount: true,
        dated: new Date(),
        CustomerCode: account.merchantCode || 'DEFAULT_CODE',
      });

      await this.paymentPageRepository.save(paymentPage);

      return {
        statusCode: 200,
        status: 'success',
        message: 'link generated successfully',
        data: {
          access_code: accessCode,
          url: paymentUrl,
          currency: createPaymentLinkDto.currency_collected,
          currency_collected: createPaymentLinkDto.currency_collected,
          exchange_rate: exchangeRate,
          settled_amount: settledAmount,
          amount: amount,
          amountPayable: amount,
          payableAmountString: `${amount.toFixed(2)}`,
          payableFxAmountString: `${settledAmount.toFixed(2)}`,
          rate: exchangeRate,
          currency_settled: createPaymentLinkDto.currency_settled,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create payment link error:', error);
      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getPaymentLinks(userId: string) {
    try {
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        relations: ['paymentPages'],
      });
      if (!account)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const paymentPages = await this.paymentPageRepository.find({
        where: { account: { id: account.id } },
      });

      return {
        status: 200,
        data: paymentPages.map((page) => ({
          pageName: page.pageName,
          checkout_settings: page.checkout_settings,
          productType: page.productType,
          currency_collected: page.currency_collected,
          currency: page.currency,
          access_code: page.access_code,
          status: page.status,
          source: page.source,
          isFixedAmount: page.isFixedAmount,
          paymentUrl: page.paymentUrl,
          currency_settled: page.currency_settled,
          successmsg: page.successmsg,
          customLink: page.customLink,
          dated: page.dated,
          amount: page.amount,
          redirectLink: page.redirectLink,
          CustomerCode: page.CustomerCode,
          description: page.description,
          custompaymentUrl: page.custompaymentUrl,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get payment links error:', error);
      throw new HttpException(
        'Failed to retrieve payment links',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentPages0(accountId: string) {
    try {
      const paymentPages =
        await this.paymentPageRepository.findByAccountId(accountId);
      if (!paymentPages.length)
        throw new HttpException('No payment pages found', HttpStatus.NOT_FOUND);

      return { data: paymentPages };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get payment pages error:', error);
      throw new HttpException(
        'Failed to retrieve payment pages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getPaymentPagesByUser(userId: string) {
    // 1. Get user's account
    const account = await this.getUserAccount(userId);

    // 2. Get payment pages for that account
    const paymentPages = await this.paymentPageRepository.find({
      where: { account: { id: account.id } },
      relations: ['account'],
    });

    if (!paymentPages.length) {
      throw new HttpException('No payment pages found', HttpStatus.NOT_FOUND);
    }

    return { data: paymentPages };
  }

  //   async fundPayoutBalance(userId: string, fundDto: FundPayoutBalanceDto) {
  //   try {
  //     const account = await this.accountRepository.findOne({ where: { id: fundDto.accountId }, relations: ['wallet'] });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     const wallet = account.wallet;
  //     if (!wallet) throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);

  //       const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     const transactionId = `Flick-${crypto.randomUUID()}`;
  //     let transaction;

  //     if (fundDto.method === 'bank_transfer') {
  //        if (!fundDto.bankCode || !fundDto.bankName || !fundDto.accountNumber) {
  //         throw new HttpException('Bank details required for bank transfer', HttpStatus.BAD_REQUEST);
  //       }
  //       const nuban = await this.nubanCreateMerchant(userId,
  //        {
  //         accountId: fundDto.accountId,
  //         bankCode: fundDto.bankCode,
  //         bankName: fundDto.bankName,
  //         accountNumber: fundDto.accountNumber,
  //       }
  //     );

  //       const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
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

  //         balance_before: balance,
  //         balance_after: balance + fundDto.amount,
  //         // balance_before: wallet.balances[0].payout_balance,
  //         // balance_after: wallet.balances[0].payout_balance + fundDto.amount,
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
  //       const cardDetails = new CardDetailsDto();
  //       cardDetails.cardNumber = fundDto.cardNumber;
  //       cardDetails.cvv = fundDto.cvv;
  //       cardDetails.cardDate = fundDto.cardDate;
  //       cardDetails.cardName = fundDto.cardName;
  //       cardDetails.amount = fundDto.amount;

  //       const errors = await validate(cardDetails);
  //       if (errors.length > 0) {
  //         throw new HttpException(errors[0].constraints[Object.keys(errors[0].constraints)[0]], HttpStatus.BAD_REQUEST);
  //       }

  //       const paymentType = this.encryptionUtil.determinePaymentType(fundDto.cardNumber);
  //       if (!paymentType) throw new HttpException('Invalid card number use unsupported card', HttpStatus.BAD_REQUEST);

  //       const cardDetailsString = `${fundDto.cardNumber.replace(/\s+/g, '')}|${fundDto.cvv}|${fundDto.cardDate}|${fundDto.cardName.replace(/\s+/g, '')}|${transactionId}|${fundDto.amount}`;
  //       console.log(`Card details before encryption: ${cardDetailsString}`);
  //       const encryptedCardDetails = this.encryptionUtil.encrypter(cardDetailsString);
  //       if (!encryptedCardDetails) throw new HttpException('Incorrect input format', HttpStatus.INTERNAL_SERVER_ERROR);
  //        const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
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

  //         balance_before: balance,
  //         balance_after: balance + fundDto.amount,
  //         // balance_before: wallet.balances[0].payout_balance,
  //         // balance_after: wallet.balances[0].payout_balance + fundDto.amount,
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
  //     } else if (fundDto.method === 'payout_balance') {
  //       if (wallet.balances[0].payout_balance < fundDto.amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

  //        return { message: 'Coming Soon' };

  //         // const balance = wallet.balances.find(b => b.currency === 'NGN')?.payout_balance || 0;
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
  //     //  balance_before: balance,
  //         // balance_after: balance,
  //       //   channel: 'payout_balance',
  //       //   beneficiary_bank: null,
  //       //   email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       //   wallet,
  //       // });
  //       // await this.transactionRepository.save(transaction);
  //       // return { message: 'Payout balance funded successfully' };
  //     } else {
  //       throw new HttpException('Invalid funding method', HttpStatus.BAD_REQUEST);
  //     }
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Fund payout balance error:', error);
  //     throw new HttpException('Failed to fund payout balance', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

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
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet'],
      });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const businesses = user.accounts.map((account) => ({
        lowLimit: 300,
        business_Id: account.id,
        isVulaUser: account.isVulaUser,
        checkout_settings: account.checkout_settings,
        avatar:
          user.avatar ||
          'https://qrabaebwebhookbucket.s3.amazonaws.com/nuTtkNMbSnPZiWJ-GT3SF%2Fjulius-image.png',
        vc_code: `CUS_${crypto.randomBytes(8).toString('hex')}`,
        is_data: true,
        clonedMerchCode:
          account.superMerchantCode ||
          `CUS_${crypto.randomBytes(8).toString('hex')}`,
        supportEmail: user.supportEmail || ' ',
        email: user.email,
        country: user.country,
        name: user.name,
        bizClass: 'sub_business',
        alias: ' ',
        // bizAddress: user.bizAddress,
        password: '',
        token: '',
        business_type: account.business_type,
        is_identity_only: account.is_identity_only,
        is_regular: account.is_regular,
        id: account.businessId,
        phone: user.phone,
        is_otc: account.is_otc,
        business_email: user.email,
        is_payment: true,
        business_name: account.business_name,
        website: user.website,
        is_portco: account.is_portco,
        businessId: account.businessId,
        total_whitelabelling: true,
        FPR: account.FPR,
        superMerchantCode:
          account.superMerchantCode ||
          `CUS_${crypto.randomBytes(8).toString('hex')}`,
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
      throw new HttpException(
        'Failed to retrieve businesses',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // async initiateNGNPayout(userId: string, payoutDto: NGNPayoutDto) {
  //   try {
  //     const { amount, account_number, bank_code, beneficiary_name, currency, narration, accountId } = payoutDto;

  //     const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet'] });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     const wallet = account.wallet;
  //     if (!wallet) {
  //       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
  //       throw new HttpException('Cannot initiate payout: Account has no wallet', HttpStatus.BAD_REQUEST);
  //     }

  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     const bank = await this.bankRepository.findOne({ where: { bank_code: bank_code } });
  //     if (!bank) throw new HttpException('Invalid bank code', HttpStatus.BAD_REQUEST);

  //     const amountNum = parseFloat(amount);
  //     if (isNaN(amountNum) || amountNum <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

  //     const balance = wallet.balances.find(b => b.currency === currency)?.payout_balance || 0;
  //     if (balance < amountNum) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

  //     const payoutId = `Flick-${crypto.randomBytes(5).toString('hex')}`;
  //     const otp = crypto.randomInt(100000, 999999).toString();
  //     const otpExpiresAt = this.getOtpExpiry();

  //     // Store OTP in user entity (or a separate table if preferred)
  //     await this.userRepository.updateUser(user.id, {
  //       payoutOtp: otp,
  //       payoutOtpExpiresAt: otpExpiresAt,
  //       pendingPayoutId: payoutId,
  //     });

  //     // Create pending transaction
  //     const transaction = this.transactionRepository.create({
  //       eventname: 'Payout',
  //       transtype: 'debit',
  //       total_amount: amountNum,
  //       settled_amount: amountNum,
  //       fee_charged: 0,
  //       currency_settled: currency,
  //       dated: new Date(),
  //       status: 'pending',
  //       initiator: user.email,
  //       type: 'Outflow',
  //       transactionid: payoutId,
  //       narration: narration,
  //       balance_before: balance,
  //       balance_after: balance,
  //       channel: 'bank_transfer',
  //       beneficiary_bank: bank.bank_name,
  //       email: user.email,
  //       wallet,
  //     });
  //     await this.transactionRepository.save(transaction);
  //     console.log(`Payout transaction initiated: ${transaction.transactionid} for ${currency}`);

  //     // Send OTP to email and phone
  //     await this.emailService.sendPayoutOtp(user.email, otp, {
  //       amount: amountNum,
  //       beneficiary_name,
  //       bank_name: bank.bank_name,
  //       account_number,
  //     });

  //     return {
  //       status: 200,
  //       Id: payoutId,
  //       email: user.email,
  //       phone: user.phone,
  //       bank_name: bank.bank_name,
  //       message: 'Please enter the otp sent to your registered mobile number or email',
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Initiate NGN payout error:', error);
  //     throw new HttpException('Failed to initiate NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // async completeNGNPayout(userId: string, completeDto: USDCompletePayoutDto) {
  //   try {
  //     const { Id, token } = completeDto;

  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     if (user.payoutOtp !== token || !user.payoutOtpExpiresAt || user.payoutOtpExpiresAt < new Date() || user.pendingPayoutId !== Id) {
  //       throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
  //     }

  //     const transaction = await this.transactionRepository.findOne({ where: { transactionid: Id, wallet: { account: { users: { id: userId } } } }, relations: ['wallet'] });
  //     if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

  //     const wallet = transaction.wallet;
  //     const balance = wallet.balances.find(b => b.currency === transaction.currency_settled);
  //     if (!balance) throw new HttpException('Currency balance not found', HttpStatus.BAD_REQUEST);

  //     if (balance.payout_balance < transaction.total_amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

  //     // Update wallet balance
  //     balance.payout_balance -= transaction.total_amount;
  //     await this.walletRepository.save(wallet);
  //     console.log(`Wallet updated: ${wallet.id}, new ${transaction.currency_settled} balance: ${balance.payout_balance}`);

  //     // Update transaction status
  //     transaction.status = 'completed';
  //     transaction.balance_after = balance.payout_balance;
  //     await this.transactionRepository.save(transaction);
  //     console.log(`Payout transaction completed: ${transaction.transactionid}`);

  //     // Clear OTP
  //     await this.userRepository.updateUser(user.id, {
  //       payoutOtp: null,
  //       payoutOtpExpiresAt: null,
  //       pendingPayoutId: null,
  //     });

  //     return {
  //       status: 200,
  //       Id,
  //       message: 'Payout queued successfully',
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Complete NGN payout error:', error);
  //     throw new HttpException('Failed to complete NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

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

  // async initiateUSDPayout1(userId: string, payoutDto: USDPayoutDto) {
  //   try {
  //     const account = await this.accountRepository.findOne({
  //       where: { id: payoutDto.accountId, users: { id: userId } },
  //       relations: ['wallet', 'wallet.transactions'],
  //     });
  //     if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

  //     if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

  //     const beneficiary = await this.beneficiaryRepository.findOne({
  //       where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
  //     });
  //     if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);
  //     console.log("2")
  //     const currency = payoutDto.currency; // USD, GBP, or EUR
  //     const amount = parseFloat(payoutDto.amount.toString());
  //     if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
  //     console.log("3")

  //     // Fetch exchange rate
  //     const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
  //     const ngnAmount = amount * exchangeRate;
  //     const feeCharged = amount * 0.25; // 25% fee as per example
  //     const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
  //     console.log("4")

  //     // Check NGN balance
  //     const wallet = account.wallet;
  //     const ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
  //     console.log("5", ngnBalance)

  //     if (!ngnBalance || ngnBalance.payout_balance < totalNgnAmount) {
  //       throw new HttpException('Insufficient NGN balance', HttpStatus.BAD_REQUEST);
  //     }

  //     // Update NGN balance
  //     ngnBalance.payout_balance -= totalNgnAmount;
  //     console.log("6")

  //     await this.walletRepository.save(wallet);

  //     // Update or create target currency balance
  //     let targetBalance = wallet.balances.find(b => b.currency === currency);
  //     console.log("7")

  //     if (!targetBalance) {
  //       targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //       wallet.balances.push(targetBalance);
  //     }
  //     targetBalance.payout_balance -= amount + feeCharged;
  //     console.log("8")

  //     await this.walletRepository.save(wallet);

  //     // Create transaction
  //     const transactionId = `ex-${crypto.randomUUID()}`;
  //     const transaction = this.transactionRepository.create({
  //       eventname: `Payout to ${currency}`,
  //       transtype: 'debit',
  //       total_amount: totalNgnAmount,
  //       settled_amount: amount,
  //       fee_charged: feeCharged,
  //       currency_settled: currency,
  //       dated: new Date(),
  //       status: 'initiated',
  //       initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       type: 'Outflow',
  //       transactionid: transactionId,
  //       narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
  //       balance_before: ngnBalance.payout_balance + totalNgnAmount,
  //       balance_after: ngnBalance.payout_balance,
  //       channel: beneficiary.transfer_type,
  //       beneficiary_bank: beneficiary.bank_name,
  //       email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       wallet,
  //     });
  //     console.log("9")

  //     await this.transactionRepository.save(transaction);
  //     console.log("10")

  //     return {
  //       status: 200,
  //       message: 'Payout queued successfully',
  //       transaction_status: 'initiated',
  //       meta: {
  //         Id: transactionId,
  //         debit_currency: 'NGN',
  //         amount: amount.toString(),
  //         credit_currency: currency,
  //         fee_charged: feeCharged,
  //         total_amount: amount + feeCharged,
  //         dated: transaction.dated.toISOString(),
  //         beneficiary_id: beneficiary.beneficiary_id,
  //         bank_name: beneficiary.bank_name,
  //         account_no: beneficiary.account_no,
  //         sort_code: beneficiary.routing,
  //       },
  //     };
  //   } catch (error) {
  //     console.error('Initiate payout error:', error);
  //       if (error instanceof HttpException) {
  //     throw error; }
  //     throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  // async initiateUSDPayout2(userId: string, payoutDto: USDPayoutDto) {
  //   try {
  //     const account = await this.accountRepository.findOne({
  //       where: { id: payoutDto.accountId, users: { id: userId } },
  //       relations: ['wallet', 'wallet.balances'],
  //     });

  //     if (!account || !account.wallet) {
  //       throw new HttpException('Account or wallet not found', HttpStatus.NOT_FOUND);
  //     }

  //     const wallet = account.wallet;

  //     const balancesByCurrency = {};
  //     wallet.balances.forEach(balance => {
  //       balancesByCurrency[balance.currency] = balance;
  //     });

  //     const ngnBalance = balancesByCurrency['NGN'];
  //     if (!ngnBalance) {
  //       throw new HttpException('NGN balance not found', HttpStatus.BAD_REQUEST);
  //     }

  //     const currency = payoutDto.currency; // e.g. 'USD'
  //     const amount = parseFloat(payoutDto.amount.toString());
  //     if (isNaN(amount) || amount <= 0) {
  //       throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
  //     }

  //     const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
  //     const ngnAmount = amount * exchangeRate;
  //     const feeCharged = amount * 0.25; // 25% fee
  //     const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;

  //     if (ngnBalance.payout_balance < totalNgnAmount) {
  //       throw new HttpException('Insufficient NGN balance', HttpStatus.BAD_REQUEST);
  //     }

  //     // Deduct NGN
  //     const balanceBefore = ngnBalance.payout_balance;
  //     ngnBalance.payout_balance -= totalNgnAmount;
  //     await this.walletRepository.save(wallet);

  //     // Update target currency balance (e.g. USD)
  //     let targetBalance = balancesByCurrency[currency];
  //     if (!targetBalance) {
  //       targetBalance = {
  //         currency,
  //         api_balance: 0,
  //         collection_balance: 0,
  //         payout_balance: 0,
  //         wallet,
  //       };
  //       wallet.balances.push(targetBalance);
  //     }

  //     targetBalance.payout_balance -= amount + feeCharged;
  //     await this.walletRepository.save(wallet);

  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     const beneficiary = await this.beneficiaryRepository.findOne({
  //       where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
  //     });
  //     if (!beneficiary) {
  //       throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);
  //     }

  //     const transactionId = `ex-${crypto.randomUUID()}`;
  //     const transaction = this.transactionRepository.create({
  //       eventname: `Payout to ${currency}`,
  //       transtype: 'debit',
  //       total_amount: totalNgnAmount,
  //       settled_amount: amount,
  //       fee_charged: feeCharged,
  //       currency_settled: currency,
  //       dated: new Date(),
  //       status: 'initiated',
  //       initiator: user.email,
  //       type: 'Outflow',
  //       transactionid: transactionId,
  //       narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
  //       balance_before: balanceBefore,
  //       balance_after: ngnBalance.payout_balance,
  //       channel: beneficiary.transfer_type,
  //       beneficiary_bank: beneficiary.bank_name,
  //       email: user.email,
  //       wallet,
  //     });

  //     await this.transactionRepository.save(transaction);

  //     return {
  //       status: 200,
  //       message: 'Payout queued successfully',
  //       transaction_status: 'initiated',
  //       meta: {
  //         Id: transactionId,
  //         debit_currency: 'NGN',
  //         amount: amount.toString(),
  //         credit_currency: currency,
  //         fee_charged: feeCharged,
  //         total_amount: amount + feeCharged,
  //         dated: transaction.dated.toISOString(),
  //         beneficiary_id: beneficiary.beneficiary_id,
  //         bank_name: beneficiary.bank_name,
  //         account_no: beneficiary.account_no,
  //         sort_code: beneficiary.routing,
  //       },
  //     };
  //   } catch (error) {
  //     console.error('Initiate payout error:', error);
  //     if (error instanceof HttpException) throw error;
  //     throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  //   async initiateUSDPayout3(userId: string, payoutDto: USDPayoutDto) {
  //     try {
  //       console.log('1: Fetching account for userId:', userId, 'accountId:', payoutDto.accountId);
  //       const account = await this.accountRepository.findOne({
  //         where: { id: payoutDto.accountId, users: { id: userId } },
  //         relations: ['wallet', 'wallet.transactions'],
  //       });
  //       if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

  //       if (!account.account_no) {
  //         throw new HttpException('Account has no associated account number', HttpStatus.BAD_REQUEST);
  //       }

  //       if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

  //       console.log('2: Fetching beneficiary:', payoutDto.beneficiary_id);
  //       const beneficiary = await this.beneficiaryRepository.findOne({
  //         where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
  //       });
  //       if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);

  //       const currency = payoutDto.currency;
  //       const amount = parseFloat(payoutDto.amount.toString());
  //       console.log('3: Parsed amount:', amount, 'currency:', currency);
  //       if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

  //       console.log('4: Fetching exchange rate for NGN/', currency);
  //       const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
  //       const ngnAmount = amount * exchangeRate;
  //       const feeCharged = amount * 0.25;
  //       const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
  //       console.log('5: Calculated NGN amount:', ngnAmount, 'fee:', feeCharged, 'total:', totalNgnAmount);

  //       const wallet = account.wallet;
  //       let ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
  //       console.log('6: NGN balance:', ngnBalance);

  //       if (!ngnBalance) {
  //         console.log('7: Initializing NGN balance');
  //         ngnBalance = { currency: 'NGN', api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //         wallet.balances.push(ngnBalance);
  //         await this.walletRepository.save(wallet);
  //       }

  //       if (ngnBalance.payout_balance < totalNgnAmount) {
  //         console.log('8: Insufficient balance - required:', totalNgnAmount, 'available:', ngnBalance.payout_balance);
  //         throw new HttpException(
  //           `Insufficient NGN balance: need ${totalNgnAmount.toFixed(2)} NGN, have ${ngnBalance.payout_balance.toFixed(2)} NGN`,
  //           HttpStatus.BAD_REQUEST
  //         );
  //       }

  //       console.log('9: Updating NGN balance');
  //       ngnBalance.payout_balance -= totalNgnAmount;
  //       await this.walletRepository.save(wallet);

  //       console.log('10: Updating target currency balance');
  //       let targetBalance = wallet.balances.find(b => b.currency === currency);
  //       if (!targetBalance) {
  //         targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //         wallet.balances.push(targetBalance);
  //       }
  //       targetBalance.payout_balance -= amount + feeCharged;
  //       await this.walletRepository.save(wallet);

  //       console.log('11: Creating transaction');
  //       const transactionId = `ex-${crypto.randomUUID()}`;
  //       const user = await this.userRepository.findOne({ where: { id: userId } });
  //       const transaction = this.transactionRepository.create({
  //         eventname: `Payout to ${currency}`,
  //         transtype: 'debit',
  //         total_amount: totalNgnAmount,
  //         settled_amount: amount,
  //         fee_charged: feeCharged,
  //         currency_settled: currency,
  //         dated: new Date(),
  //         status: 'initiated',
  //         initiator: user.email,
  //         type: 'Outflow',
  //         transactionid: transactionId,
  //         narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
  //         balance_before: ngnBalance.payout_balance + totalNgnAmount,
  //         balance_after: ngnBalance.payout_balance,
  //         channel: beneficiary.transfer_type,
  //         beneficiary_bank: beneficiary.bank_name,
  //         email: user.email,
  //         wallet,
  //       });

  //       console.log('12: Saving transaction');
  //       await this.transactionRepository.save(transaction);

  //       console.log('13: Payout successful');
  //       return {
  //         status: 200,
  //         message: 'Payout queued successfully',
  //         transaction_status: 'initiated',
  //         meta: {
  //           Id: transactionId,
  //           debit_currency: 'NGN',
  //           amount: amount.toString(),
  //           credit_currency: currency,
  //           fee_charged: feeCharged,
  //           total_amount: amount + feeCharged,
  //           dated: transaction.dated.toISOString(),
  //           beneficiary_id: beneficiary.beneficiary_id,
  //           bank_name: beneficiary.bank_name,
  //           account_no: beneficiary.account_no,
  //           sort_code: beneficiary.routing,
  //         },
  //       };
  //     } catch (error) {
  //       console.error('Initiate payout error:', error);
  //       if (error instanceof HttpException) {
  //         throw error;
  //       }
  //       throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //    async initiateUSDPayout4(userId: string, payoutDto: USDPayoutDto) {
  //     try {
  //       console.log('1: Fetching account for userId:', userId, 'accountId:', payoutDto.accountId);
  //       const account = await this.accountRepository.findOne({
  //         where: { id: payoutDto.accountId, users: { id: userId } },
  //         relations: ['wallet', 'wallet.transactions'],
  //       });
  //       if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

  //       if (!account.account_no) {
  //         throw new HttpException('Account has no associated account number', HttpStatus.BAD_REQUEST);
  //       }

  //       if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

  //       console.log('2: Fetching beneficiary:', payoutDto.beneficiary_id);
  //       const beneficiary = await this.beneficiaryRepository.findOne({
  //         where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
  //       });
  //       if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);

  //       const currency = payoutDto.currency;
  //       const amount = parseFloat(payoutDto.amount.toString());
  //       console.log('3: Parsed amount:', amount, 'currency:', currency);
  //       if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

  //       console.log('4: Fetching exchange rate for NGN/', currency);
  //       const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
  //       const ngnAmount = amount * exchangeRate;
  //       const feeCharged = amount * 0.25;
  //       const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
  //       console.log('5: Calculated NGN amount:', ngnAmount, 'fee:', feeCharged, 'total:', totalNgnAmount);

  //       const wallet = account.wallet;
  //       let ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
  //       console.log('6: NGN balance:', ngnBalance);

  //       if (!ngnBalance) {
  //         console.log('7: Initializing NGN balance');
  //         ngnBalance = { currency: 'NGN', api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //         wallet.balances.push(ngnBalance);
  //         await this.walletRepository.save(wallet);
  //       }

  //       if (ngnBalance.payout_balance < totalNgnAmount) {
  //         console.log('8: Insufficient balance - required:', totalNgnAmount, 'available:', ngnBalance.payout_balance);
  //         throw new HttpException(
  //           `Insufficient NGN balance: need ${totalNgnAmount.toFixed(2)} NGN, have ${ngnBalance.payout_balance.toFixed(2)} NGN`,
  //           HttpStatus.BAD_REQUEST
  //         );
  //       }

  //       console.log('9: Updating NGN balance');
  //       ngnBalance.payout_balance -= totalNgnAmount;
  //       await this.walletRepository.save(wallet);

  //       console.log('10: Updating target currency balance');
  //       let targetBalance = wallet.balances.find(b => b.currency === currency);
  //       if (!targetBalance) {
  //         targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //         wallet.balances.push(targetBalance);
  //       }
  //       targetBalance.payout_balance -= amount + feeCharged;
  //       await this.walletRepository.save(wallet);

  //       console.log('11: Creating transaction');
  //       const transactionId = `ex-${crypto.randomUUID()}`;
  //       const user = await this.userRepository.findOne({ where: { id: userId } });
  //       const transaction = this.transactionRepository.create({
  //         eventname: `Payout to ${currency}`,
  //         transtype: 'debit',
  //         total_amount: totalNgnAmount,
  //         settled_amount: amount,
  //         fee_charged: feeCharged,
  //         currency_settled: currency,
  //         dated: new Date(),
  //         status: 'initiated',
  //         initiator: user.email,
  //         type: 'Outflow',
  //         transactionid: transactionId,
  //         narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
  //         balance_before: ngnBalance.payout_balance + totalNgnAmount,
  //         balance_after: ngnBalance.payout_balance,
  //         channel: beneficiary.transfer_type,
  //         beneficiary_bank: beneficiary.bank_name,
  //         email: user.email,
  //         wallet,
  //       });

  //       console.log('12: Saving transaction');
  //       await this.transactionRepository.save(transaction);

  //       console.log('13: Payout successful');
  //       return {
  //         status: 200,
  //         message: 'Payout queued successfully',
  //         transaction_status: 'initiated',
  //         meta: {
  //           Id: transactionId,
  //           debit_currency: 'NGN',
  //           amount: amount.toString(),
  //           credit_currency: currency,
  //           fee_charged: feeCharged,
  //           total_amount: amount + feeCharged,
  //           dated: transaction.dated.toISOString(),
  //           beneficiary_id: beneficiary.beneficiary_id,
  //           bank_name: beneficiary.bank_name,
  //           account_no: beneficiary.account_no,
  //           sort_code: beneficiary.routing,
  //         },
  //       };
  //     } catch (error) {
  //       console.error('Initiate payout error:', error);
  //       if (error instanceof HttpException) {
  //         throw error;
  //       }
  //       throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  //    async initiateUSDPayout5(userId: string, payoutDto: USDPayoutDto) {
  //     try {
  //       console.log('1: Fetching account for userId:', userId, 'accountId:', payoutDto.accountId);
  //       if (!userId) throw new HttpException('User ID is undefined', HttpStatus.UNAUTHORIZED);

  //       const account = await this.accountRepository.findOne({
  //         where: { id: payoutDto.accountId, users: { id: userId } },
  //         relations: ['wallet', 'wallet.transactions'],
  //       });
  //       if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

  //       if (!account.account_no) {
  //         throw new HttpException('Account has no associated account number', HttpStatus.BAD_REQUEST);
  //       }

  //       if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

  //       console.log('2: Fetching beneficiary:', payoutDto.beneficiary_id);
  //       const beneficiary = await this.beneficiaryRepository.findOne({
  //         where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
  //       });
  //       if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);

  //       const currency = payoutDto.currency;
  //       const amount = parseFloat(payoutDto.amount.toString());
  //       console.log('3: Parsed amount:', amount, 'currency:', currency);
  //       if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

  //       console.log('4: Fetching exchange rate for NGN/', currency);
  //       const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
  //       const ngnAmount = amount * exchangeRate;
  //       const feeCharged = amount * 0.25;
  //       const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
  //       console.log('5: Calculated NGN amount:', ngnAmount, 'fee:', feeCharged, 'total:', totalNgnAmount);

  //       const wallet = account.wallet;
  //       console.log('6: Wallet ID:', wallet.id, 'Balances:', JSON.stringify(wallet.balances));
  //       const ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
  //       console.log('7: NGN balance:', ngnBalance);

  //       // if (!ngnBalance) {
  //       //   console.log('8: Initializing NGN balance');
  //       //   ngnBalance = {
  //       //     currency: 'NGN',
  //       //     api_balance: 0,
  //       //     payout_balance: 5000000, // Initialize like addBusiness
  //       //     collection_balance: 0, // Match addBusiness logic
  //       //   };
  //       //   wallet.balances.push(ngnBalance);
  //       //   await this.walletRepository.save(wallet);
  //       // }

  //       if (ngnBalance.payout_balance < totalNgnAmount) {
  //         console.log('9: Insufficient balance - required:', totalNgnAmount, 'available:', ngnBalance.payout_balance);
  //         throw new HttpException(
  //           `Insufficient NGN balance: need ${totalNgnAmount.toFixed(2)} NGN, have ${ngnBalance.payout_balance.toFixed(2)} NGN`,
  //           HttpStatus.BAD_REQUEST
  //         );
  //       }

  //       console.log('10: Updating NGN balance');
  //       ngnBalance.payout_balance -= totalNgnAmount;
  //       // collection_balance remains unchanged, as in getbalance logic
  //       await this.walletRepository.save(wallet);

  //       console.log('11: Updating target currency balance');
  //       let targetBalance = wallet.balances.find(b => b.currency === currency);
  //       if (!targetBalance) {
  //         targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
  //         wallet.balances.push(targetBalance);
  //       }
  //       targetBalance.payout_balance -= amount + feeCharged;
  //       // collection_balance for target currency unchanged
  //       await this.walletRepository.save(wallet);

  //       console.log('12: Creating transaction');
  //       const transactionId = `ex-${crypto.randomUUID()}`;
  //       const user = await this.userRepository.findOne({ where: { id: userId } });
  //       const transaction = this.transactionRepository.create({
  //         eventname: `Payout to ${currency}`,
  //         transtype: 'debit',
  //         total_amount: totalNgnAmount,
  //         settled_amount: amount,
  //         fee_charged: feeCharged,
  //         currency_settled: currency,
  //         dated: new Date(),
  //         status: 'initiated',
  //         initiator: user.email,
  //         type: 'Outflow',
  //         transactionid: transactionId,
  //         narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
  //         balance_before: ngnBalance.payout_balance + totalNgnAmount,
  //         balance_after: ngnBalance.payout_balance,
  //         channel: beneficiary.transfer_type,
  //         beneficiary_bank: beneficiary.bank_name,
  //         email: user.email,
  //         wallet,
  //       });

  //       console.log('13: Saving transaction');
  //       await this.transactionRepository.save(transaction);

  //       console.log('14: Payout successful');
  //       return {
  //         status: 200,
  //         message: 'Payout queued successfully',
  //         transaction_status: 'initiated',
  //         meta: {
  //           Id: transactionId,
  //           debit_currency: 'NGN',
  //           amount: amount.toString(),
  //           credit_currency: currency,
  //           fee_charged: feeCharged,
  //           total_amount: amount + feeCharged,
  //           dated: transaction.dated.toISOString(),
  //           beneficiary_id: beneficiary.beneficiary_id,
  //           bank_name: beneficiary.bank_name,
  //           account_no: beneficiary.account_no,
  //           sort_code: beneficiary.routing,
  //         },
  //       };
  //     } catch (error) {
  //       console.error('Initiate payout error:', error);
  //       if (error instanceof HttpException) {
  //         throw error;
  //       }
  //       throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //     }
  //   }

  async initiateUSDPayout(userId: string, usdPayoutDto: USDPayoutDto) {
    try {
      console.log(
        '1: Processing USD payout for userId:',
        userId,
        'DTO:',
        usdPayoutDto,
      );
      const { accountId, beneficiary_id, amount, debit_currency, narration } =
        usdPayoutDto;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('User not found for ID:', userId);
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const account = await this.accountRepository.findOne({
        where: { id: accountId, user: { id: userId } },
        relations: ['wallet'],
      });
      if (!account || !account.wallet) {
        console.error('Account or wallet not found for accountId:', accountId);
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const beneficiary = await this.beneficiaryRepository.findOne({
        where: { beneficiary_id },
      });
      if (!beneficiary) {
        console.error('Beneficiary not found for ID:', beneficiary_id);
        throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);
      }

      const wallet = account.wallet;
      console.log(
        '2: Wallet ID:',
        wallet.id,
        'Balances:',
        JSON.stringify(wallet.balances),
      );

      const sourceAmount = parseFloat(amount.toString());
      if (isNaN(sourceAmount) || sourceAmount <= 0) {
        console.error('Invalid amount:', amount);
        throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
      }

      let targetAmount = sourceAmount;
      let feeCharged = sourceAmount * 0.05;
      let totalSourceAmount = sourceAmount + feeCharged;

      const sourceBalance = wallet.balances.find(
        (b) => b.currency === debit_currency,
      );
      if (!sourceBalance) {
        console.error('No balance found for debit currency:', debit_currency);
        throw new HttpException(
          `No ${debit_currency} balance found`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // const exchangeRate = await this.exchangeRateService.getExchangeRate(debit_currency, currency);
      //   if (!exchangeRate) {
      //     console.error('Exchange rate not available for', debit_currency, 'to', currency);
      //     throw new HttpException('Exchange rate not available', HttpStatus.BAD_REQUEST);
      //   }
      if (debit_currency) {
        // console.log('3: Converting', debit_currency, 'to', currency);

        targetAmount = sourceAmount;
        feeCharged = targetAmount * 0.25; // Fee in target currency
        totalSourceAmount = sourceAmount + feeCharged;
        console.log(
          '4: Conversion details - sourceAmount:',
          sourceAmount,
          'targetAmount:',
          targetAmount,
          'fee:',
          feeCharged,
          'totalSourceAmount:',
          totalSourceAmount,
        );
      }

      console.log(
        '5: Checking',
        debit_currency,
        'balance - required:',
        totalSourceAmount,
        'available:',
        sourceBalance.payout_balance,
      );
      if (sourceBalance.payout_balance < totalSourceAmount) {
        console.error(
          'Insufficient balance - required:',
          totalSourceAmount,
          'available:',
          sourceBalance.payout_balance,
        );
        throw new HttpException(
          `Insufficient ${debit_currency} balance: need ${totalSourceAmount.toFixed(2)} ${debit_currency}, have ${sourceBalance.payout_balance.toFixed(2)} ${debit_currency}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('6: Updating', debit_currency, 'balance');
      sourceBalance.payout_balance -= totalSourceAmount;
      sourceBalance.collection_balance -= totalSourceAmount;
      await this.walletRepository.save(wallet);

      const targetBalance = wallet.balances.find(
        (b) => b.currency === debit_currency,
      );
      if (!targetBalance) {
        console.error('No balance found for target currency:', debit_currency);
        throw new HttpException(
          `No ${debit_currency} balance found`,
          HttpStatus.BAD_REQUEST,
        );
      }
      // console.log('7: Updating', currency, 'balance');
      targetBalance.payout_balance += targetAmount;
      targetBalance.collection_balance += targetAmount;
      await this.walletRepository.save(wallet);

      console.log('8: Creating', debit_currency, 'debit transaction');
      const transactionId = `FRPry${crypto.randomBytes(4).toString('hex')}`;
      const debitTransaction = this.transactionRepository.create({
        eventname: `Payout to ${debit_currency}`,
        transtype: 'debit',
        total_amount: totalSourceAmount,
        settled_amount: sourceAmount,
        fee_charged: feeCharged * (debit_currency !== debit_currency ? 1 : 1),
        currency_settled: debit_currency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Outflow',
        transactionid: transactionId,
        narration: narration || `Send payout to ${debit_currency} beneficiary`,
        balance_before: sourceBalance.payout_balance + totalSourceAmount,
        balance_after: sourceBalance.payout_balance,
        channel: 'etf',
        beneficiary_bank: beneficiary.bank_name,
        email: user.email,
        wallet,
      });
      await this.transactionRepository.save(debitTransaction);
      console.log('9: Saved debit transaction:', transactionId);

      // console.log('10: Creating', currency, 'credit transaction');
      // const creditTransactionId = `flick-${crypto.randomUUID()}`;
      // const creditTransaction = this.transactionRepository.create({
      //   eventname: `Payout to ${currency}`,
      //   transtype: 'credit',
      //   total_amount: targetAmount,
      //   settled_amount: targetAmount,
      //   fee_charged: 0,
      //   currency_settled: currency,
      //   dated: new Date(),
      //   status: 'initiated',
      //   initiator: user.email,
      //   type: 'Inflow',
      //   transactionid: creditTransactionId,
      //   narration: narration || `Payout to ${currency} beneficiary`,
      //   balance_before: targetBalance.payout_balance - targetAmount,
      //   balance_after: targetBalance.payout_balance,
      //   channel: 'etf',
      //   beneficiary_bank: beneficiary.bank_name,
      //   email: user.email,
      //   wallet,
      // });
      // await this.transactionRepository.save(creditTransaction);
      // console.log('11: Saved credit transaction:', creditTransactionId);

      // console.log('12: Payout queued successfully');
      return {
        status: 200,
        message: 'Payout queued successfully',
        transaction_status: 'initiated',
        meta: {
          Id: transactionId,
          debit_currency,
          amount,
          // credit_currency: currency,
          fee_charged: feeCharged,
          total_amount: totalSourceAmount,
          dated: new Date().toISOString(),
          beneficiary_id,
          bank_name: beneficiary.bank_name,
          account_no: beneficiary.account_no,
          sort_code: beneficiary.routing.toString(),
        },
      };
    } catch (error) {
      console.error('USD payout error:', error);
      throw new HttpException(
        error.message || 'Failed to process payout',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async convertAndFund(userId: string, convertAndFundDto: ConvertAndFundDto) {
    try {
      console.log(
        '1: Converting and funding for userId:',
        userId,
        'DTO:',
        convertAndFundDto,
      );
      if (!userId) {
        console.error('User ID is undefined - Possible JWT issue');
        throw new HttpException(
          'User ID is undefined',
          HttpStatus.UNAUTHORIZED,
        );
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        console.error('User not found for ID:', userId);
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      const account = await this.accountRepository.findOne({
        where: { id: convertAndFundDto.accountId, user: { id: userId } },
        relations: ['wallet'],
      });
      if (!account || !account.wallet) {
        console.error(
          'Account or wallet not found for accountId:',
          convertAndFundDto.accountId,
        );
        throw new HttpException(
          'Account or wallet not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const wallet = account.wallet;
      console.log(
        '2: Wallet ID:',
        wallet.id,
        'Balances:',
        JSON.stringify(wallet.balances),
      );
      const { sourceCurrency, targetCurrency, amount } = convertAndFundDto;

      if (sourceCurrency === targetCurrency) {
        console.error('Source and target currencies cannot be the same');
        throw new HttpException(
          'Source and target currencies cannot be the same',
          HttpStatus.BAD_REQUEST,
        );
      }

      const sourceAmount = parseFloat(amount.toString());
      console.log(
        '3: Parsed source amount:',
        sourceAmount,
        'source currency:',
        sourceCurrency,
        'target currency:',
        targetCurrency,
      );
      if (isNaN(sourceAmount) || sourceAmount <= 0)
        throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

      console.log(
        '4: Fetching exchange rate for',
        sourceCurrency,
        'to',
        targetCurrency,
      );
      const exchangeRate = await this.exchangeRateService.getExchangeRate(
        sourceCurrency,
        targetCurrency,
      );
      if (!exchangeRate) {
        console.error(
          'Exchange rate not available for',
          sourceCurrency,
          'to',
          targetCurrency,
        );
        throw new HttpException(
          'Exchange rate not available',
          HttpStatus.BAD_REQUEST,
        );
      }

      const targetAmount = sourceAmount / exchangeRate;
      const feeCharged = targetAmount * 0.0025; // 0.25% fee in target currency
      const amountPayable = targetAmount - feeCharged;
      const totalSourceAmount = sourceAmount + feeCharged * exchangeRate;
      console.log(
        '5: Calculated target amount:',
        targetAmount,
        'fee:',
        feeCharged,
        'amountPayable:',
        amountPayable,
        'total source amount:',
        totalSourceAmount,
      );

      const sourceBalance = wallet.balances.find(
        (b) => b.currency === sourceCurrency,
      );

      if (!sourceBalance) {
        console.error('6: No', sourceCurrency, 'balance found');
        throw new HttpException(
          `No ${sourceCurrency} balance found`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log(
        '7:',
        sourceCurrency,
        'balance check - required:',
        totalSourceAmount,
        'available:',
        sourceBalance.payout_balance,
      );
      if (sourceBalance.payout_balance < totalSourceAmount) {
        console.error(
          '8: Insufficient',
          sourceCurrency,
          'balance - required:',
          totalSourceAmount,
          'available:',
          sourceBalance.payout_balance,
        );
        throw new HttpException(
          `Insufficient ${sourceCurrency} balance: need ${totalSourceAmount.toFixed(2)} ${sourceCurrency}, have ${sourceBalance.payout_balance.toFixed(2)} ${sourceCurrency}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      console.log('9: Updating', sourceCurrency, 'balance');
      sourceBalance.payout_balance -= totalSourceAmount;
      await this.walletRepository.save(wallet);

      console.log('10: Updating target currency balance');
      let targetBalance = wallet.balances.find(
        (b) => b.currency === targetCurrency,
      );
      if (!targetBalance) {
        console.log(
          '11: Initializing target currency balance for',
          targetCurrency,
        );
        targetBalance = {
          currency: targetCurrency,
          api_balance: 0,
          payout_balance: 0,
          collection_balance: 0,
        };
        wallet.balances.push(targetBalance);
      }
      targetBalance.payout_balance += amountPayable;
      targetBalance.collection_balance += amountPayable;
      await this.walletRepository.save(wallet);

      console.log('12: Creating', sourceCurrency, 'outflow transaction');
      const sourceTransactionId = `Flick-${crypto.randomUUID()}`;
      const sourceTransaction = this.transactionRepository.create({
        eventname: `Conversion from ${sourceCurrency} to ${targetCurrency}`,
        transtype: 'debit',
        total_amount: totalSourceAmount,
        settled_amount: sourceAmount,
        fee_charged: feeCharged * exchangeRate,
        currency_settled: sourceCurrency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Outflow',
        transactionid: sourceTransactionId,
        narration: `Conversion of ${sourceAmount} ${sourceCurrency} to ${amountPayable} ${targetCurrency}`,
        balance_before: sourceBalance.payout_balance + totalSourceAmount,
        balance_after: sourceBalance.payout_balance,
        channel: 'internal',
        email: user.email,
        wallet,
      });
      console.log('13: Saving', sourceCurrency, 'outflow transaction');
      await this.transactionRepository.save(sourceTransaction);

      console.log('14: Creating', targetCurrency, 'inflow transaction');
      const targetTransactionId = `Flick-${crypto.randomUUID()}`;
      const targetTransaction = this.transactionRepository.create({
        eventname: `Conversion to ${targetCurrency} from ${sourceCurrency}`,
        transtype: 'credit',
        total_amount: targetAmount,
        settled_amount: amountPayable,
        fee_charged: feeCharged,
        currency_settled: targetCurrency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Inflow',
        transactionid: targetTransactionId,
        narration: `Conversion of ${sourceAmount} ${sourceCurrency} to ${amountPayable} ${targetCurrency}`,
        balance_before: targetBalance.payout_balance - amountPayable,
        balance_after: targetBalance.payout_balance,
        channel: 'internal',
        email: user.email,
        wallet,
      });

      console.log('15: Saving', targetCurrency, 'inflow transaction');
      await this.transactionRepository.save(targetTransaction);

      console.log('16: Conversion and funding successful');
      return {
        statusCode: 200,
        status: 'success',
        message: 'Conversion and funding transaction created successfully',
        data: {
          sourceTransactionId,
          targetTransactionId,
          currency: targetCurrency,
          currency_collected: sourceCurrency,
          sourceAmount,
          amount: targetAmount,
          charges: feeCharged,
          amountPayable,
          payableFxAmountString: `${targetCurrency === 'USD' ? '$' : targetCurrency === 'GBP' ? '£' : targetCurrency === 'CAD' ? 'C$' : '€'}${amountPayable.toFixed(2)}`,
          payableAmountString: `${targetCurrency === 'USD' ? '$' : targetCurrency === 'GBP' ? '£' : targetCurrency === 'CAD' ? 'C$' : '€'}${amountPayable.toFixed(2)}`,
          rate: exchangeRate,
          currency_settled: targetCurrency,
        },
      };
    } catch (error) {
      console.error('Convert and fund error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to convert and fund wallet',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getCountries() {
    try {
      const countries = await this.countryRepository.findAll();
      return {
        status: 200,
        message: 'Countries retrieved successfully',
        data: countries.map((country) => ({
          name: country.name,
          iso2: country.iso2,
        })),
      };
    } catch (error) {
      console.error('Get countries error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve countries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createForeignPaymentLink0(
    userId: string,
    createForeignFundChargeDto: CreateForeignFundChargeDto,
  ) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user)
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      const account = await this.accountRepository.findOne({
        where: { user: { id: userId } },
        select: ['id', 'merchantCode'],
      relations: ['wallet'],
      });
      if (!account || !account.wallet)
        throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const accessCode = crypto.randomBytes(5).toString('hex');
      const paymentUrl = `https://checkout.global.paywithflick.co/pages/${accessCode}`;
      let charges = 0;
      let exchangeRate = 1;
      let settledAmount = parseFloat(createForeignFundChargeDto.amount);
      const balanceType = 'collection';

      if (
        createForeignFundChargeDto.currency_collected !==
        createForeignFundChargeDto.currency_settled
      ) {
        throw new HttpException(
          'Unsupported currency pair',
          HttpStatus.BAD_REQUEST,
        );
      }

      const amount = parseFloat(createForeignFundChargeDto.amount);
      const transactionid = `flick-${crypto.randomUUID()}`;

      const paymentPage = this.paymentPageRepository.create({
        access_code: accessCode,
        paymentUrl: paymentUrl,
        url: paymentUrl,
        currency: createForeignFundChargeDto.currency_collected,
        currency_collected: createForeignFundChargeDto.currency_collected,
        exchange_rate: exchangeRate,
        settled_amount: settledAmount,
        amount: amount,
        amountPayable: amount,
        payableAmountString: `${amount.toFixed(2)}`,
        payableFxAmountString: `${settledAmount.toFixed(2)}`,
        rate: exchangeRate,
        currency_settled: createForeignFundChargeDto.currency_settled,
        account: account,
        status: 'active',
        source: 'api',
        isFixedAmount: true,
        dated: new Date(),
        CustomerCode: account.merchantCode || 'DEFAULT_CODE',
      });

      await this.paymentPageRepository.save(paymentPage);

      const transaction = this.transactionRepository.create({
        eventname: 'Charge',
        transtype: 'credit',
        total_amount: amount + charges,
        settled_amount: amount,
        fee_charged: charges,
        currency_settled: 'NGN',
        dated: new Date(),
        status: 'pending',
        initiator: user.email,
        type: 'Pending',
        transactionid,
        narration: 'Foreign Charge initiated',
        balance_before: 0,
        balance_after: 0,
        channel: 'direct',
        email: user.email,
        wallet: account.wallet,
        balanceType: balanceType,
      });

      await this.transactionRepository.save(transaction);
      console.log('SAVE......:', this.transactionRepository);

      return {
        statusCode: 200,
        status: 'success',
        message: 'Transaction created successfully',
        data: {
          transactionId: transactionid,
          access_code: accessCode,
          url: paymentUrl,
          currency: createForeignFundChargeDto.currency_collected,
          currency_collected: createForeignFundChargeDto.currency_collected,
          exchange_rate: exchangeRate,
          settled_amount: settledAmount,
          amount: amount,
          amountPayable: amount,
          payableAmountString: `${amount.toFixed(2)}`,
          payableFxAmountString: `${settledAmount.toFixed(2)}`,
          rate: exchangeRate,
          currency_settled: createForeignFundChargeDto.currency_settled,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create payment link error:', error);
      throw new HttpException(
        'Failed to create payment link',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createForeignPaymentLink(
  userId: string,
  createForeignFundChargeDto: CreateForeignFundChargeDto,
) {
  try {
    // ---------------------------------------------------
    // 1. Get user
    // ---------------------------------------------------
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user)
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // 2. Get account WITH ID + WALLET only
    //    (Do not load huge relations)
    // ---------------------------------------------------
    const account = await this.accountRepository.findOne({
      where: { user: { id: userId } },
      select: ['id', 'merchantCode'],
      relations: ['wallet'],
    });

    if (!account || !account.wallet)
      throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // 3. Generate access code + URL
    // ---------------------------------------------------
    const accessCode = crypto.randomBytes(10).toString('hex');
    const paymentUrl = `https://checkout.global.paywithflick.co/pages/${accessCode}`;

    const amount = parseFloat(createForeignFundChargeDto.amount);
    const exchangeRate = 1;
    const settledAmount = amount;
    const charges = 0;

    if (createForeignFundChargeDto.currency_collected !== createForeignFundChargeDto.currency_settled) {
      throw new HttpException('Unsupported currency pair', HttpStatus.BAD_REQUEST);
    }

    const transactionId = `flick-${crypto.randomUUID()}`;

    // ---------------------------------------------------
    // 4. Create Payment Page
    // ---------------------------------------------------
    const paymentPage = this.paymentPageRepository.create({
      access_code: accessCode,
      paymentUrl,
      url: paymentUrl,
      currency: createForeignFundChargeDto.currency_collected,
      currency_collected: createForeignFundChargeDto.currency_collected,
      exchange_rate: exchangeRate,
      settled_amount: settledAmount,
      amount,
      amountPayable: amount,
      payableAmountString: `${amount.toFixed(2)}`,
      payableFxAmountString: `${settledAmount.toFixed(2)}`,
      rate: exchangeRate,
      currency_settled: createForeignFundChargeDto.currency_settled,
      account: account,
      status: 'active',
      source: 'api',
      isFixedAmount: true,
      dated: new Date(),
      CustomerCode: account.merchantCode || 'DEFAULT_CODE',
    });

    await this.paymentPageRepository.save(paymentPage);

    console.log("SAVED PAYMENT PAGE:", paymentPage);

    // ---------------------------------------------------
    // 5. Create Transaction
    // ---------------------------------------------------
    const transaction = this.transactionRepository.create({
      eventname: 'Charge',
      transtype: 'credit',
      total_amount: amount + charges,
      settled_amount: amount,
      fee_charged: charges,
      currency_settled: createForeignFundChargeDto.currency_settled,
      dated: new Date(),
      status: 'pending',
      initiator: user.email,
      type: 'Pending',
      transactionid: transactionId,
      narration: 'Foreign Charge initiated',
      balance_before: 0,
      balance_after: 0,
      channel: 'direct',
      email: user.email,
      wallet: account.wallet,
      wallet_id: account.wallet.id,
      balanceType: 'collection',
    });

    await this.transactionRepository.save(transaction);

    return {
      status: 'success',
      message: 'Transaction created successfully',
      data: {
        ...paymentPage,
        transactionId: transactionId,
      },
    };

  } catch (error) {
    console.error('Create payment link error:', error);
    throw new HttpException('Failed to create payment link', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async processForeignPayment(accessCode: ProcessForeignPaymentDto) {
  try {



    const paymentPage = await this.paymentPageRepository.findOne({
      where: { 
        access_code: accessCode.accessCode,
      },
      
      relations: ['account', 'account.user', 'account.wallet'],
    
    });
    console.log('Payment Page:', paymentPage);
    if (!paymentPage) {
      throw new HttpException('Payment link not found for this user', HttpStatus.NOT_FOUND);
    }
  
     const account = paymentPage.account;
    const wallet = account.wallet;

    if (!wallet) {
      throw new HttpException('Wallet not found for account', HttpStatus.NOT_FOUND);
    }

    const amount = paymentPage.amount;
    const currency = paymentPage.currency_settled;

    const transaction = await this.transactionRepository.findOne({
      where: { 
        wallet: { id: wallet.id },
        settled_amount: amount,
        currency_settled: currency,
        status: 'pending',
        email: paymentPage.account.user.email,
      },
      relations: ['wallet'],
      order: { dated: 'DESC' }
    });

    if (!transaction) {
      throw new HttpException('Pending transaction not found for this payment', HttpStatus.NOT_FOUND);
    }

    return {
      statusCode: 200,
      status: 'success',
      message: 'Foreign payment processed successfully',
      data: {
       currency_collected: currency,
        access_code: accessCode.accessCode,
        payableAmountString: amount.toString(),
            amount: amount,
            exchange_rate: 1,
            amountPayable: amount,
            payableFxAmountString: amount,
            settled_amount: amount,
    business_name: account.user.name,
  senderEmail: paymentPage.account.user.email,
  transactionId: transaction.transactionid,
    
      },
    };
  } catch (error) {
    console.error('Process foreign payment error:', error);
    throw error instanceof HttpException
      ? error
      : new HttpException('Failed to process foreign payment', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
async processForeignPayment1(userId: string, accessCode: ProcessForeignPaymentDto) {
  try {
  console.log('SEARCHING FOR ACCESS CODE:', accessCode);
console.log('EXACT VALUE PASSED:', JSON.stringify(accessCode));
console.log('ALL EXISTING CODES:', (await this.paymentPageRepository.find()).map(p => p.access_code));
    // ---------------------------------------------------
    // 1. Load user with accounts & wallets
    // ---------------------------------------------------
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['accounts', 'accounts.wallet'],
    });

    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // 2. Load payment page by access_code ONLY
    // ---------------------------------------------------
    console.log('LOOKING FOR ACCESS CODE:', accessCode);
// console.log('TYPE:', typeof accessCode, 'LENGTH:', accessCode?.length);
    const paymentPage = await this.paymentPageRepository.findOne({
      where: { access_code: accessCode.accessCode },
      relations: [
        'account',
        'account.user',
        'account.wallet'
      ],
    });

    console.log("FOUND PAYMENT PAGE:", paymentPage);

    if (!paymentPage)
      throw new HttpException('Payment link not found', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // 3. Check payment page belongs to requesting user
    // ---------------------------------------------------
    if (paymentPage.account.user.id !== userId)
      throw new HttpException('Payment link not found for this user', HttpStatus.NOT_FOUND);

    const account = paymentPage.account;
    const wallet = account.wallet;

    if (!wallet)
      throw new HttpException('Wallet not found for this account', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // 4. Find pending transaction attached to this wallet
    // ---------------------------------------------------
    const transaction = await this.transactionRepository.findOne({
      where: {
        wallet_id: wallet.id,
        settled_amount: paymentPage.amount,
        currency_settled: paymentPage.currency_settled,
        status: 'pending',
        email: user.email,
      },
      relations: ['wallet'],
      order: { dated: 'DESC' },
    });

    console.log("FOUND TRANSACTION:", transaction);

    if (!transaction)
      throw new HttpException('Pending transaction not found for this payment', HttpStatus.NOT_FOUND);

    // ---------------------------------------------------
    // SUCCESS
    // ---------------------------------------------------
    return {
      status: 'success',
      message: 'Foreign payment processed successfully',
      data: {
        paymentPage,
        transaction,
      },
    };

  } catch (error) {
    console.error('Process foreign payment error:', error);
    throw error instanceof HttpException
      ? error
      : new HttpException('Failed to process foreign payment', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async getBeneficiaries(userId: string, accountId: string) {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: accountId, user: { id: userId } },
      });
      if (!account)
        throw new HttpException(
          'Account not found or unauthorized',
          HttpStatus.NOT_FOUND,
        );

      const beneficiaries =
        await this.beneficiaryRepository.findByAccountId(accountId);
      return {
        status: 200,
        message: 'data retrieved successfully',
        count: beneficiaries.length,
        data: beneficiaries.map((b) => ({
          beneficiary_id: b.beneficiary_id,
          account_no: b.account_no,
          routing: b.routing,
          dated: b.dated.toISOString(),
          beneficiary_name: b.beneficiary_name,
          beneficiary_address_1: b.beneficiary_address_1,
          beneficiary_address_2: b.beneficiary_address_2,
          beneficiary_city: b.beneficiary_city,
          beneficiary_state: b.beneficiary_state,
          beneficiary_country: b.beneficiary_country,
          beneficiary_postal_code: b.beneficiary_postal_code,
          bank_name: b.bank_name,
          bank_address_1: b.bank_address_1,
          bank_address_2: b.bank_address_2,
          bank_city: b.bank_city,
          bank_state: b.bank_state,
          bank_country: b.bank_country,
          bank_postal_code: b.bank_postal_code,
          swift_code: b.swift_code,
          transfer_type: b.transfer_type,
        })),
      };
    } catch (error) {
      console.error('Get beneficiaries error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to retrieve beneficiaries',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async saveBeneficiary(
    userId: string,
    beneficiaryDto: SaveBeneficiaryDto,
  ): Promise<Beneficiary> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: beneficiaryDto.accountId, user: { id: userId } },
      });
      if (!account)
        throw new HttpException(
          'Account not found or unauthorized',
          HttpStatus.NOT_FOUND,
        );

      const beneficiary = this.beneficiaryRepository.create({
        beneficiary_id: `ben-${crypto.randomUUID()}`,
        account_no: beneficiaryDto.account_no,
        routing: beneficiaryDto.routing,
        dated: new Date(),
        beneficiary_name: beneficiaryDto.beneficiary_name,
        beneficiary_address_1: beneficiaryDto.beneficiary_address_1,
        beneficiary_address_2: 'NA',
        beneficiary_city: beneficiaryDto.beneficiary_city,
        beneficiary_state: beneficiaryDto.beneficiary_state,
        beneficiary_country: beneficiaryDto.beneficiary_country,
        beneficiary_postal_code: 'NA',
        bank_name: beneficiaryDto.bank_name,
        bank_address_1: 'NA',
        bank_address_2: 'NA',
        bank_city: beneficiaryDto.bank_city,
        bank_state: beneficiaryDto.bank_state,
        bank_country: beneficiaryDto.bank_country,
        bank_postal_code: 'NA',
        swift_code: 'NA',
        transfer_type: beneficiaryDto.transfer_type,
        recipient_firstname: beneficiaryDto.recipient_firstname,
        recipient_lastname: beneficiaryDto.recipient_lastname,
        recipient_kyc: beneficiaryDto.recipient_kyc,
        is_domiciliary: beneficiaryDto.is_domiciliary,
        is_individual: beneficiaryDto.is_individual,
        account,
        account_id: account.id,
      });

      return await this.beneficiaryRepository.save(beneficiary);
    } catch (error) {
      console.error('Save beneficiary error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to save beneficiary',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
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
