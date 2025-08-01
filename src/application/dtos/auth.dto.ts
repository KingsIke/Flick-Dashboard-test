/* eslint-disable prettier/prettier */
import { ArrayMinSize, IsArray, IsBoolean, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Length, Matches, Max, Min, ValidateNested } from 'class-validator';
import {COUNTRIES, SUPPORTED_CURRENCIES } from  "../../config/utils/countriesUtil";
import { Type } from 'class-transformer';


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
  @Min(1000000000, { message: 'businessId must be exactly 10 digits' }) // minimum 10-digit number
  @Max(9999999999, { message: 'businessId must be exactly 10 digits' }) // maximum 10-digit number

  businessId: number;

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

   @IsArray()
@ArrayMinSize(1, { message: 'At least one currency is required' })
@IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
currencies: string[];

  @IsString()
  @IsNotEmpty()
  account_type: string;

  @IsString()
  @IsNotEmpty()
  country: string;


// @IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
//   @IsNotEmpty()
//   currency: Currency;

  @IsString()
  @IsNotEmpty()
  account_no: string;

  @IsString()
  @IsNotEmpty()
  account_name: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsOptional()
  bank_code?: string;

  @IsString()
  @IsOptional()
  bank_address?: string;

  @IsString()
  @IsOptional()
  swift_code?: string;

  @IsString()
  @IsOptional()
  sort_code?: string;

  @IsString()
  @IsOptional()
  routing_number?: string;

  @IsString()
  @IsOptional()
  iban?: string;

  @IsBoolean()
  @IsOptional()
  isDomiciliary?: boolean;
}

// export class AddBusinessDto {
//   @IsNumber()
//   @IsNotEmpty()
//   @Min(1000000000, { message: 'businessId must be exactly 10 digits' }) // minimum 10-digit number
//   @Max(9999999999, { message: 'businessId must be exactly 10 digits' }) // maximum 10-digit number

//   businessId: number;

//   @IsString()
//   @IsNotEmpty()
//   business_name: string;

//   @IsString()
//   @IsNotEmpty()
//   business_type: string;


//   @IsArray()
// @ArrayMinSize(1, { message: 'At least one currency is required' })
// @IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
// currencies: string[];


//   @IsString()
// @IsNotEmpty()
// country: string;
// }

// export class CreateChargeDto {
//   @IsNumber()
//   amount: number;

//   @IsString()
//   @IsNotEmpty()
//   currency: string;

//   @IsString()
//   @IsNotEmpty()
//   accountId: string;
// }


export class CreateChargeDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsOptional()
  pageName?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  customLink?: string;

  @IsString()
  @IsOptional()
  redirectLink?: string;

  @IsString()
  @IsOptional()
  successmsg?: string;

  @IsString()
  @IsNotEmpty()
  currency_collected: string;

  @IsString()
  @IsOptional()
  currency_settled?: string;

  @IsString()
  @IsNotEmpty()
  productType: string;
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

   @IsString()
  @IsOptional()
  accountName?: string;

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

export class FundWalletDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  currency_collected: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  call_source: string;
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
  accountName: string;

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

  // @IsString()
  // @IsNotEmpty()
  // @IsEnum(['USD', 'GBP', 'CAD', 'EUR'], { message: 'Currency must be USD, EUR, CAD, GBP' })
  // currency: string;

  // @IsString()
  // @IsNotEmpty()
  // @IsEnum(['USD'], { message: 'Debit currency must be USD' })
  // debit_currency: string;

  @IsNotEmpty()
@IsString()
// @Matches(/^NGN$/i, { message: 'Debit currency must be NGN' })
debit_currency: string;


  @IsString()
  @IsNotEmpty()
  narration: string;

  @IsString()
  @IsNotEmpty()
  accountId: string;
  
  @IsString()
  @IsOptional()
  transactionId?: string;
}
export class ConvertAndFundDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['NGN', 'USD', 'CAD', 'EUR', 'GBP'], { message: 'Invalid target currency' })
  targetCurrency: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['NGN', 'USD', 'CAD', 'EUR', 'GBP'], { message: 'Invalid source currency' })
  sourceCurrency: string;
}

export class NGNCompletePayoutDto {
  @IsString()
  @IsNotEmpty()
  Id: string;

  @IsString()
  @IsNotEmpty()
  token: string;
}

// Recipient KYC nested DTO
export class RecipientKycDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  number: string;

  @IsString()
  @IsNotEmpty()
  issuedCountryCode: string;

  @IsString()
  @IsNotEmpty()
  issuedBy: string;
}

// Save Beneficiary DTO
export class SaveBeneficiaryDto {
  @IsString()
  @IsNotEmpty()
  transfer_type: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_country: string;

  @IsString()
  @IsNotEmpty()
  account_no: string;

  @IsString()
  @IsNotEmpty()
  routing: string;

  @IsString()
  @IsNotEmpty()
  bank_name: string;

  @IsString()
  @IsNotEmpty()
  bank_city: string;

  @IsString()
  @IsNotEmpty()
  bank_state: string;

  @IsString()
  @IsNotEmpty()
  bank_country: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_address_1: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_city: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_state: string;

  @IsString()
  @IsNotEmpty()
  beneficiary_name: string;

  @IsString()
  @IsNotEmpty()
  countrycode: string;

  @IsBoolean()
  is_domiciliary: boolean;

  @IsBoolean()
  is_individual: boolean;

  @IsString()
  @IsNotEmpty()
  recipient_firstname: string;

  @IsString()
  @IsNotEmpty()
  recipient_lastname: string;

  @ValidateNested()
  @Type(() => RecipientKycDto)
  recipient_kyc: RecipientKycDto;

  @IsString()
  @IsNotEmpty()
  accountId: string;
}


export enum Currency {
  USD = 'USD',
  GBP = 'GBP',
  EUR = 'EUR',
}

export class UsdPayoutDto {
  @IsString()
  @IsNotEmpty()
  accountId: string;

  @IsString()
  @IsNotEmpty()
  beneficiaryId: string;

  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;
}