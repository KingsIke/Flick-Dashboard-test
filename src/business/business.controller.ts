/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Get,
  Param,
} from '@nestjs/common';

import { AuthService } from '../auth/auth';
import { BankService } from '../infrastructure/services/banks/bank.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddBusinessDto, ConvertAndFundDto, CreateChargeDto, FundPayoutBalanceDto, FundWalletDto, NGNCompletePayoutDto, NGNPayoutDto, NubanCreateMerchantDto, SaveBeneficiaryDto, USDPayoutDto } from '../application/dtos/auth.dto';
import { BusinessService } from './business';


@Controller('business')
export class BusinessController {
  constructor(

    private readonly authService: AuthService,
    private readonly bankService: BankService,
    private readonly businessService: BusinessService,

  ) {}

  @Post('add-business')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async addBusiness(@Request() req, @Body() addBusinessDto: AddBusinessDto) {
    return await this.businessService.addBusiness(req.user.sub, addBusinessDto);
  }

  // @Get('balances')
  // @UseGuards(JwtAuthGuard)
  // @HttpCode(HttpStatus.OK)
  // async getBalances(@Request() req) {
  //   return await this.businessService.getBalances(req.user.sub);
  // }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Get('balances')
  async getBalances(@Request() req) {
    return await this.businessService.getBalances(req.user.sub, req.query.accountId);
  }

  @Get('transactions/:accountId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getTransactions(@Param('accountId') accountId: string) {
    return await this.businessService.getTransactions(accountId);
  }

  @Get('user-info')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getUserInfo(@Request() req) {
    return await this.businessService.getUserInfo(req.user.sub);
  }

  @Post('create-charge')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async createCharge(@Request() req, @Body() chargeDto: CreateChargeDto) {
    return this.businessService.createCharge(req.user.sub, chargeDto);
  }

  @Post('nuban-create-merchant')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async nubanCreateMerchant(@Request() req, @Body() nubanDto: NubanCreateMerchantDto) {
    return this.businessService.nubanCreateMerchant(req.user.sub, nubanDto);
  }

  @Get('payment-pages/:accountId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getPaymentPages(@Param('accountId') accountId: string) {
    return this.businessService.getPaymentPages(accountId);
  }

  @Post('fund-payout-balance')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async fundPayoutBalance(@Request() req, @Body() fundDto: FundPayoutBalanceDto) {
    return this.businessService.fundPayoutBalance(req.user.sub, fundDto);
  }
  @Get('banks')
  @HttpCode(HttpStatus.OK)
  async getBanks() {
    return { data: await this.bankService.getBanks() };
  }


  @Get('all-businesses')
@UseGuards(JwtAuthGuard)
@HttpCode(HttpStatus.OK)
async getAllBusinesses(@Request() req) {
  return this.businessService.getAllBusinesses(req.user.sub);
}

  


  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('payout/ngn')
  async initiateNGNPayout(@Request() req, @Body() payoutDto: NGNPayoutDto) {
    return this.businessService.initiateNGNPayout(req.user.sub, payoutDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('payout/ngn/complete')
  async completeNGNPayout(@Request() req, @Body() completeDto: NGNCompletePayoutDto) {
    return this.businessService.completeNGNPayout(req.user.sub, completeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('countries')
  async getCountries() {
    return this.businessService.getCountries();
  }

  @UseGuards(JwtAuthGuard)
@Post('save-beneficiary')
async saveBeneficiary(@Request() req, @Body() beneficiaryDto: SaveBeneficiaryDto) {
  return this.businessService.saveBeneficiary(req.user.sub, beneficiaryDto);
}

@UseGuards(JwtAuthGuard)
@Post('get-beneficiaries')
async getBeneficiaries(@Request() req, @Body('accountId') accountId: string) {
  return this.businessService.getBeneficiaries(req.user.sub, accountId);
}

  @UseGuards(JwtAuthGuard)
  @Post('usd-payout')
  async initiateUSDPayout(@Request() req, @Body() usdPayoutDto: USDPayoutDto) {
    return this.businessService.initiateUSDPayout(req.user.sub, usdPayoutDto);
  }

  //   @UseGuards(JwtAuthGuard)
  // @Post('create-payment-link')
  // async createPaymentLink(@Request() req, @Body() createPaymentLinkDto: CreatePaymentLinkDto) {
  //   return this.authService.createPaymentLink(req.user.sub, createPaymentLinkDto);
  // }

  @UseGuards(JwtAuthGuard)
  @Post('fund-wallet')
  async fundWallet(@Request() req, @Body() fundWalletDto: FundWalletDto) {
    return this.businessService.fundWallet(req.user.sub, fundWalletDto);
  }


  @UseGuards(JwtAuthGuard)
  @Post('convert-fund')
  async convertAndFund(@Request() req, @Body() convertAndFundDto: ConvertAndFundDto) {
    return this.businessService.convertAndFund(req.user.sub, convertAndFundDto);
  }

  

}



