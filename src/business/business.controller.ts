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
import { BankService } from 'src/infrastructure/services/banks/bank.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { AddBusinessDto } from 'src/application/dtos/auth.dto';
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

  @Get('banks')
  @HttpCode(HttpStatus.OK)
  async getBanks() {
    return { data: await this.bankService.getBanks() };
  }
}
