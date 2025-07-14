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
import { AddBusinessDto, CreateChargeDto, FundPayoutBalanceDto, NGNCompletePayoutDto, NGNPayoutDto, NubanCreateMerchantDto } from '../application/dtos/auth.dto';
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

  @Get('balances')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getBalances(@Request() req) {
    return await this.businessService.getBalances(req.user.sub);
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
}
