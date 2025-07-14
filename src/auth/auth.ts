/* eslint-disable prettier/prettier */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ForgotPasswordDto, LoginDto, ResendOtpDto, ResetPasswordDto, SignUpDto, VerifyEmailDto } from 'src/application/dtos/auth.dto';
import { UserRepository } from 'src/infrastructure/repositories/user.repository';
import { EmailService } from 'src/infrastructure/services/email/email.service';
import { hash, compare } from 'bcrypt';
import * as crypto from 'crypto';
import { JwtService } from '@nestjs/jwt';
import { AccountRepository } from 'src/infrastructure/repositories/account.repository';
import { WalletRepository } from 'src/infrastructure/repositories/wallet.repository';
import { TokenEncryptionUtil } from 'src/config/utils/TokenEncryptionUtil';
import { TransactionRepository } from 'src/infrastructure/repositories/transaction.repository';
import { Wallet } from 'src/domain/entities/wallet.entity';

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
  async signUp(signUpDto: SignUpDto) {
    try {
      const existingUser = await this.userRepository.findByEmail(signUpDto.email);
      if (existingUser) throw new HttpException('User already exists', HttpStatus.BAD_REQUEST);

      const existingAccount = await this.accountRepository.findByBusinessId(signUpDto.businessId);
      if (existingAccount) throw new HttpException('Business ID already exists', HttpStatus.BAD_REQUEST);

      const hashedPassword = await hash(signUpDto.password, 10);
      const otp = crypto.randomInt(100000, 999999).toString();
      const verificationExpiresAt = this.getOtpExpiry();

      const user = await this.userRepository.createUser({
        ...signUpDto,
        name: `${signUpDto.firstName} ${signUpDto.lastName}`,
        password: hashedPassword,
        verificationCode: otp,
        verificationExpiresAt,
        verified: false,
        referral_code: crypto.randomBytes(5).toString('hex'),
      });

      const account = await this.accountRepository.save(
        this.accountRepository.create({
          businessId: signUpDto.businessId,
          business_name: signUpDto.business_name,
          business_type: signUpDto.business_type,
          checkout_settings: {
            customization: {
              primaryColor: '#035c22',
              brandName: signUpDto.business_name,
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
      console.log(`Account created: ${account.id} for businessId: ${account.businessId}`);

      // Initialize balances for each currency (default to NGN if none provided)
      const currencies = signUpDto.currencies && signUpDto.currencies.length > 0 ? signUpDto.currencies : ['NGN'];
      const walletData: Partial<Wallet> = {
        balances: currencies.map(currency => ({
          currency,
          collection_balance: 0,
          payout_balance: 1000,// Initialize with 1000 units
          api_balance: currency === 'NGN' ? 0 : undefined,
        })),
        account,
      };
      const wallet = await this.walletRepository.save(
        this.walletRepository.create(walletData),
      );
      console.log(`Wallet created: ${wallet.id} for account: ${account.id}`);

      // Create initial transaction for each currency
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
          narration: `Initial wallet funding for ${currency} on signup`,
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

      await this.emailService.sendVerificationEmail(user.email, otp);

      return {
        message: 'Signup successful, check your email for OTP',
        user: { id: user.id, email: user.email },
        account: { id: account.id, businessId: account.businessId },
        wallet: { id: wallet.id, balances: wallet.balances },
        initialTransactions,
      };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Signup error:', error);
      throw new HttpException('Failed to sign up', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

 async verifyEmail(verifyEmailDto: VerifyEmailDto) {
  try{
    const { email, otp } = verifyEmailDto;
    const user = await this.userRepository.findByEmail(email);
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);

    if (user.verified) throw new HttpException('Email already verified', HttpStatus.BAD_REQUEST);

    if (user.verificationCode !== otp || !user.verificationExpiresAt || user.verificationExpiresAt < new Date()) {
      throw new HttpException('Invalid or expired OTP', HttpStatus.BAD_REQUEST);
    }
     if (new Date() > user.verificationExpiresAt!) throw new Error('OTP expired');

    await this.userRepository.updateUser(user.id, {
      verified: true,
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
      if (user.verified) throw new HttpException('Email already verified', HttpStatus.BAD_REQUEST);
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
    if (!user) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    if (!user.verified) throw new HttpException('Email not verified', HttpStatus.FORBIDDEN);

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) throw new HttpException('Invalid credentials', HttpStatus.UNAUTHORIZED);

    const payload = { sub: user.id, email: user.email };
    const jwt = this.jwtService.sign(payload);
    const token = this.tokenEncryptionUtil.encryptToken(jwt);

    return { message: 'Login successful', token, accounts: user.accounts };
     } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error('Login error:', error);
      throw new HttpException('Failed to login', HttpStatus.INTERNAL_SERVER_ERROR);
    } 
  }







}
