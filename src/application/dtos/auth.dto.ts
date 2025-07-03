/* eslint-disable prettier/prettier */
import { IsEmail, IsIn, IsNotEmpty, IsOptional, Matches } from 'class-validator';

export class SignUpDto {
  @IsNotEmpty()
  firstName: string;

  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
   @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  })
  password: string;

    @IsOptional()
  @IsIn(['NGN', 'USD', 'GBP', 'EUR']) 
  currency: string = 'NGN';

  @IsNotEmpty()
  businessId: number;

  @IsNotEmpty()
  business_name: string;

  @IsNotEmpty()
  business_type: string;

  isLive: boolean = false;
  isVerified: boolean = false;
  phone?: string;
  country?: string;
  bizAddress?: string;
  website?: string;


}

export class VerifyEmailDto {
  @IsEmail()
  email: string;

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

  @IsNotEmpty()
  @IsIn(['verification', 'password-reset'])
  type: 'verification' | 'password-reset';
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsNotEmpty()
  otp: string;

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

  @IsNotEmpty()
  @Matches(/^(?=.*[A-Z])(?=.*[a-zA-Z])(?=.*\d)(?=.*[\W_]).+$/, {
    message:
      'Password must include at least one uppercase letter, one letter, one number, and one symbol',
  })


  password: string;
}


export class AddBusinessDto {
  @IsNotEmpty()
  businessId: number;

  @IsNotEmpty()
  business_name: string;

  @IsNotEmpty()
  business_type: string;

  @IsNotEmpty()
  currency: string;
}