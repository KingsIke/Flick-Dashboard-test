/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
  private readonly exchangeRates: { [key: string]: number } = {
    USD: 1573.2,
    GBP: 2000,
    EUR: 1700,
    CAD: 1500
  };

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      if (fromCurrency !== 'NGN' || !this.exchangeRates[toCurrency]) {
        throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
      }
      return this.exchangeRates[toCurrency];
    } catch (error) {
      console.error('Exchange rate fetch error:', error.message);
      throw new HttpException('Failed to fetch exchange rate', HttpStatus.BAD_REQUEST);
    }
  }
}