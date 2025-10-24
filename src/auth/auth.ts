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
import { User } from '../domain/entities/user.entity';
import { Account } from '../domain/entities/account.entity';
import { DataSource, QueryRunner } from 'typeorm';
import { Wallet } from '../domain/entities/wallet.entity';
import { Transaction } from '../domain/entities/transaction.entity';

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
    private readonly dataSource: DataSource,  


  ) {}

   private getOtpExpiry(minutes = 10): Date {
    return new Date(Date.now() + minutes * 60 * 1000);
  }
async signUp1(signUpDto: SignUpDto & Partial<AddBusinessDto>) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
   signUpDto.email = signUpDto.email.trim().toLowerCase();


    const { confirm_password, ...userPayload } = signUpDto;

    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);

    const existingBusiness = await this.accountRepository.findOne({
      where: [{ business_name: signUpDto.business_name }],
    });
    if (existingBusiness) {
      throw new HttpException(
        `Business with business_name '${signUpDto.business_name}' already exists`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (signUpDto.password !== confirm_password) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await hash(signUpDto.password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    console.log(otp)
    const verificationExpiresAt = this.getOtpExpiry();

    const user = queryRunner.manager.create(User, {
      ...userPayload,
      password: hashedPassword,
      verificationCode: otp,
      verificationExpiresAt,
      isVerified: false,
      referral_code: crypto.randomBytes(5).toString('hex'),
    });
    await queryRunner.manager.save(user);


  await this.emailService.sendVerificationEmail(user.email, otp, signUpDto.name);

    const businessDto = {
      business_name: `${signUpDto.business_name} Business`,
      currencies: ['NGN'],
      business_type: 'merchant',
      country: signUpDto.country,
      bizAddress: signUpDto.bizAddress,
      business_website: signUpDto.business_website,
      account_no: '',
      account_name: '',
      bank_name: '',
    };

    await this.addBusinessTransactional(queryRunner, user.id, businessDto);

    await queryRunner.commitTransaction();

    return {
      message: 'Please verify your email with the OTP sent to your mail',
      data: {},
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Sign up error:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
  } finally {
    await queryRunner.release();
  }
}
async signUp(signUpDto: SignUpDto & Partial<AddBusinessDto>) {
  const queryRunner = this.dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    signUpDto.email = signUpDto.email.trim().toLowerCase();

    const { confirm_password, ...userPayload } = signUpDto;

    const existingUser = await this.userRepository.findByEmail(signUpDto.email);
    if (existingUser) throw new HttpException('Email already exists', HttpStatus.BAD_REQUEST);

    const existingBusiness = await this.accountRepository.findOne({
      where: { business_name: signUpDto.business_name },
    });
    if (existingBusiness) {
      throw new HttpException(
        `Business with business_name '${signUpDto.business_name}' already exists`,
        HttpStatus.BAD_REQUEST,
      );
    }

    if (signUpDto.password !== confirm_password) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await hash(signUpDto.password, 10);
    const otp = crypto.randomInt(100000, 999999).toString();
    const verificationExpiresAt = this.getOtpExpiry();

    const user = queryRunner.manager.create(User, {
      ...userPayload,
      password: hashedPassword,
      verificationCode: otp,
      verificationExpiresAt,
      isVerified: false,
      referral_code: crypto.randomBytes(5).toString('hex'),
    });
    const savedUser = await queryRunner.manager.save(User, user);

    await this.emailService.sendVerificationEmail(user.email, otp, signUpDto.name || signUpDto.business_name);

    const businessDto = {
      business_name: `${signUpDto.business_name} Business`,
      currencies: signUpDto.currencies || ['NGN'],
      business_type: signUpDto.business_type || 'merchant',
      country: signUpDto.country || 'Nigeria',
      bizAddress: signUpDto.bizAddress,
      business_website: signUpDto.business_website,
      account_no: signUpDto.account_no || '',
      account_name: signUpDto.account_name || '',
      bank_name: signUpDto.bank_name || '',
    };

    await this.addBusinessTransactional(queryRunner, savedUser.id, businessDto);

    await queryRunner.commitTransaction();

    return {
      message: 'Please verify your email with the OTP sent to your mail',
      data: {},
    };
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('Sign up error:', error);
    if (error instanceof HttpException) throw error;
    throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
  } finally {
    await queryRunner.release();
  }
}

async addBusinessTransactional1(queryRunner: QueryRunner, userId: string, addBusinessDto: AddBusinessDto) {
  const user = await queryRunner.manager.findOne(User, {
    where: { id: userId },
    relations: ['accounts'],
  });

  if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  if (user.accounts?.length > 0) throw new HttpException('User can only have one account', HttpStatus.BAD_REQUEST);

  const { business_name } = addBusinessDto;

  const existingBusiness = await queryRunner.manager.findOne(Account, {
    where: { business_name },
  });
  if (existingBusiness) {
    throw new HttpException(
      `Business with business_name '${business_name}' already exists`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const account = queryRunner.manager.create(Account, {
    ...addBusinessDto,
    business_type: 'merchant',
    currency: addBusinessDto.currencies?.[0],
    users: [user],
  });
  await queryRunner.manager.save(account);

  const initialFundingAmount = 1000;
  const balances = (addBusinessDto.currencies || []).map(currency => ({
    currency,
    api_balance: 0,
    payout_balance: initialFundingAmount,
    collection_balance: initialFundingAmount,
  }));

  const wallet = queryRunner.manager.create(Wallet, {
    account,
    account_id: account.id,
    balances,
  });
  await queryRunner.manager.save(wallet);

  for (const balance of balances) {
    const transactionId = `flick-${crypto.randomUUID()}`;
    const initialFunding = queryRunner.manager.create(Transaction, {
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
    await queryRunner.manager.save(initialFunding);
  }

  return {
    message: 'Business added successfully',
    accountId: account.id,
    // walletId: wallet.id,
    wallet_id: wallet.id,

  };
}
async addBusinessTransactional(queryRunner: QueryRunner, userId: string, addBusinessDto: AddBusinessDto) {
  const user = await queryRunner.manager.findOne(User, {
    where: { id: userId },
    relations: ['accounts'],
  });

  if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
  if (user.accounts?.length > 0) throw new HttpException('User can only have one account', HttpStatus.BAD_REQUEST);

  const { business_name } = addBusinessDto;

  const existingBusiness = await queryRunner.manager.findOne(Account, {
    where: { business_name }, // ✅ Simplified where clause
  });
  if (existingBusiness) {
    throw new HttpException(
      `Business with business_name '${business_name}' already exists`,
      HttpStatus.BAD_REQUEST,
    );
  }

  const account = queryRunner.manager.create(Account, {
    ...addBusinessDto,
    business_type: addBusinessDto.business_type || 'merchant', // ✅ Ensure business_type is set
    currency: addBusinessDto.currencies?.[0] || 'NGN', // ✅ Fallback currency
    user, // ✅ Set the user relationship
    userId: user.id, // ✅ Explicitly set userId
    dated: new Date(), // ✅ Ensure dated is set
  });

  console.log('Account to save:', account); // ✅ Debug log
  const savedAccount = await queryRunner.manager.save(Account, account);

  const initialFundingAmount = 1000;
  const balances = (addBusinessDto.currencies || ['NGN']).map(currency => ({
    currency,
    api_balance: 0,
    payout_balance: initialFundingAmount,
    collection_balance: initialFundingAmount,
  }));

  const wallet = queryRunner.manager.create(Wallet, {
    account,
    account_id: savedAccount.id, // ✅ Use saved account ID
    balances,
  });
  const savedWallet = await queryRunner.manager.save(Wallet, wallet);

  for (const balance of balances) {
    const transactionId = `flick-${crypto.randomUUID()}`;
    const initialFunding = queryRunner.manager.create(Transaction, {
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
      wallet: savedWallet, // ✅ Use saved wallet
    });
    await queryRunner.manager.save(Transaction, initialFunding);
  }

  return {
    message: 'Business added successfully',
    accountId: savedAccount.id,
    wallet_id: savedWallet.id,
  };
}
 async verifyEmail(verifyEmailDto: VerifyEmailDto) {
  try{

    console.log("hello")
  verifyEmailDto.email = verifyEmailDto.email.trim().toLowerCase();

    const { email, otp } = verifyEmailDto;
    console.log(email, otp)

    const user = await this.userRepository.findByEmail(email);
    console.log(user)
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
return await this.loginAfterVerification(user);


       } 
       catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('verify email error:', error);
      throw new HttpException('Failed to verify email', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    try{
    const { email } = forgotPasswordDto;
    forgotPasswordDto.email = forgotPasswordDto.email.trim().toLowerCase();

    
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
    resendOtpDto.email = resendOtpDto.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = this.getOtpExpiry()
    console.log(otp)

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
    resetPasswordDto.email = resetPasswordDto.email.trim().toLowerCase();

    
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
    loginDto.email = loginDto.email.trim().toLowerCase();

    const user = await this.userRepository.findByEmail(email);
    
    console.log(loginDto.email, "and", email)
    console.log(user)
    if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    if (!user.isVerified) throw new HttpException('Email not verified', HttpStatus.FORBIDDEN);
      console.log("Verification",user.isVerified)
    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);


return await this.loginAfterVerification(user);

  
     } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Login error:', error);
      throw new HttpException('Failed to login', HttpStatus.INTERNAL_SERVER_ERROR);
    } 
  }

  async loginAfterVerification(user: User) {
  const payload = { sub: user.id, email: user.email };
  const jwt = this.jwtService.sign(payload);
  const token = this.tokenEncryptionUtil.encryptToken(jwt);
  const userInfo = await this.getUserInfo(user.id);

  return {
    message: 'Login successful',
    token,
    user: userInfo.data,
  };
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
        bizAddress: user.accounts[0]?.bizAddress,
        avatar: user.avatar,
        website: user.website,
        referral_code: user.referral_code,
        isVerified: user.isVerified,
        isLive: user.isLive,
        business_Id: user.accounts[0]?.id,
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



}
