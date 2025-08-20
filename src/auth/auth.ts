/* eslint-disable prettier/prettier */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { AddBusinessDto, ForgotPasswordDto, LoginDto, ResendOtpDto, ResetPasswordDto, SignUpDto, VerifyEmailDto } from 'src/application/dtos/auth.dto';
import { UserRepository } from '../infrastructure/repositories/user.repository';
import { EmailService } from '../infrastructure/services/email/email.service';
import { hash, compare } from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AccountRepository } from '../infrastructure/repositories/account.repository';
import { WalletRepository } from '../infrastructure/repositories/wallet.repository';
import { TokenEncryptionUtil } from '../config/utils/TokenEncryptionUtil';
import { TransactionRepository } from '../infrastructure/repositories/transaction.repository';
// import { Wallet } from 'src/domain/entities/wallet.entity';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly accountRepository: AccountRepository,
    private readonly walletRepository: WalletRepository,
    private tokenEncryptionUtil: TokenEncryptionUtil,
        private readonly transactionRepository: TransactionRepository,

  ) {}

   private getOtpExpiry(minutes = 10): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
//    async signUp(signUpDto: SignUpDto) {
//     try {
//       const existingUser = await this.userRepository.findByEmail( signUpDto.email);
//       if (existingUser) throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);

//       const hashedPassword = await hash(signUpDto.password, 10);
//       const otp = crypto.randomInt(100000, 999999).toString();
//       const verificationExpiresAt = this.getOtpExpiry();


//       const user = await this.userRepository.createUser({
//      ...signUpDto,
//         password: hashedPassword,
//         verificationCode: otp,
//         verificationExpiresAt,
//         isVerified: false,
//         referral_code: crypto.randomBytes(5).toString('hex'),
//       });
// console.log(user)
    
//         await this.emailService.sendVerificationEmail(signUpDto.email, otp);
   

//       return { message: 'Please verify your email with the OTP sent', 
//         data: user
//        };
//     } catch (error) {
//       if (error instanceof HttpException) throw error;
//       console.error('Sign up error:', error);
//       throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
//     }
//   }

// async signUp(signUpDto: SignUpDto) {
//   try {
//     const existingUser = await this.userRepository.findByEmail(signUpDto.email);
//     if (existingUser) {
//       throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);
//     }
    

//     const hashedPassword = await hash(signUpDto.password, 10);
//     const otp = crypto.randomInt(100000, 999999).toString();
//     const verificationExpiresAt = this.getOtpExpiry();

   

//     // console.log('✅ User created:', user.id);

//     const account = await this.accountRepository.save(
//       this.accountRepository.create({
//         businessId: signUpDto.businessId,
//         business_name: `${signUpDto.business_name}'s Business`,
//         business_type: 'merchant',
//         currency: signUpDto.currencies?.[0] || 'NGN',
//         country: signUpDto.country,
//         account_no: signUpDto.account_no,
//         account_name: signUpDto.account_name,
//         bank_name: signUpDto.bank_name,
//         // users: [user],
//       }),
//     );

//     console.log('✅ Account created:', account.id);
//     const initialFundingAmount = 1000;
//     const selectedCurrencies = signUpDto.currencies || ['NGN'];

//     const balances = selectedCurrencies.map(currency => ({
//       currency,
//       api_balance: 0,
//       payout_balance: initialFundingAmount,
//       collection_balance: initialFundingAmount,
//     }));

//     const wallet = this.walletRepository.create({
//       account,
//       account_id: account.id,
//       balances,
//     });
//     await this.walletRepository.save(wallet);
//     console.log('✅ Wallet created:', wallet.id);

//     for (const balance of balances) {
//       const transactionId = `flick-${crypto.randomUUID()}`;
//       const initialFunding = this.transactionRepository.create({
//         eventname: `Initial Funding ${balance.currency}`,
//         transtype: 'credit',
//         total_amount: balance.collection_balance,
//         settled_amount: balance.collection_balance,
//         fee_charged: 0,
//         currency_settled: balance.currency,
//         dated: new Date(),
//         status: 'success',
//         initiator: signUpDto.email,
//         type: 'Inflow',
//         transactionid: transactionId,
//         narration: `Initial wallet funding for ${balance.currency} on signup`,
//         balance_before: 0,
//         balance_after: balance.collection_balance,
//         channel: 'system',
//         email: signUpDto.email,
//         wallet,
//       });

