/* eslint-disable prettier/prettier */
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AddBusinessDto, CardDetailsDto, CreateChargeDto, FundPayoutBalanceDto, NGNCompletePayoutDto, NGNPayoutDto, NubanCreateMerchantDto, SaveBeneficiaryDto, USDPayoutDto } from '../application/dtos/auth.dto';
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
// import { Wallet } from '../domain/entities/wallet.entity';
import { CountryRepository } from '../infrastructure/repositories/country.repository';
import { BeneficiaryRepository } from '../infrastructure/repositories/beneficiary.repository';
import { ExchangeRateService } from '../infrastructure/services/exchange-rate/exchange-rate.service';
import { Beneficiary } from '../domain/entities/beneficiary.entity';
import { Console } from 'console';
// import { Wallet } from 'src/domain/entities/wallet.entity';


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

  







  // async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
  //   try {
  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //      const existingAccount = await this.accountRepository.findByBusinessId(addBusinessDto.businessId);
  //     if (existingAccount) throw new HttpException('Business ID already exists', HttpStatus.BAD_REQUEST);

  //      const existingAccountByName = await this.accountRepository.findOne({
  //     where: { business_name: addBusinessDto.business_name },
  //   });
  //   if (existingAccountByName) {
  //     throw new HttpException('Business name already exists', HttpStatus.BAD_REQUEST);
  //   }
  //      const existingAccountCurriency = await this.accountRepository.findOne({
  //       where: {
  //   currencies: addBusinessDto.currencies ? addBusinessDto.currencies[0] : undefined,
  // },
  //   });
  //   if (existingAccountCurriency) {
  //     throw new HttpException('Customer Business with such currency already exists', HttpStatus.BAD_REQUEST);
  //   }

  //     const account = this.accountRepository.create({
  //       ...addBusinessDto,
  //       users: [user],
  //     });

  //     await this.accountRepository.save(account);

  //     const wallet = this.walletRepository.create({
  //       account,
  //       account_id: account.id,
  //       balances: [{ currency: 'NGN', api_balance: 0 }]

  //     });
  //     await this.walletRepository.save(wallet);

  //     const transactionId = `flick-${crypto.randomUUID()}`;
  //     const initialFunding = this.transactionRepository.create({
  //       eventname: 'Initial Funding',
  //       transtype: 'credit',
  //       total_amount: 1000,
  //       settled_amount: 1000,
  //       fee_charged: 0,
  //       currency_settled: 'NGN',
  //       dated: new Date(),
  //       status: 'success',
  //       initiator: user.email,
  //       type: 'Inflow',
  //       transactionid: transactionId,
  //       narration: 'Initial wallet funding for NGN on signup',
  //       balance_before: 0,
  //       balance_after: 1000,
  //       channel: 'system',
  //       email: user.email,
  //       wallet,
  //     });
  //     await this.transactionRepository.save(initialFunding);

  //     return { message: 'Business added successfully', accountId: account.id };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Add business error:', error);
  //     throw new HttpException('Failed to add business', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
const primaryCurrency = addBusinessDto.currencies?.[0] ?? 'NGN';

// const account = this.accountRepository.create({
//   ...addBusinessDto,
//   account_type: 'merchant',
//   currency: primaryCurrency, 
//   users: [user],
// });

const account = await this.accountRepository.save(
  this.accountRepository.create({
    ...addBusinessDto,
    account_type: 'merchant',
  currency: primaryCurrency, 

    users: [user],
  })
);

