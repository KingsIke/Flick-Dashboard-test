/* eslint-disable prettier/prettier */
import { ArrayMinSize, IsArray, IsBoolean, IsDateString, IsEmail, IsEnum, IsIn, IsNotEmpty, IsNumber, IsNumberString, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator';
import {COUNTRIES, SUPPORTED_CURRENCIES } from  "../../config/utils/countriesUtil";
import { Type } from 'class-transformer';


export class SignUpDto {
  @IsString()
  @IsNotEmpty()
  name: string;
 
  @IsString()
  @IsNotEmpty()
  
  password: string;

   @IsString()
  @IsNotEmpty()
  confirm_password: string;


  @IsEmail()
  email: string;


  isLive: boolean = false;
  isVerified: boolean = false;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
    @IsNotEmpty()
  @IsEnum(COUNTRIES, { message: 'Invalid country' })
  country: string;



  // @IsString()
  // @IsNotEmpty()
  // businessId: string;

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

  @IsString()
  @IsNotEmpty()
  business_website: string;

  @IsOptional()
  @IsString()
  bizAddress?: string;

// @IsString()
// @IsNotEmpty({ message: 'Currency is required' })
// @IsEnum(SUPPORTED_CURRENCIES, { 
//   each: true, 
//   message: `Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}` 
// })
// currency: string;



  @IsString()
  @IsOptional()
  account_no: string;

  @IsString()
  @IsOptional()
  account_name: string;

  @IsString()
  @IsOptional()
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
  // @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
  //   message:
  //     'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  // })


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

  @IsString()
  @IsNotEmpty()
  business_name: string;

  @IsString()
  @IsNotEmpty()
  business_type: string;

  @IsString()
  @IsNotEmpty()
  business_website: string;

  @IsOptional()
  @IsString()
  bizAddress?: string;


   @IsArray()
@ArrayMinSize(1, { message: 'At least one currency is required' })
@IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
currencies: string[];


  @IsString()
  @IsNotEmpty()
  country: string;


// @IsEnum(SUPPORTED_CURRENCIES, { each: true, message: 'Invalid currency' })
//   @IsNotEmpty()
//   currency: Currency;

  @IsString()
  @IsOptional()
  account_no: string;

  @IsString()
  @IsOptional()
  account_name: string;

  @IsString()
  @IsOptional()
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

export class CreateChargeDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsNotEmpty()
  amount: number;
    @IsString()
  @IsNotEmpty()

  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsOptional()
  @IsEnum(['api', 'collection'], { 
    message: 'balanceType must be one of: api, collection' 
  })
  balanceType?: 'api' | 'collection';
}

export class CardChargeDto {
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsNotEmpty()
  @Type(() => Number)
  amount: number;

  // @IsString()
  // @IsNotEmpty()
  // @IsEnum(SUPPORTED_CURRENCIES, { message: 'Invalid currency' })
  // currency: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{13,16}$/, { message: 'Card number must be between 13 and 16 digits' })
  cardNumber: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{3,4}$/, { message: 'CVV must be 3 or 4 digits' })
  cvv: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^(0[1-9]|1[0-2])\/?([0-9]{2})$/, { message: 'Card date must be in MM/YY format' })
  cardDate: string;

  @IsString()
  @IsNotEmpty()
  cardName: string;

  @IsString()
  @IsNotEmpty()

  transactionId?: string;

    @IsOptional()
  @IsEnum(['api', 'collection'], { 
    message: 'balanceType must be one of: api, collection' 
  })
  balanceType?: 'api' |  'collection';

}


export class TransactionFilterDto {
  @IsOptional()
  @IsDateString({}, { message: 'startDate must be a valid ISO date string' })
  startDate?: string;

  @IsOptional()
  @IsDateString({}, { message: 'endDate must be a valid ISO date string' })
  endDate?: string;

  @IsOptional()
  @IsArray()
  @IsEnum(['Complete', 'Success', 'Pending', 'Failed'], {
    each: true,
    message: 'status must be one of Complete | Success | Pending | Failed',
  })
  status?: ('Complete' | 'Success' | 'Pending' | 'Failed')[];

  @IsOptional()
  @IsEnum(['Inflow', 'Outflow', 'Pending',], {
    each: true,
    message: 'type must be one of Inflow | Outflow | Pending',
  })
  type?: ('Inflow' | 'Outflow' | 'Pending');

  @IsOptional()
  @IsEnum(SUPPORTED_CURRENCIES, { message: 'Invalid currency' })
  currency?: Currency;
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

export class NubanChargeDto {
  @IsString()
  @IsNotEmpty()
  transactionId: string;

  @IsNumber({ allowNaN: false, allowInfinity: false })
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  type: string; 

  @IsString()
  @IsOptional()
  description?: string;

  @IsOptional()
  @IsEnum(['api', 'collection'], { 
    message: 'balanceType must be one of: api, collection' 
  })
  balanceType?: 'api' | 'collection';
}

export class CreatePaymentLinkDto {
  @IsString()
  @IsNotEmpty()
  currency_collected: string;

  @IsString()
  @IsNotEmpty()
  currency_settled: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsNotEmpty()
  product_type: string[];

  @IsString()
  @IsNotEmpty()
  amount: string;
}

export class CreateForeignFundChargeDto {
  @IsString()
  @IsNotEmpty()
  currency_collected: string;

  @IsString()
  @IsNotEmpty()
  currency_settled: string;

  @IsString()
  @IsNotEmpty()
  amount: string;

  @IsString()
  @IsOptional()
  call_source?: string;
}

export class ProcessForeignPaymentDto {
  @IsString()
  @IsNotEmpty()
  accessCode: string;
}