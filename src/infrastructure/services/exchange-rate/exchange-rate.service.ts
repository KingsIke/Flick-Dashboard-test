/* eslint-disable prettier/prettier */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class ExchangeRateService {
  private readonly exchangeRates: { [key: string]: number } = {
    // ========== USD BASE RATES ==========
    // USD to African currencies
    'USD_NGN': 1462.38,
    'USD_KES': 130.67,
    'USD_TZS': 2445.96,
    'USD_UGX': 3691.96,
    'USD_RWF': 1468.68,
    'USD_MWK': 1751.49,
    'USD_ZMW': 22.95,
    'USD_ZAR': 17.28,
    'USD_GHS': 11.50,

    // USD to Major currencies
    'USD_EUR': 0.9259,
    'USD_GBP': 0.7874,
    'USD_CAD': 1.35,

    // ========== EUR BASE RATES ==========
    // EUR to African currencies
    'EUR_NGN': 1579.37,
    'EUR_KES': 141.12,
    'EUR_TZS': 2641.64,
    'EUR_UGX': 3987.32,
    'EUR_RWF': 1586.17,
    'EUR_MWK': 1891.61,
    'EUR_ZMW': 24.79,
    'EUR_ZAR': 18.66,
    'EUR_GHS': 12.42,

    // EUR to Major currencies
    'EUR_USD': 1.08,
    'EUR_GBP': 0.85,
    'EUR_CAD': 1.46,

    // ========== GBP BASE RATES ==========
    // GBP to African currencies
    'GBP_NGN': 1857.22,
    'GBP_KES': 165.95,
    'GBP_TZS': 3106.37,
    'GBP_UGX': 4687.79,
    'GBP_RWF': 1865.22,
    'GBP_MWK': 2224.39,
    'GBP_ZMW': 29.15,
    'GBP_ZAR': 21.95,
    'GBP_GHS': 14.61,

    // GBP to Major currencies
    'GBP_USD': 1.27,
    'GBP_EUR': 1.1765,
    'GBP_CAD': 1.71,

    // ========== CAD BASE RATES ==========
    // CAD to African currencies
    'CAD_NGN': 1974.21,
    'CAD_KES': 176.40,
    'CAD_TZS': 3302.05,
    'CAD_UGX': 4984.15,
    'CAD_RWF': 1982.72,
    'CAD_MWK': 2364.51,
    'CAD_ZMW': 30.98,
    'CAD_ZAR': 23.33,
    'CAD_GHS': 15.53,

    // CAD to Major currencies
    'CAD_USD': 0.7407,
    'CAD_EUR': 0.6849,
    'CAD_GBP': 0.5848,

    // ========== AFRICAN CURRENCIES TO MAJOR CURRENCIES ==========
    // NGN to Major currencies
    'NGN_USD': 0.000684,
    'NGN_EUR': 0.000633,
    'NGN_GBP': 0.000538,
    'NGN_CAD': 0.000507,

    // KES to Major currencies
    'KES_USD': 0.00765,
    'KES_EUR': 0.00709,
    'KES_GBP': 0.00603,
    'KES_CAD': 0.00567,

    // GHS to Major currencies
    'GHS_USD': 0.08696,
    'GHS_EUR': 0.08052,
    'GHS_GBP': 0.06848,
    'GHS_CAD': 0.06441,

    // ZAR to Major currencies
    'ZAR_USD': 0.05787,
    'ZAR_EUR': 0.05357,
    'ZAR_GBP': 0.04556,
    'ZAR_CAD': 0.04286,

    // TZS to Major currencies
    'TZS_USD': 0.000409,
    'TZS_EUR': 0.000379,
    'TZS_GBP': 0.000322,
    'TZS_CAD': 0.000303,

    // UGX to Major currencies
    'UGX_USD': 0.000271,
    'UGX_EUR': 0.000251,
    'UGX_GBP': 0.000213,
    'UGX_CAD': 0.000201,

    // RWF to Major currencies
    'RWF_USD': 0.000681,
    'RWF_EUR': 0.000630,
    'RWF_GBP': 0.000536,
    'RWF_CAD': 0.000504,

    // MWK to Major currencies
    'MWK_USD': 0.000571,
    'MWK_EUR': 0.000529,
    'MWK_GBP': 0.000450,
    'MWK_CAD': 0.000423,

    // ZMW to Major currencies
    'ZMW_USD': 0.04357,
    'ZMW_EUR': 0.04034,
    'ZMW_GBP': 0.03431,
    'ZMW_CAD': 0.03227,
    // ========== LOCAL TO LOCAL CURRENCY RATES ==========
    // NGN to other African currencies
    'NGN_KES': 0.0893,    // 130.67 / 1462.38
    'NGN_GHS': 0.00786,   // 11.50 / 1462.38
    'NGN_ZAR': 0.01182,   // 17.28 / 1462.38
    'NGN_TZS': 1.672,     // 2445.96 / 1462.38
    'NGN_UGX': 2.524,     // 3691.96 / 1462.38
    'NGN_RWF': 1.004,     // 1468.68 / 1462.38
    'NGN_MWK': 1.197,     // 1751.49 / 1462.38
    'NGN_ZMW': 0.01569,   // 22.95 / 1462.38

    // KES to other African currencies
    'KES_NGN': 11.20,     // 1462.38 / 130.67
    'KES_GHS': 0.0880,    // 11.50 / 130.67
    'KES_ZAR': 0.1323,    // 17.28 / 130.67
    'KES_TZS': 18.72,     // 2445.96 / 130.67
    'KES_UGX': 28.25,     // 3691.96 / 130.67
    'KES_RWF': 11.24,     // 1468.68 / 130.67
    'KES_MWK': 13.40,     // 1751.49 / 130.67
    'KES_ZMW': 0.1756,    // 22.95 / 130.67

    // GHS to other African currencies
    'GHS_NGN': 127.2,     // 1462.38 / 11.50
    'GHS_KES': 11.36,     // 130.67 / 11.50
    'GHS_ZAR': 1.503,     // 17.28 / 11.50
    'GHS_TZS': 212.7,     // 2445.96 / 11.50
    'GHS_UGX': 321.0,     // 3691.96 / 11.50
    'GHS_RWF': 127.7,     // 1468.68 / 11.50
    'GHS_MWK': 152.3,     // 1751.49 / 11.50
    'GHS_ZMW': 1.995,     // 22.95 / 11.50

    // ZAR to other African currencies
    'ZAR_NGN': 84.63,     // 1462.38 / 17.28
    'ZAR_KES': 7.56,      // 130.67 / 17.28
    'ZAR_GHS': 0.665,     // 11.50 / 17.28
    'ZAR_TZS': 141.5,     // 2445.96 / 17.28
    'ZAR_UGX': 213.6,     // 3691.96 / 17.28
    'ZAR_RWF': 85.0,      // 1468.68 / 17.28
    'ZAR_MWK': 101.4,     // 1751.49 / 17.28
    'ZAR_ZMW': 1.328,  
    
    // ========== SAME CURRENCY RATES ==========
    'USD_USD': 1,
    'EUR_EUR': 1,
    'GBP_GBP': 1,
    'CAD_CAD': 1,
    'NGN_NGN': 1,
    'KES_KES': 1,
    'GHS_GHS': 1,
    'TZS_TZS': 1,
    'UGX_UGX': 1,
    'RWF_RWF': 1,
    'MWK_MWK': 1,
    'ZMW_ZMW': 1,
    'ZAR_ZAR': 1,
  };

  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    try {
      // Return 1 if same currency
      if (fromCurrency === toCurrency) {
        return 1;
      }

      const currencyPair = `${fromCurrency}_${toCurrency}`;
      
      // Check if we have the direct rate
      if (this.exchangeRates[currencyPair] !== undefined) {
        return this.exchangeRates[currencyPair];
      }

      // Try the reverse pair
      const reversePair = `${toCurrency}_${fromCurrency}`;
      if (this.exchangeRates[reversePair] !== undefined && this.exchangeRates[reversePair] > 0) {
        return 1 / this.exchangeRates[reversePair];
      }

      throw new Error(`Unsupported currency pair: ${fromCurrency}/${toCurrency}`);
      
    } catch (error) {
      console.error('Exchange rate fetch error:', error.message);
      throw new HttpException('Failed to fetch exchange rate', HttpStatus.BAD_REQUEST);
    }
  }

  // Helper method to get all supported currencies
  getSupportedCurrencies(): string[] {
    const currencies = new Set<string>();
    
    Object.keys(this.exchangeRates).forEach(pair => {
      const [from, to] = pair.split('_');
      currencies.add(from);
      currencies.add(to);
    });

    return Array.from(currencies).filter(currency => currency && currency !== 'undefined').sort();
  }

  // Helper method to validate if a currency pair is supported
  isCurrencyPairSupported(fromCurrency: string, toCurrency: string): boolean {
    if (fromCurrency === toCurrency) return true;
    
    const currencyPair = `${fromCurrency}_${toCurrency}`;
    const reversePair = `${toCurrency}_${fromCurrency}`;
    
    return this.exchangeRates[currencyPair] !== undefined || 
           (this.exchangeRates[reversePair] !== undefined && this.exchangeRates[reversePair] > 0);
  }
}