const wallet = this.walletRepository.create({
  account,
  account_id: account.id,
  balances: [
    {
      currency: primaryCurrency,
      api_balance: 0,
      payout_balance: 0,
      collection_balance: 0,
    },
  ],
});

      await this.walletRepository.save(wallet);
  
      const transactionId = `flick-${crypto.randomUUID()}`;
      const initialFunding = this.transactionRepository.create({
        eventname: 'Initial Funding',
        transtype: 'credit',
        total_amount: 1000,
        settled_amount: 1000,
        fee_charged: 0,
        currency_settled: primaryCurrency,
        dated: new Date(),
        status: 'success',
        initiator: user.email,
        type: 'Inflow',
        transactionid: transactionId,
        narration: `Initial wallet funding for ${primaryCurrency} on signup`,
        balance_before: 0,
        balance_after: 1000,
        channel: 'system',
        email: user.email,
        wallet,
      });
      await this.transactionRepository.save(initialFunding);
  
      return { message: 'Business added successfully', accountId: account.id };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Add business error:', error);
      
      throw new HttpException('Failed to add business', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // async createCharge(userId: string, createChargeDto: CreateChargeDto) {
  //   try {
  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     const account = await this.accountRepository.findOne({ where: { id: createChargeDto.accountId } });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     const paymentPage = this.paymentPageRepository.create({
  //       ...createChargeDto,
  //       account,
  //       status: 'active',
  //     });
  //     await this.paymentPageRepository.save(paymentPage);

  //     return { message: 'Charge created successfully', paymentPageId: paymentPage.id };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Create charge error:', error);
  //     throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }



  // async createCharge(userId: string, chargeDto: CreateChargeDto) {
  //   try {
  //     const account = await this.accountRepository.findOne({
  //       where: { id: chargeDto.accountId },
  //       relations: ['wallet', 'wallet.transactions'],
  //     });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
  
  //     if (!account.wallet) {
  //       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
  //       throw new HttpException('Cannot create charge: Account has no wallet', HttpStatus.BAD_REQUEST);
  //     }
  
  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  
  //     const transactionId = `flick-${crypto.randomUUID()}`;
  //     const access_code = crypto.randomBytes(5).toString('hex');
  //     const charges = Math.round(chargeDto.amount * 0.0135);
  //     const amountPayable = chargeDto.amount;
  //     const nairaEquivalent = chargeDto.currency === 'NGN' ? amountPayable : amountPayable * 1;
  //     const paymentUrl = `https://checkout.paywithflick.co/pages/${access_code}`;
  //     const custompaymentUrl = chargeDto.customLink ? `https://checkout.paywithflick.co/pages/${chargeDto.customLink}` : null;
  
  //     const wallet = account.wallet;
  //     const transactions = wallet.transactions || [];
  //     let payoutBalance = 0;
  //     transactions.forEach(tx => {
  //       if (!['completed', 'success'].includes(tx.status)) return;
  //       const amount = parseFloat(tx.settled_amount.toString());
  //       if (isNaN(amount)) {
  //         console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
  //         return;
  //       }
  //       if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
  //         payoutBalance += amount;
  //       } else if (tx.type === 'Outflow') {
  //         payoutBalance -= amount;
  //       }
  //     });
  
  //     const transaction = this.transactionRepository.create({
  //       eventname: 'Charge',
  //       transtype: 'credit',
  //       total_amount: chargeDto.amount + charges,
  //       settled_amount: amountPayable,
  //       fee_charged: charges,
  //       currency_settled: chargeDto.currency,
  //       dated: new Date(),
  //       status: 'pending',
  //       initiator: user.email,
  //       type: 'Inflow',
  //       transactionid: transactionId,
  //       narration: chargeDto.description || 'Charge initiated',
  //       balance_before: payoutBalance,
  //       balance_after: payoutBalance,
  //       channel: 'card',
  //       beneficiary_bank: null,
  //       email: user.email,
  //       wallet,
  //     });
  
  //     await this.transactionRepository.save(transaction);
  //     console.log(`Transaction created: ${transaction.transactionid} for charge`);
  
  //     const paymentPage = this.paymentPageRepository.create({
  //       pageName: chargeDto.pageName || `Charge-${transactionId}`,
  //       checkout_settings: {
  //         customization: {
  //           primaryColor: '#ff2600',
  //           brandName: account.business_name || 'Flick',
  //           showLogo: false,
  //           showBrandName: false,
  //           secondaryColor: '#ffe8e8',
  //         },
  //         card: true,
  //         bank_transfer: true,
  //       },
  //       productType: chargeDto.productType,
  //       currency_collected: chargeDto.currency_collected,
  //       currency: chargeDto.currency,
  //       access_code,
  //       status: 'active',
  //       source: 'dashboard',
  //       isFixedAmount: !!chargeDto.amount,
  //       paymentUrl,
  //       currency_settled: chargeDto.currency_settled || chargeDto.currency,
  //       successmsg: chargeDto.successmsg || 'Payment successful',
  //       customLink: chargeDto.customLink || null,
  //       dated: new Date(),
  //       amount: chargeDto.amount.toString(),
  //       redirectLink: chargeDto.redirectLink || null,
  //       CustomerCode: account.businessId.toString(),
  //       description: chargeDto.description || 'Charge payment',
  //       custompaymentUrl,
  //       account,
  //     });
  
  //     await this.paymentPageRepository.save(paymentPage);
  //     console.log(`Payment page created: ${paymentPage.access_code} for charge`);
  
  //     return {
  //       data: {
  //         transactionId,
  //         url: custompaymentUrl || paymentUrl,
  //         currency: chargeDto.currency,
  //         currency_collected: chargeDto.currency,
  //         nairaEquivalent,
  //         amount: chargeDto.amount + charges,
  //         charges,
  //         amountPayable,
  //         payableFxAmountString: `₦${amountPayable.toFixed(2)}`,
  //         payableAmountString: `₦${amountPayable.toFixed(2)}`,
  //         rate: 1,
  //         currency_settled: chargeDto.currency,
  //         access_code,
  //       },
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Create charge error:', error);
  //     throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  async createCharge(userId: string, chargeDto: CreateChargeDto) {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: chargeDto.accountId },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);
  
      if (!account.wallet) {
        console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
        throw new HttpException('Cannot create charge: Account has no wallet', HttpStatus.BAD_REQUEST);
      }
  
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  
      const transactionId = `flick-${crypto.randomUUID()}`;
      const access_code = crypto.randomBytes(5).toString('hex');
      const charges = Math.round(chargeDto.amount * 0.0135);
      const amountPayable = chargeDto.amount;
      const nairaEquivalent = chargeDto.currency === 'NGN' ? amountPayable : amountPayable * 1;
      const paymentUrl = `https://checkout.paywithflick.co/pages/${access_code}`;
      const custompaymentUrl = chargeDto.customLink ? `https://checkout.paywithflick.co/pages/${chargeDto.customLink}` : null;
  
      const wallet = account.wallet;
      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach(tx => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });
      

      if (!account.wallet?.id) {
  throw new Error('Wallet is missing or not properly loaded');
}
console.log('Using wallet ID:', account.wallet.id);
  
      const transaction = this.transactionRepository.create({
        eventname: 'Charge',
        transtype: 'credit',
        total_amount: chargeDto.amount + charges,
        settled_amount: amountPayable,
        fee_charged: charges,
        currency_settled: chargeDto.currency,
        dated: new Date(),
        status: 'success',
        initiator: user.email,
        type: 'Inflow',
        transactionid: transactionId,
        narration: chargeDto.description || 'Charge initiated',
        balance_before: payoutBalance,
        balance_after: payoutBalance,
        channel: 'card',
        beneficiary_bank: null,
        email: user.email,
        wallet: account.wallet,
      });
  
      await this.transactionRepository.save(transaction);
      console.log(`Transaction created: ${transaction.transactionid} for charge`);
  
      const paymentPage = this.paymentPageRepository.create({
        pageName: chargeDto.pageName || `Charge-${transactionId}`,
        checkout_settings: {
          customization: {
            primaryColor: '#ff2600',
            brandName: account.business_name || 'flick',
            showLogo: false,
            showBrandName: false,
            secondaryColor: '#ffe8e8',
          },
          card: true,
          bank_transfer: true,
        },
        productType: 'oneTime',
        currency_collected: chargeDto.currency,
        currency: chargeDto.currency,
        access_code,
        status: 'active',
        source: 'dashboard',
        isFixedAmount: !!chargeDto.amount,
        paymentUrl,
        currency_settled: chargeDto.currency,
        successmsg: chargeDto.successmsg || 'Payment successful',
        customLink: chargeDto.customLink || null,
        dated: new Date(),
        amount: chargeDto.amount.toString(),
        redirectLink: chargeDto.redirectLink || null,
        CustomerCode: String(account.businessId),
        description: chargeDto.description || 'Charge payment',
        custompaymentUrl,
        account,
      });
  
      await this.paymentPageRepository.save(paymentPage);
      console.log(`Payment page created: ${paymentPage.access_code} for charge`);
  
      // Update wallet balances
      const balance = wallet.balances.find(b => b.currency === chargeDto.currency) || {
        currency: chargeDto.currency,
        api_balance: 0,
        payout_balance: 0,
        collection_balance: 0,
      };
      if (!wallet.balances.some(b => b.currency === chargeDto.currency)) {
        wallet.balances.push(balance);
        await this.walletRepository.save(wallet);
      }
  
      return {
        data: {
          transactionId,
          url: custompaymentUrl || paymentUrl,
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
          access_code,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Create charge error:', error);
      throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
//   async createCharge(userId: string, chargeDto: CreateChargeDto) {
//   try {
//     const account = await this.accountRepository.findOne({
//       where: { id: chargeDto.accountId },
//       relations: ['wallet', 'wallet.transactions'],
//     });
//     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

//     if (!account.wallet) {
//       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
//       throw new HttpException('Cannot create charge: Account has no wallet', HttpStatus.BAD_REQUEST);
//     }

//     const user = await this.userRepository.findOne({ where: { id: userId } });
//     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//     const transactionId = `flick-${crypto.randomUUID()}`;
//     const charges = Math.round(chargeDto.amount * 0.0135);
//     const amountPayable = chargeDto.amount;
//     const nairaEquivalent = chargeDto.currency === 'NGN' ? amountPayable : amountPayable * 1; // Adjust for forex if needed
//     const paymentUrl = `https://checkout.paywithflick.co/pages/${crypto.randomBytes(5).toString('hex')}`;

//     const wallet = account.wallet;
//     // Calculate payout_balance similar to getBalances
//     const transactions = wallet.transactions || [];
//     let payoutBalance = 0;
//     transactions.forEach(tx => {
//       if (!['completed', 'success'].includes(tx.status)) return;
//       const amount = parseFloat(tx.settled_amount.toString());
//       if (isNaN(amount)) {
//         console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
//         return;
//       }
//       if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
//         payoutBalance += amount;
//       } else if (tx.type === 'Outflow') {
//         payoutBalance -= amount;
//       }
//     });

//     const transaction = this.transactionRepository.create({
//       eventname: 'Charge',
//       transtype: 'credit',
//       total_amount: chargeDto.amount + charges,
//       settled_amount: amountPayable,
//       fee_charged: charges,
//       currency_settled: chargeDto.currency,
//       dated: new Date(),
//       status: 'pending',
//       initiator: user.email,
//       type: 'Inflow',
//       transactionid: transactionId,
//       narration: 'Charge initiated',
//       balance_before: payoutBalance,
//       balance_after: payoutBalance, // Pending transactions don't update balance
//       channel: 'card',
//       beneficiary_bank: null,
//       email: user.email,
//       wallet,
//     });

//     await this.transactionRepository.save(transaction);
//     console.log(`Transaction created: ${transaction.transactionid} for charge`);

//     return {
//       data: {
//         transactionId,
//         url: paymentUrl,
//         currency: chargeDto.currency,
//         currency_collected: chargeDto.currency,
//         nairaEquivalent,
//         amount: chargeDto.amount + charges,
//         charges,
//         amountPayable,
//         payableFxAmountString: `₦${amountPayable.toFixed(2)}`,
//         payableAmountString: `₦${amountPayable.toFixed(2)}`,
//         rate: 1,
//         currency_settled: chargeDto.currency,
//       },
//     };
//   } catch (error) {
//     if (error instanceof HttpException) throw error;
//     console.error('Create charge error:', error);
//     throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
//   }
// }




async getPaymentLinks(userId: string) {
  try {
    const account = await this.accountRepository.findOne({
      where: { users: { id: userId } },
      relations: ['paymentPages'],
    });
    if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

    const paymentPages = await this.paymentPageRepository.find({
      where: { account: { id: account.id } },
    });

    return {
      status: 200,
      data: paymentPages.map(page => ({
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
    throw new HttpException('Failed to retrieve payment links', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async nubanCreateMerchant(userId: string, nubanDto: NubanCreateMerchantDto) {
    try {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      const account = await this.accountRepository.findOne({ where: { id: nubanDto.accountId } });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

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
      throw new HttpException('Failed to create NUBAN merchant', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async fundPayoutBalance(userId: string, fundDto: FundPayoutBalanceDto) {
    try {
      const account = await this.accountRepository.findOne({ where: { id: fundDto.accountId }, relations: ['wallet', 'wallet.transactions'] });
      if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

      const wallet = account.wallet;
      if (!wallet) {
        console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
        throw new HttpException('Cannot fund payout balance: Account has no wallet', HttpStatus.BAD_REQUEST);
      }

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

        const transactionId = `flick-${crypto.randomUUID()}`;
            const currency = 'NGN';
            let balance = wallet.balances?.find(b => b.currency === currency);;
      
            if (!balance) {
      balance = { currency, api_balance: 0 };
      wallet.balances = [balance];
      await this.walletRepository.save(wallet);
    }

      if (fundDto.method === 'bank_transfer') {
        if (!fundDto.bankCode || !fundDto.bankName || !fundDto.accountNumber) {
          throw new HttpException('Bank details required for bank transfer', HttpStatus.BAD_REQUEST);
        }

        const nuban = await this.nubanCreateMerchant(userId, {
          accountId: fundDto.accountId,
          bankCode: fundDto.bankCode,
          bankName: fundDto.bankName,
          accountNumber: fundDto.accountNumber,
          accountName:fundDto.accountName ||  ""
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
        console.log(`Transaction created: ${transaction.transactionid} for fund payout balance via bank transfer`);

        return {
          message: `Payout balance funding of ${transaction.total_amount} initiated via bank transfer`,
          virtualAccount: nuban.data[0],
        };
      } 
      else if (fundDto.method === 'card') {
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
        const encryptedCardDetails = this.encryptionUtil.encrypter(cardDetailsString);
        if (!encryptedCardDetails) throw new HttpException('Incorrect input format', HttpStatus.INTERNAL_SERVER_ERROR);

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
        console.log(`Transaction created: ${transaction.transactionid} for fund payout balance via card`);

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
      }

      else if (fundDto.method === 'payout_balance') {
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
        throw new HttpException('Invalid funding method', HttpStatus.BAD_REQUEST);
      }
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Fund payout balance error:', error);
      throw new HttpException('Failed to fund payout balance', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  //  async getBalances(userId: string) {
  //   try {
  //     const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet', 'accounts.wallet.transactions'] });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     const balances = user.accounts.flatMap(account => {
  //       if (!account.wallet) {
  //         console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
  //         return [];
  //       }

  //       const transactions = account.wallet.transactions || [];
  //       const balancesByCurrency = {};

  //       transactions.forEach(tx => {
  //         if (!['completed', 'success'].includes(tx.status)) return;
  //         const currency = tx.currency_settled;
  //         if (!balancesByCurrency[currency]) {
  //           balancesByCurrency[currency] = {
  //             currency,
  //             collection_balance: 0,
  //             payout_balance: 0,
  //             api_balance: 0,
  //           };
  //         }

  //         const amount = parseFloat(tx.settled_amount.toString());
  //         if (isNaN(amount)) {
  //           console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
  //           return;
  //         }

  //         if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
  //           balancesByCurrency[currency].collection_balance += amount;
  //           balancesByCurrency[currency].payout_balance += amount;
  //         } else if (tx.type === 'Outflow') {
  //           balancesByCurrency[currency].payout_balance -= amount;
  //         } else if (tx.eventname === 'Fund API Balance') {
  //           balancesByCurrency[currency].api_balance += amount;
  //         }
  //       });

  //       return Object.values(balancesByCurrency);
  //     });

  //     return { data: balances };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Get balances error:', error);
  //     throw new HttpException('Failed to retrieve balances', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  async getBalances(userId: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts', 'accounts.wallet', 'accounts.wallet.transactions'],
      });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  
      const balancesByCurrency = {};
      console.log("User are : ",user)
      user.accounts.forEach(account => {
        if (!account.wallet) {
          console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
          return;
        }
  
        const transactions = account.wallet.transactions || [];
        transactions.forEach(tx => {
          if (!['completed', 'success'].includes(tx.status)) return;
          const currency = tx.currency_settled;
          if (!balancesByCurrency[currency]) {
            balancesByCurrency[currency] = {
              currency,
              collection_balance: 0,
              payout_balance: 0,
              api_balance: 0,
            };
          }
  
          const amount = parseFloat(tx.settled_amount.toString());
          if (isNaN(amount)) {
            console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
            return;
          }
  
          if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
            balancesByCurrency[currency].collection_balance += amount;
            balancesByCurrency[currency].payout_balance += amount;
          } else if (tx.type === 'Outflow') {
            balancesByCurrency[currency].payout_balance -= amount;
          } else if (tx.eventname === 'Fund API Balance') {
            balancesByCurrency[currency].api_balance += amount;
          }
        });
      });
  
      user.accounts.forEach(account => {
        if (account.wallet && account.wallet.balances) {
          account.wallet.balances.forEach(balance => {
            if (!balancesByCurrency[balance.currency]) {
              balancesByCurrency[balance.currency] = {
                currency: balance.currency,
                collection_balance: 0,
                payout_balance: 0,
                api_balance: balance.api_balance || 0,
              };
            }
          });
        }
      });
  
      return {
        status: 200,
        message: 'balance retrieved successfully',
        data: Object.values(balancesByCurrency),
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Get balances error:', error);
      throw new HttpException('Failed to retrieve balances', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async initiateNGNPayout(userId: string, payoutDto: NGNPayoutDto) {
    try {
      const { amount, account_number, bank_code, beneficiary_name, currency, narration, accountId } = payoutDto;

      const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet', 'wallet.transactions'] });
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

      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach(tx => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });

      if (payoutBalance < amountNum) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

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
      console.log(`Payout transaction initiated: ${transaction.transactionid} for ${currency}`);

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
        message: 'Please enter the otp sent to your registered mobile number or email',
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Initiate NGN payout error:', error);
      throw new HttpException('Failed to initiate NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async completeNGNPayout(userId: string, completeDto: NGNCompletePayoutDto) {
    try {
      const { Id, token } = completeDto;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

      if (user.payoutOtp !== token || !user.payoutOtpExpiresAt || user.payoutOtpExpiresAt < new Date() || user.pendingPayoutId !== Id) {
        throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
      }

      const transaction = await this.transactionRepository.findOne({
        where: { transactionid: Id, wallet: { account: { users: { id: userId } } } },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!transaction) throw new HttpException('Transaction not found', HttpStatus.NOT_FOUND);

      const wallet = transaction.wallet;
      if (!wallet) {
        console.warn(`Transaction ${Id} has no associated wallet`);
        throw new HttpException('Cannot complete payout: No wallet found', HttpStatus.BAD_REQUEST);
      }

      const transactions = wallet.transactions || [];
      let payoutBalance = 0;
      transactions.forEach(tx => {
        if (!['completed', 'success'].includes(tx.status)) return;
        const amount = parseFloat(tx.settled_amount.toString());
        if (isNaN(amount)) {
          console.warn(`Invalid settled_amount for transaction ${tx.transactionid}: ${tx.settled_amount}`);
          return;
        }
        if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
          payoutBalance += amount;
        } else if (tx.type === 'Outflow') {
          payoutBalance -= amount;
        }
      });

      if (payoutBalance < transaction.total_amount) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

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
      throw new HttpException('Failed to complete NGN payout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // async initiateUSDPayout(userId: string, payoutDto: USDPayoutDto) {
  //   try {
  //     const { amount, account_number, bank_code, beneficiary_name, currency, narration, accountId } = payoutDto;

  //     const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet', 'wallet.transactions'] });
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

  //     const transactions = wallet.transactions || [];
  //     let payoutBalance = 0;
  //     transactions.forEach(tx => {
  //       if (!['completed', 'success'].includes(tx.status)) return;
  //       if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
  //         payoutBalance += tx.settled_amount;
  //       } else if (tx.type === 'Outflow') {
  //         payoutBalance -= tx.settled_amount;
  //       }
  //     });

  //     if (payoutBalance < amountNum) throw new HttpException('Insufficient payout balance', HttpStatus.BAD_REQUEST);

  //     const payoutId = `Flick-${crypto.randomBytes(5).toString('hex')}`;
  //     const otp = crypto.randomInt(100000, 999999).toString();
  //     const otpExpiresAt = this.getOtpExpiry();

  //     await this.userRepository.updateUser(user.id, {
  //       payoutOtp: otp,
  //       payoutOtpExpiresAt: otpExpiresAt,
  //       pendingPayoutId: payoutId,
  //     });

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
  //       balance_before: payoutBalance,
  //       balance_after: payoutBalance,
  //       channel: 'bank_transfer',
  //       beneficiary_bank: bank.bank_name,
  //       email: user.email,
  //       wallet,
  //     });
  //     await this.transactionRepository.save(transaction);
  //     console.log(`USD Payout transaction initiated: ${transaction.transactionid} for ${currency}`);

  //     try {
  //       await this.emailService.sendPayoutOtp(user.email, otp, {
  //         amount: amountNum,
  //         beneficiary_name,
  //         bank_name: bank.bank_name,
  //         account_number,
  //       });
  //     } catch (error) {
  //       console.error(`Failed to send OTP for USD payout ${payoutId}:`, error);
  //       console.log(`Fallback OTP for ${user.email}: ${otp}`);
  //     }

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
  //     console.error('Initiate USD payout error:', error);
  //     throw new HttpException('Failed to initiate USD payout', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }









//  async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
//     try {
//       const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts'] });
//       if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//       const existingAccount = await this.accountRepository.findByBusinessId(addBusinessDto.businessId);
//       if (existingAccount) throw new HttpException('Business ID already exists', HttpStatus.BAD_REQUEST);

//       const account = await this.accountRepository.save(
//         this.accountRepository.create({
//           businessId: addBusinessDto.businessId,
//           business_name: addBusinessDto.business_name,
//           business_type: addBusinessDto.business_type,
//           checkout_settings: {
//             customization: {
//               primaryColor: '#035c22',
//               brandName: addBusinessDto.business_name,
//               showLogo: true,
//               showBrandName: false,
//               secondaryColor: '#eaeaea',
//             },
//             card: true,
//             bank_transfer: true,
//           },
//           merchantCode: `SUB_${crypto.randomBytes(8).toString('hex')}`,
//           superMerchantCode: `CUS_${crypto.randomBytes(8).toString('hex')}`,
//           webhook_url: 'https://3y10e3mvk2.execute-api.us-east-2.amazonaws.com/production/hooks/test-outbound',
//           settlementType: { settledType: 'flexible', fee: '0' },
//           FPR: { merchant: false, customer: true },
//           YPEM: { bankAccount: false, payoutBalance: true },
//           users: [user],
//           isVulaUser: false,
//           is_identity_only: false,
//           is_regular: true,
//           is_otc: false,
//           is_portco: false,
//           is_tx: false,
//           is_vc: false,
//           isLive: false,
//           dated: new Date(),
//         }),
//       );
//       console.log(`Account created: ${account.id} for businessId: ${addBusinessDto.businessId}`);

//       const currencies = addBusinessDto.currencies && addBusinessDto.currencies.length > 0 ? addBusinessDto.currencies : ['NGN'];
//       const walletData: Partial<Wallet> = {
//         balances: currencies.map(currency => ({
//           currency,
//           collection_balance: 0,
//           payout_balance: 1000,
//           api_balance: currency === 'NGN' ? 0 : undefined,
//         })),
//         account,
//       };
//       const wallet = await this.walletRepository.save(
//         this.walletRepository.create(walletData),
//       );
//       console.log(`Wallet created: ${wallet.id} for account: ${account.id}`);

//       const initialTransactions = [];
//       for (const currency of currencies) {
//         // const balance = wallet.balances.find(b => b.currency === currency);
//         const transaction = this.transactionRepository.create({
//           eventname: 'Initial Funding',
//           transtype: 'credit',
//           total_amount: 1000,
//           settled_amount: 1000,
//           fee_charged: 0,
//           currency_settled: currency,
//           dated: new Date(),
//           status: 'success',
//           initiator: user.email,
//           type: 'Inflow',
//           transactionid: `flick-${crypto.randomUUID()}`,
//           narration: `Initial wallet funding for ${currency} for new business`,
//           balance_before: 0,
//           balance_after: 1000,
//           channel: 'system',
//           beneficiary_bank: null,
//           email: user.email,
//           wallet,
//         });
//         await this.transactionRepository.save(transaction);
//         console.log(`Transaction created: ${transaction.transactionid} for currency: ${currency}`);
//         initialTransactions.push({
//           transactionid: transaction.transactionid,
//           amount: transaction.total_amount,
//           currency: transaction.currency_settled,
//           status: transaction.status,
//           dated: transaction.dated,
//         });
//       }

//       return {
//         message: 'Business added successfully',
//         account: { id: account.id, businessId: account.businessId },
//         wallet: { id: wallet.id, balances: wallet.balances },
//         initialTransactions,
//       };
//     } catch (error) {
//       if (error instanceof HttpException) throw error;
//       console.error('Add business error:', error);
//       throw new HttpException('Failed to add business', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
  
//  async getBalances(userId: string) {
//     try {
//       const user = await this.userRepository.findOne({ where: { id: userId }, relations: ['accounts', 'accounts.wallet', 'accounts.wallet.transactions'] });
//       if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

//       const balances = user.accounts.flatMap(account => {
//         if (!account.wallet) {
//           console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
//           return [];
//         }

//         const transactions = account.wallet.transactions || [];
//         const balancesByCurrency = {};

//         transactions.forEach(tx => {
//           if (tx.status !== 'completed') return;
//           const currency = tx.currency_settled;
//           if (!balancesByCurrency[currency]) {
//             balancesByCurrency[currency] = {
//               currency,
//               collection_balance: 0,
//               payout_balance: 0,
//               api_balance: account.wallet.balances.find(b => b.currency === currency)?.api_balance || 0,
//             };
//           }

//           if (tx.type === 'Inflow' && tx.eventname !== 'Fund API Balance') {
//             balancesByCurrency[currency].collection_balance += tx.settled_amount;
//             balancesByCurrency[currency].payout_balance += tx.settled_amount;
//           } else if (tx.type === 'Outflow') {
//             balancesByCurrency[currency].payout_balance -= tx.settled_amount;
//           }
//         });

//         return Object.values(balancesByCurrency);
//       });

//       return { data: balances };
//     } catch (error) {
//       if (error instanceof HttpException) throw error;
//       console.error('Get balances error:', error);
//       throw new HttpException('Failed to retrieve balances', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }
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
          total_inflow_amount: 0,
          total_outflow_amount: 0,
          total_transaction_no: '0',
        },
        data: [],
      };
    }

    const transactions = account.wallet.transactions.map(tx => ({
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
          .filter(tx => tx.type === 'Inflow')
          .reduce((sum, tx) => sum + tx.total_amount, 0),
        total_outflow_amount: transactions
          .filter(tx => tx.type === 'Outflow')
          .reduce((sum, tx) => sum + tx.total_amount, 0),
        total_transaction_no: transactions.length.toString(),
      },
      data: transactions,
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    console.error('Get transactions error:', error);
    throw new HttpException('Failed to retrieve transactions', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  
  //  async getTransactions(accountId: string) {
  //   try {
  //     const account = await this.accountRepository.findOne({ where: { id: accountId }, relations: ['wallet', 'wallet.transactions'] });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     if (!account.wallet) {
  //       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
  //       return {
  //         message: 'No transactions available due to missing wallet',
  //         stats: {
  //           range: 'all time',
  //           currency: 'NGN',
  //           total_amount: 0,
  //           transaction_no: '0',
  //         },
  //         data: [],
  //       };
  //     }

  //     const transactions = account.wallet.transactions.map(tx => ({
  //       ...tx,
  //       dated_ago: this.getTimeAgo(tx.dated),
  //       total_amount: tx.total_amount.toString(),
  //       settled_amount: tx.settled_amount.toString(),
  //       balance_before: tx.balance_before.toString(),
  //       balance_after: tx.balance_after.toString(),
  //     }));
  //     return {
  //       message: 'collection transactions fetched successfully',
  //       stats: {
  //         range: 'all time',
  //                  currency: 'NGN', // Adjust if multi-currency

  //         total_amount: transactions.reduce((sum, tx) => sum + (tx.type === 'Inflow' ? Number(tx.total_amount) : 0), 0),
  //         transaction_no: transactions.filter(tx => tx.type === 'Inflow').length.toString(),
  //       },
  //       data: transactions.filter(tx => tx.type === 'Inflow'),
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Get transactions error:', error);
  //     throw new HttpException('Failed to retrieve transactions', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

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
  // async createCharge(userId: string, chargeDto: CreateChargeDto) {
  //   try {
  //     const account = await this.accountRepository.findOne({ where: { id: chargeDto.accountId },
  //     relations: ['wallet'], });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     if (!account.wallet) {
  //       console.warn(`Account ${account.id} (businessId: ${account.businessId}) has no wallet`);
  //       throw new HttpException('Cannot create charge: Account has no wallet', HttpStatus.BAD_REQUEST);
  //     }

  //     const transactionId = `flick-${crypto.randomUUID()}`;
  //     const charges = Math.round(chargeDto.amount * 0.0135);
  //     const amountPayable = chargeDto.amount;
  //     const nairaEquivalent = chargeDto.currency === 'NGN' ? amountPayable : amountPayable * 1;
  //     const paymentUrl = `https://checkout.paywithflick.co/pages/${crypto.randomBytes(5).toString('hex')}`;

  //     const wallet = account.wallet;
  //     const balance = wallet.balances.find(b => b.currency === chargeDto.currency)?.payout_balance || 0;

  //     console.log("real")

  //     const transaction = this.transactionRepository.create({
  //       eventname: 'Charge',
  //       transtype: 'credit',
  //       total_amount: chargeDto.amount + charges,
  //       settled_amount: amountPayable,
  //       fee_charged: charges,
  //       currency_settled: chargeDto.currency,
  //       dated: new Date(),
  //       status: 'pending',
  //       initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       type: 'Inflow',
  //       transactionid: transactionId,
  //       narration: 'Charge initiated',
  //       balance_before: balance,
  //       balance_after: balance,
  //       channel: 'card',
  //       beneficiary_bank: null,
  //       email: (await this.userRepository.findOne({ where: { id: userId } })).email,
  //       wallet,
  //     });

  //     await this.transactionRepository.save(transaction);
  //     console.log("hello")

  //     return {
  //       data: {
  //         transactionId,
  //         url: paymentUrl,
  //         currency: chargeDto.currency,
  //         currency_collected: chargeDto.currency,
  //         nairaEquivalent,
  //         amount: chargeDto.amount + charges,
  //         charges,
  //         amountPayable,
  //         payableFxAmountString: `₦${amountPayable.toFixed(2)}`,
  //         payableAmountString: `₦${amountPayable.toFixed(2)}`,
  //         rate: 1,
  //         currency_settled: chargeDto.currency,
  //       },
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Create charge error:', error);
  //     throw new HttpException('Failed to create charge', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

  //   async nubanCreateMerchant(userId: string, nubanDto: NubanCreateMerchantDto) {
  //   try {
  //     const { accountId, bankCode, bankName, accountNumber } = nubanDto;

  //     const account = await this.accountRepository.findOne({ where: { id: accountId } });
  //     if (!account) throw new HttpException('Account not found', HttpStatus.NOT_FOUND);

  //     const user = await this.userRepository.findOne({ where: { id: userId } });
  //     if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

  //     const bank = await this.bankRepository.findOne({ where: { bank_code: bankCode, bank_name: bankName } });
  //     if (!bank) throw new HttpException('Invalid bank code or name', HttpStatus.BAD_REQUEST);

  //     return {
  //       status: 200,
  //       message: 'successfully generated merchant nuban',
  //       data: [
  //         {
  //           bank_code: bankCode,
  //           bank_name: bankName,
  //           account_name: `Flick ${account.business_name}`,
  //           account_number: accountNumber,
  //         },
  //       ],
  //     };
  //   } catch (error) {
  //     if (error instanceof HttpException) throw error;
  //     console.error('Nuban create merchant error:', error);
  //     throw new HttpException('Failed to generate merchant nuban', HttpStatus.INTERNAL_SERVER_ERROR);
  //   }
  // }

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

async initiateUSDPayout1(userId: string, payoutDto: USDPayoutDto) {
  try {
    const account = await this.accountRepository.findOne({
      where: { id: payoutDto.accountId, users: { id: userId } },
      relations: ['wallet', 'wallet.transactions'],
    });
    if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

    if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
    });
    if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);
    console.log("2")
    const currency = payoutDto.currency; // USD, GBP, or EUR
    const amount = parseFloat(payoutDto.amount.toString());
    if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    console.log("3")

    // Fetch exchange rate
    const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
    const ngnAmount = amount * exchangeRate;
    const feeCharged = amount * 0.25; // 25% fee as per example
    const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
    console.log("4")

    // Check NGN balance
    const wallet = account.wallet;
    const ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
    console.log("5", ngnBalance)

    if (!ngnBalance || ngnBalance.payout_balance < totalNgnAmount) {
      throw new HttpException('Insufficient NGN balance', HttpStatus.BAD_REQUEST);
    }

    // Update NGN balance
    ngnBalance.payout_balance -= totalNgnAmount;
    console.log("6")

    await this.walletRepository.save(wallet);

    // Update or create target currency balance
    let targetBalance = wallet.balances.find(b => b.currency === currency);
    console.log("7")

    if (!targetBalance) {
      targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
      wallet.balances.push(targetBalance);
    }
    targetBalance.payout_balance -= amount + feeCharged;
    console.log("8")

    await this.walletRepository.save(wallet);

    // Create transaction
    const transactionId = `ex-${crypto.randomUUID()}`;
    const transaction = this.transactionRepository.create({
      eventname: `Payout to ${currency}`,
      transtype: 'debit',
      total_amount: totalNgnAmount,
      settled_amount: amount,
      fee_charged: feeCharged,
      currency_settled: currency,
      dated: new Date(),
      status: 'initiated',
      initiator: (await this.userRepository.findOne({ where: { id: userId } })).email,
      type: 'Outflow',
      transactionid: transactionId,
      narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
      balance_before: ngnBalance.payout_balance + totalNgnAmount,
      balance_after: ngnBalance.payout_balance,
      channel: beneficiary.transfer_type,
      beneficiary_bank: beneficiary.bank_name,
      email: (await this.userRepository.findOne({ where: { id: userId } })).email,
      wallet,
    });
    console.log("9")


    await this.transactionRepository.save(transaction);
    console.log("10")

    return {
      status: 200,
      message: 'Payout queued successfully',
      transaction_status: 'initiated',
      meta: {
        Id: transactionId,
        debit_currency: 'NGN',
        amount: amount.toString(),
        credit_currency: currency,
        fee_charged: feeCharged,
        total_amount: amount + feeCharged,
        dated: transaction.dated.toISOString(),
        beneficiary_id: beneficiary.beneficiary_id,
        bank_name: beneficiary.bank_name,
        account_no: beneficiary.account_no,
        sort_code: beneficiary.routing,
      },
    };
  } catch (error) {
    console.error('Initiate payout error:', error);
      if (error instanceof HttpException) {
    throw error; }
    throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

async initiateUSDPayout2(userId: string, payoutDto: USDPayoutDto) {
  try {
    const account = await this.accountRepository.findOne({
      where: { id: payoutDto.accountId, users: { id: userId } },
      relations: ['wallet', 'wallet.balances'],
    });

    if (!account || !account.wallet) {
      throw new HttpException('Account or wallet not found', HttpStatus.NOT_FOUND);
    }

    const wallet = account.wallet;

    const balancesByCurrency = {};
    wallet.balances.forEach(balance => {
      balancesByCurrency[balance.currency] = balance;
    });

    const ngnBalance = balancesByCurrency['NGN'];
    if (!ngnBalance) {
      throw new HttpException('NGN balance not found', HttpStatus.BAD_REQUEST);
    }

    const currency = payoutDto.currency; // e.g. 'USD'
    const amount = parseFloat(payoutDto.amount.toString());
    if (isNaN(amount) || amount <= 0) {
      throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);
    }

    const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
    const ngnAmount = amount * exchangeRate;
    const feeCharged = amount * 0.25; // 25% fee
    const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;

    if (ngnBalance.payout_balance < totalNgnAmount) {
      throw new HttpException('Insufficient NGN balance', HttpStatus.BAD_REQUEST);
    }

    // Deduct NGN
    const balanceBefore = ngnBalance.payout_balance;
    ngnBalance.payout_balance -= totalNgnAmount;
    await this.walletRepository.save(wallet);

    // Update target currency balance (e.g. USD)
    let targetBalance = balancesByCurrency[currency];
    if (!targetBalance) {
      targetBalance = {
        currency,
        api_balance: 0,
        collection_balance: 0,
        payout_balance: 0,
        wallet,
      };
      wallet.balances.push(targetBalance);
    }

    targetBalance.payout_balance -= amount + feeCharged;
    await this.walletRepository.save(wallet);

    const user = await this.userRepository.findOne({ where: { id: userId } });
    const beneficiary = await this.beneficiaryRepository.findOne({
      where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
    });
    if (!beneficiary) {
      throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);
    }

    const transactionId = `ex-${crypto.randomUUID()}`;
    const transaction = this.transactionRepository.create({
      eventname: `Payout to ${currency}`,
      transtype: 'debit',
      total_amount: totalNgnAmount,
      settled_amount: amount,
      fee_charged: feeCharged,
      currency_settled: currency,
      dated: new Date(),
      status: 'initiated',
      initiator: user.email,
      type: 'Outflow',
      transactionid: transactionId,
      narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
      balance_before: balanceBefore,
      balance_after: ngnBalance.payout_balance,
      channel: beneficiary.transfer_type,
      beneficiary_bank: beneficiary.bank_name,
      email: user.email,
      wallet,
    });

    await this.transactionRepository.save(transaction);

    return {
      status: 200,
      message: 'Payout queued successfully',
      transaction_status: 'initiated',
      meta: {
        Id: transactionId,
        debit_currency: 'NGN',
        amount: amount.toString(),
        credit_currency: currency,
        fee_charged: feeCharged,
        total_amount: amount + feeCharged,
        dated: transaction.dated.toISOString(),
        beneficiary_id: beneficiary.beneficiary_id,
        bank_name: beneficiary.bank_name,
        account_no: beneficiary.account_no,
        sort_code: beneficiary.routing,
      },
    };
  } catch (error) {
    console.error('Initiate payout error:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

  async initiateUSDPayout3(userId: string, payoutDto: USDPayoutDto) {
    try {
      console.log('1: Fetching account for userId:', userId, 'accountId:', payoutDto.accountId);
      const account = await this.accountRepository.findOne({
        where: { id: payoutDto.accountId, users: { id: userId } },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

      if (!account.account_no) {
        throw new HttpException('Account has no associated account number', HttpStatus.BAD_REQUEST);
      }

      if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

      console.log('2: Fetching beneficiary:', payoutDto.beneficiary_id);
      const beneficiary = await this.beneficiaryRepository.findOne({
        where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
      });
      if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);

      const currency = payoutDto.currency;
      const amount = parseFloat(payoutDto.amount.toString());
      console.log('3: Parsed amount:', amount, 'currency:', currency);
      if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

      console.log('4: Fetching exchange rate for NGN/', currency);
      const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
      const ngnAmount = amount * exchangeRate;
      const feeCharged = amount * 0.25;
      const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
      console.log('5: Calculated NGN amount:', ngnAmount, 'fee:', feeCharged, 'total:', totalNgnAmount);

      const wallet = account.wallet;
      let ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
      console.log('6: NGN balance:', ngnBalance);

      if (!ngnBalance) {
        console.log('7: Initializing NGN balance');
        ngnBalance = { currency: 'NGN', api_balance: 0, payout_balance: 0, collection_balance: 0 };
        wallet.balances.push(ngnBalance);
        await this.walletRepository.save(wallet);
      }

      if (ngnBalance.payout_balance < totalNgnAmount) {
        console.log('8: Insufficient balance - required:', totalNgnAmount, 'available:', ngnBalance.payout_balance);
        throw new HttpException(
          `Insufficient NGN balance: need ${totalNgnAmount.toFixed(2)} NGN, have ${ngnBalance.payout_balance.toFixed(2)} NGN`,
          HttpStatus.BAD_REQUEST
        );
      }

      console.log('9: Updating NGN balance');
      ngnBalance.payout_balance -= totalNgnAmount;
      await this.walletRepository.save(wallet);

      console.log('10: Updating target currency balance');
      let targetBalance = wallet.balances.find(b => b.currency === currency);
      if (!targetBalance) {
        targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
        wallet.balances.push(targetBalance);
      }
      targetBalance.payout_balance -= amount + feeCharged;
      await this.walletRepository.save(wallet);

      console.log('11: Creating transaction');
      const transactionId = `ex-${crypto.randomUUID()}`;
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const transaction = this.transactionRepository.create({
        eventname: `Payout to ${currency}`,
        transtype: 'debit',
        total_amount: totalNgnAmount,
        settled_amount: amount,
        fee_charged: feeCharged,
        currency_settled: currency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Outflow',
        transactionid: transactionId,
        narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
        balance_before: ngnBalance.payout_balance + totalNgnAmount,
        balance_after: ngnBalance.payout_balance,
        channel: beneficiary.transfer_type,
        beneficiary_bank: beneficiary.bank_name,
        email: user.email,
        wallet,
      });

      console.log('12: Saving transaction');
      await this.transactionRepository.save(transaction);

      console.log('13: Payout successful');
      return {
        status: 200,
        message: 'Payout queued successfully',
        transaction_status: 'initiated',
        meta: {
          Id: transactionId,
          debit_currency: 'NGN',
          amount: amount.toString(),
          credit_currency: currency,
          fee_charged: feeCharged,
          total_amount: amount + feeCharged,
          dated: transaction.dated.toISOString(),
          beneficiary_id: beneficiary.beneficiary_id,
          bank_name: beneficiary.bank_name,
          account_no: beneficiary.account_no,
          sort_code: beneficiary.routing,
        },
      };
    } catch (error) {
      console.error('Initiate payout error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

   async initiateUSDPayout(userId: string, payoutDto: USDPayoutDto) {
    try {
      console.log('1: Fetching account for userId:', userId, 'accountId:', payoutDto.accountId);
      const account = await this.accountRepository.findOne({
        where: { id: payoutDto.accountId, users: { id: userId } },
        relations: ['wallet', 'wallet.transactions'],
      });
      if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

      if (!account.account_no) {
        throw new HttpException('Account has no associated account number', HttpStatus.BAD_REQUEST);
      }

      if (!account.wallet) throw new HttpException('No wallet associated with account', HttpStatus.BAD_REQUEST);

      console.log('2: Fetching beneficiary:', payoutDto.beneficiary_id);
      const beneficiary = await this.beneficiaryRepository.findOne({
        where: { beneficiary_id: payoutDto.beneficiary_id, account_id: account.id },
      });
      if (!beneficiary) throw new HttpException('Beneficiary not found', HttpStatus.NOT_FOUND);

      const currency = payoutDto.currency;
      const amount = parseFloat(payoutDto.amount.toString());
      console.log('3: Parsed amount:', amount, 'currency:', currency);
      if (isNaN(amount) || amount <= 0) throw new HttpException('Invalid amount', HttpStatus.BAD_REQUEST);

      console.log('4: Fetching exchange rate for NGN/', currency);
      const exchangeRate = await this.exchangeRateService.getExchangeRate('NGN', currency);
      const ngnAmount = amount * exchangeRate;
      const feeCharged = amount * 0.25;
      const totalNgnAmount = ngnAmount + feeCharged * exchangeRate;
      console.log('5: Calculated NGN amount:', ngnAmount, 'fee:', feeCharged, 'total:', totalNgnAmount);

      const wallet = account.wallet;
      let ngnBalance = wallet.balances.find(b => b.currency === 'NGN');
      console.log('6: NGN balance:', ngnBalance);

      if (!ngnBalance) {
        console.log('7: Initializing NGN balance');
        ngnBalance = { currency: 'NGN', api_balance: 0, payout_balance: 0, collection_balance: 0 };
        wallet.balances.push(ngnBalance);
        await this.walletRepository.save(wallet);
      }

      if (ngnBalance.payout_balance < totalNgnAmount) {
        console.log('8: Insufficient balance - required:', totalNgnAmount, 'available:', ngnBalance.payout_balance);
        throw new HttpException(
          `Insufficient NGN balance: need ${totalNgnAmount.toFixed(2)} NGN, have ${ngnBalance.payout_balance.toFixed(2)} NGN`,
          HttpStatus.BAD_REQUEST
        );
      }

      console.log('9: Updating NGN balance');
      ngnBalance.payout_balance -= totalNgnAmount;
      await this.walletRepository.save(wallet);

      console.log('10: Updating target currency balance');
      let targetBalance = wallet.balances.find(b => b.currency === currency);
      if (!targetBalance) {
        targetBalance = { currency, api_balance: 0, payout_balance: 0, collection_balance: 0 };
        wallet.balances.push(targetBalance);
      }
      targetBalance.payout_balance -= amount + feeCharged;
      await this.walletRepository.save(wallet);

      console.log('11: Creating transaction');
      const transactionId = `ex-${crypto.randomUUID()}`;
      const user = await this.userRepository.findOne({ where: { id: userId } });
      const transaction = this.transactionRepository.create({
        eventname: `Payout to ${currency}`,
        transtype: 'debit',
        total_amount: totalNgnAmount,
        settled_amount: amount,
        fee_charged: feeCharged,
        currency_settled: currency,
        dated: new Date(),
        status: 'initiated',
        initiator: user.email,
        type: 'Outflow',
        transactionid: transactionId,
        narration: `Payout of ${amount} ${currency} to ${beneficiary.beneficiary_name}`,
        balance_before: ngnBalance.payout_balance + totalNgnAmount,
        balance_after: ngnBalance.payout_balance,
        channel: beneficiary.transfer_type,
        beneficiary_bank: beneficiary.bank_name,
        email: user.email,
        wallet,
      });

      console.log('12: Saving transaction');
      await this.transactionRepository.save(transaction);

      console.log('13: Payout successful');
      return {
        status: 200,
        message: 'Payout queued successfully',
        transaction_status: 'initiated',
        meta: {
          Id: transactionId,
          debit_currency: 'NGN',
          amount: amount.toString(),
          credit_currency: currency,
          fee_charged: feeCharged,
          total_amount: amount + feeCharged,
          dated: transaction.dated.toISOString(),
          beneficiary_id: beneficiary.beneficiary_id,
          bank_name: beneficiary.bank_name,
          account_no: beneficiary.account_no,
          sort_code: beneficiary.routing,
        },
      };
    } catch (error) {
      console.error('Initiate payout error:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to initiate payout', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  async getCountries() {
  try {
    const countries = await this.countryRepository.findAll();
    return {
      status: 200,
      message: 'Countries retrieved successfully',
      data: countries.map(country => ({
        name: country.name,
        iso2: country.iso2,
      })),
    };
  } catch (error) {
    console.error('Get countries error:', error);
      if (error instanceof HttpException) {
    throw error; }
    throw new HttpException('Failed to retrieve countries', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}


async getBeneficiaries(userId: string, accountId: string) {
  try {
    const account = await this.accountRepository.findOne({
      where: { id: accountId, users: { id: userId } },
    });
    if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

    const beneficiaries = await this.beneficiaryRepository.findByAccountId(accountId);
    return {
      status: 200,
      message: 'data retrieved successfully',
      count: beneficiaries.length,
      data: beneficiaries.map(b => ({
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
    throw new HttpException('Failed to retrieve beneficiaries', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
  async saveBeneficiary(userId: string, beneficiaryDto: SaveBeneficiaryDto): Promise<Beneficiary> {
    try {
      const account = await this.accountRepository.findOne({
        where: { id: beneficiaryDto.accountId, users: { id: userId } },
      });
      if (!account) throw new HttpException('Account not found or unauthorized', HttpStatus.NOT_FOUND);

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
      throw new HttpException('Failed to save beneficiary', HttpStatus.INTERNAL_SERVER_ERROR);
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