//       await this.transactionRepository.save(initialFunding);
//       console.log(`✅ Initial funding transaction created for ${balance.currency}:`, transactionId);
//     }

//      const user = await this.userRepository.createUser({
//       ...signUpDto,
//       password: hashedPassword,
//       verificationCode: otp,
//       verificationExpiresAt,
//       isVerified: false,
//       referral_code: crypto.randomBytes(5).toString('hex'),
//     });

//     await this.emailService.sendVerificationEmail(signUpDto.email, otp);

//     return {
//       message: 'Please verify your email with the OTP sent',
//       data: {
//         user,
//         accountId: account.id,
//         walletId: wallet.id,
//       },
//     };
//   } catch (error) {
//     console.error('Sign up error:', error);
//     if (error instanceof HttpException) throw error;

//     throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
//   }
// }
async signUp(signUpDto: SignUpDto & Partial<AddBusinessDto>) {
  try {
    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);

    const hashedPassword = await hash(signUpDto.password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const verificationExpiresAt = this.getOtpExpiry();

    const user = await this.userRepository.createUser({
      ...signUpDto,
      password: hashedPassword,
      verificationCode: otp,
      verificationExpiresAt,
      isVerified: false,
      referral_code: crypto.randomBytes(5).toString('hex'),
    });

    console.log('1: Created user:', user.id);

    await this.emailService.sendVerificationEmail(signUpDto.email, otp);

    const businessDto: AddBusinessDto = {
      businessId: signUpDto.businessId || crypto.randomUUID(),
      business_name: `${signUpDto.business_name} Business`,
      currencies: signUpDto.currencies || ['NGN'],
      business_type: 'merchant',
        country: signUpDto.country || '',
        account_no: signUpDto.account_no || '',
        account_name: signUpDto.account_name || '',
        bank_name: signUpDto.bank_name || '',
    };

    const businessResult = await this.addBusiness(user.id, businessDto);
    console.log('2: Business/account/wallet created for user:', businessResult);

    return {
      message: 'Please verify your email with the OTP sent',
      data: {
        user
      },
    };
  } catch (error) {
    if (error instanceof HttpException) throw error;
    console.error('Sign up error:', error);
    throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

 async addBusiness(userId: string, addBusinessDto: AddBusinessDto) {
    try {
      const user = await this.userRepository.findOne({
        where: { id: userId },
        relations: ['accounts'],
      });

      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }

      if (user.accounts && user.accounts.length > 0) {
        throw new HttpException('User can only have one account', HttpStatus.BAD_REQUEST);
      }

      const { businessId, business_name } = addBusinessDto;

      const existingBusiness = await this.accountRepository.findOne({
        where: [{ businessId }, { business_name }],
      });

      if (existingBusiness) {
        throw new HttpException(
          `Business with businessId '${businessId}' or business_name '${business_name}' already exists`,
          HttpStatus.BAD_REQUEST,
        );
      }

      // Create Account
      const account = this.accountRepository.create({
        ...addBusinessDto,
        business_type: 'merchant',
        currency: addBusinessDto.currencies?.[0],
        users: [user],
      });
      await this.accountRepository.save(account);
      console.log('2: Created account with ID:', account.id);

      // Setup Wallet
      const initialFundingAmount = 1000;
      const selectedCurrencies = addBusinessDto.currencies || [];

      const balances = selectedCurrencies.map(currency => ({
        currency,
        api_balance: 0,
        payout_balance: initialFundingAmount,
        collection_balance: initialFundingAmount,
      }));

      const wallet = this.walletRepository.create({
        account,
        account_id: account.id,
        balances,
      });
      await this.walletRepository.save(wallet);
      console.log('3: Saved wallet with ID:', wallet.id);

      // Initial funding transactions
      for (const balance of balances) {
        const transactionId = `flick-${crypto.randomUUID()}`;
        const initialFunding = this.transactionRepository.create({
          eventname: `Initial Funding ${balance.currency}`,
          transtype: 'credit',
          total_amount: balance.collection_balance,
          settled_amount: balance.collection_balance,
          fee_charged: 0,
          currency_settled: balance.currency,
          dated: new Date(),
          status: 'success',
          initiator: user.email,
          type: 'Inflow',
          transactionid: transactionId,
          narration: `Initial wallet funding for ${balance.currency} on signup`,
          balance_before: 0,
          balance_after: balance.collection_balance,
          channel: 'system',
          email: user.email,
          wallet,
        });
        await this.transactionRepository.save(initialFunding);
        console.log(`4: Created initial funding transaction for ${balance.currency}`);
      }

      return {
        message: 'Business added successfully',
        accountId: account.id,
        walletId: wallet.id,
      };
    } catch (error) {
      console.error('Add business error:', error);
      if (error instanceof HttpException) throw error;

      throw new HttpException(
        error.message || 'Failed to add business',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

 async verifyEmail(verifyEmailDto: VerifyEmailDto) {
  try{
    const { email, otp } = verifyEmailDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.isVerified) throw new HttpException('Email already verified', HttpStatus.BAD_REQUEST);

    if (user.verificationCode !== otp || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }
     if (new Date() > user.verificationExpiresAt!) throw new Error('OTP expired');

    await this.userRepository.updateUser(user.id, {
      isVerified: true,
      verificationCode: null,
      verificationExpiresAt: null,
    });

    return { message: 'Email verified successfully' };
       } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('verify email error:', error);
      throw new HttpException('Failed to verify email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try{
    const { email } = forgotPasswordDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const otp = crypto.randomInt(100000, 999999).toString();
    const resetPasswordExpiresAt = this.getOtpExpiry();

    await this.userRepository.updateUser(user.id, {
      resetPasswordCode: otp,
      resetPasswordExpiresAt,
    });

    await this.emailService.sendPasswordResetEmail(user.email, otp);

    return { message: 'Password reset OTP sent to email' };
       } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('forgot password error:', error);
      throw new HttpException('Failed to forgotten passwoed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async resendOtp(resendOtpDto: ResendOtpDto) {
    try{
    const { email, type } = resendOtpDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = this.getOtpExpiry()

    if (type === 'verification') {
      if (user.isVerified) throw new HttpException('Email already verified', HttpStatus.BAD_REQUEST);
      await this.userRepository.updateUser(user.id, {
        verificationCode: otp,
        verificationExpiresAt: expiresAt,
      });
      await this.emailService.sendVerificationEmail(user.email, otp);
      return { message: 'Verification OTP resent to email' };
    } else if (type === 'password-reset') {
      await this.userRepository.updateUser(user.id, {
        resetPasswordCode: otp,
        resetPasswordExpiresAt: expiresAt,
      });
      await this.emailService.sendPasswordResetEmail(user.email, otp);
      return { message: 'Password reset OTP resent to email' };
    } else {
      throw new HttpException('Invalid OTP type', HttpStatus.BAD_REQUEST);
    }
       } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Reset otp error:', error);
      throw new HttpException('Failed to resend otp', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    try{
    const { email, otp, newPassword } = resetPasswordDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.resetPasswordCode !== otp || !user.resetPasswordExpiresAt || user.resetPasswordExpiresAt < new Date()) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await hash(newPassword, 10);
    await this.userRepository.updateUser(user.id, {
      password: hashedPassword,
      resetPasswordCode: null,
      resetPasswordExpiresAt: null,
    });

    return { message: 'Password reset successfully' };
       } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Reset password error:', error);
      throw new HttpException('Failed to reset password', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async login(loginDto: LoginDto) {
    try{
    const { email, password } = loginDto;                 
    const user = await this.userRepository.findByEmail(email);
    console.log(loginDto.email, "and", email)
    console.log(user)
    if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    if (!user.isVerified) throw new HttpException('Email not verified', HttpStatus.FORBIDDEN);
      console.log("Verification",user.isVerified)
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);
    console.log(jwt)
    const token = this.tokenEncryptionUtil.encryptToken(jwt);

    return { message: 'Login successful', token, accounts: user.accounts };
     } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Login error:', error);
      throw new HttpException('Failed to login', HttpStatus.INTERNAL_SERVER_ERROR);
    } 
  }







}
