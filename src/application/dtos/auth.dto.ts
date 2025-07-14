/* eslint-disable prettier/prettier */
import { IsArray, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Length, Matches } from 'class-validator';
import {COUNTRIES, SUPPORTED_CURRENCIES } from  "../../config/utils/countriesUtil"
export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
   @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  })
  password: string;

    @IsOptional()
  @IsIn(['NGN', 'USD', 'GBP', 'EUR']) 
  currency: string = 'NGN';

  @IsString()
  @IsNotEmpty()
  businessId: number;

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

  isLive: boolean = false;
  isVerified: boolean = false;

  @IsString()
  phone?: string;

  @IsString()
    @IsNotEmpty()
  @IsEnum(COUNTRIES, { message: 'Invalid country' })
  country?: string;

  @IsString()
  bizAddress?: string;
  
  @IsString()
  website?: string;

    @IsArray()
  @IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
  @IsOptional()
  currencies?: string[];


}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  otp: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email: string;
}

export class ResendOtpDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['verification', 'password-reset'])
  type: 'verification' | 'password-reset';
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  otp: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  })


  newPassword: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  })


  password: string;
}


export class AddBusinessDto {
  @IsNumber()
  @IsNotEmpty()
  businessId: number;

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

  @IsArray()
  @IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
  @IsOptional()
  currencies?: string[];
}

export class CreateChargeDto {
  @IsNumber()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  accountId: string;
}

export class CardDetailsDto {
  @IsString()
  @Length(16, 16, { message: 'Card number must be exactly 16 digits' })
  @Matches(/^\d{16}$/, { message: 'Card number must contain only digits' })
  cardNumber: string;

  @IsString()
  @Length(3, 3, { message: 'CVV must be exactly 3 digits' })
  @Matches(/^\d{3}$/, { message: 'CVV must contain only digits' })
  cvv: string;

  @IsString()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Card date must be in MM/YY format' })
  cardDate: string;

  @IsString()
  @IsNotEmpty({ message: 'Card name is required' })
  cardName: string;

  @IsNumber({}, { message: 'Amount must be a number' })
  amount: number;
}

export class FundPayoutBalanceDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  amount: number;

  @IsEnum(['bank_transfer', 'card', 'payout_balance'])
  method: 'bank_transfer' | 'card' | 'payout_balance';

  @IsString()
  @IsOptional()
  cardDetails?: string;

  @IsString()
  @IsOptional()
  @Length(16, 16, { message: 'Card number must be exactly 16 digits' })
  @Matches(/^\d{16}$/, { message: 'Card number must contain only digits' })
  cardNumber?: string;

  @IsString()
  @IsOptional()
  @Length(3, 3, { message: 'CVV must be exactly 3 digits' })
  @Matches(/^\d{3}$/, { message: 'CVV must contain only digits' })
  cvv?: string;

  @IsString()
  @IsOptional()
  @Matches(/^(0[1-9]|1[0-2])\/\d{2}$/, { message: 'Card date must be in MM/YY format' })
  cardDate?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Card name is required' })
  cardName?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Bank code is required for bank transfer' })
  bankCode?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty({ message: 'Bank name is required for bank transfer' })
  bankName?: string;

  @IsString()
  @IsOptional()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber?: string;
}

export class NubanCreateMerchantDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  bankName: string;

  @IsString()
  @IsNotEmpty()
  @Length(10, 10, { message: 'Account number must be exactly 10 digits' })
  @Matches(/^\d{10}$/, { message: 'Account number must contain only digits' })
  accountNumber: string;
}

export class NGNPayoutDto {
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  account_number: string;

  @IsString()
  @IsNotEmpty()
  bank_code: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_name: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['NGN'], { message: 'Currency must be NGN' })
  currency: string;

  @IsString()
  @IsNotEmpty()
  narration: string;

  @IsString()
  @IsNotEmpty()
  accountId: string;
}

export class USDCompletePayoutDto {
  @IsString()
  @IsNotEmpty()
  Id: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

export class USDPayoutDto {
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_id: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['USD'], { message: 'Currency must be USD' })
  currency: string;

  @IsString()
  @IsNotEmpty()
  @IsEnum(['USD'], { message: 'Debit currency must be USD' })
  debit_currency: string;

  @IsString()
  @IsNotEmpty()
  narration: string;

  @IsString()
  @IsNotEmpty()
  accountId: string;
}

export class NGNCompletePayoutDto {
  @IsString()
  @IsNotEmpty()
  Id: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}