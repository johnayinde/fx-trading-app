import { Injectable, Logger, Inject } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { HttpService } from "@nestjs/axios";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { firstValueFrom } from "rxjs";
import Decimal from "decimal.js";
import { FxRate } from "./entities/fx-rate.entity";
import { Currency } from "../wallet/entities/wallet.entity";

/**
 * Response structure from external exchange rate API
 */
interface ExchangeRateApiResponse {
  base: string;
  date: string;
  rates: { [key: string]: number };
}

/**
 * Comprehensive FX rate information including metadata
 */
export interface FxRateInfo {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  timestamp: Date;
  ageSeconds: number;
  source: string;
  warning?: string;
}

/**
 * Service for managing foreign exchange rates with caching,
 * external API integration, and database fallback
 */
@Injectable()
export class FxService {
  private readonly logger = new Logger(FxService.name);
  private readonly apiUrl: string;
  private readonly cacheTTL: number;

  constructor(
    @InjectRepository(FxRate)
    private readonly fxRateRepository: Repository<FxRate>,
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    @Inject(CACHE_MANAGER)
    private readonly cacheManager: Cache,
  ) {
    this.apiUrl = this.configService.get(
      "FX_API_URL",
      "https://api.exchangerate-api.com/v4/latest",
    );
    this.cacheTTL = this.configService.get("FX_CACHE_TTL", 60);
  }

  /**
   * Get FX rate between two currencies with caching and fallback
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns FX rate information with metadata
   * @throws Error if rate unavailable and no fallback found
   */
  async getRate(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<FxRateInfo> {
    // Same currency
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: "1.000000",
        timestamp: new Date(),
        ageSeconds: 0,
        source: "direct",
      };
    }

    const cacheKey = `fx:${fromCurrency}:${toCurrency}`;

    // Try cache first
    const cachedRate = await this.cacheManager.get<FxRateInfo>(cacheKey);
    if (cachedRate) {
      this.logger.log(`Cache hit for ${fromCurrency} -> ${toCurrency}`);
      return cachedRate;
    }

    // Try fetching from external API
    try {
      const rate = await this.fetchFromApi(fromCurrency, toCurrency);

      // Store in cache
      await this.cacheManager.set(cacheKey, rate, this.cacheTTL * 1000);

      // Store in database for audit trail
      await this.saveRateToDatabase(rate);

      return rate;
    } catch (error) {
      this.logger.error(`Failed to fetch rate from API: ${error.message}`);

      // Fallback to last known rate from database
      const lastKnownRate = await this.getLastKnownRate(
        fromCurrency,
        toCurrency,
      );

      if (lastKnownRate) {
        const ageSeconds = Math.floor(
          (new Date().getTime() - lastKnownRate.timestamp.getTime()) / 1000,
        );

        if (ageSeconds < 3600) {
          // Less than 1 hour old
          this.logger.warn(
            `Using last known rate (${ageSeconds}s old) for ${fromCurrency} -> ${toCurrency}`,
          );
          return {
            ...lastKnownRate,
            ageSeconds,
            warning: `Using cached rate from ${ageSeconds} seconds ago. Current rates unavailable.`,
          };
        }
      }

      throw new Error(
        "Exchange rate service unavailable. Please try again later.",
      );
    }
  }

  /**
   * Get all FX rates for a base currency
   * @param baseCurrency - Base currency for rate comparison
   * @returns Object mapping currencies to their rate information
   */
  async getAllRates(
    baseCurrency: Currency = Currency.NGN,
  ): Promise<{ [key: string]: FxRateInfo }> {
    const currencies = Object.values(Currency).filter(
      (c) => c !== baseCurrency,
    );
    const rates: { [key: string]: FxRateInfo } = {};

    await Promise.all(
      currencies.map(async (currency) => {
        try {
          rates[currency] = await this.getRate(baseCurrency, currency);
        } catch (error) {
          this.logger.error(
            `Failed to get rate for ${baseCurrency} -> ${currency}: ${error.message}`,
          );
        }
      }),
    );

    return rates;
  }

  /**
   * Fetch current exchange rate from external API
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns FX rate information from API
   * @throws Error if API request fails
   */
  private async fetchFromApi(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<FxRateInfo> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ExchangeRateApiResponse>(
          `${this.apiUrl}/${fromCurrency}`,
          {
            timeout: 5000,
          },
        ),
      );

      const rates = response.data.rates;

      if (!rates[toCurrency]) {
        throw new Error(`Rate not available for ${toCurrency}`);
      }

      const rate = new Decimal(rates[toCurrency]).toFixed(6);

      const rateInfo: FxRateInfo = {
        fromCurrency,
        toCurrency,
        rate,
        timestamp: new Date(),
        ageSeconds: 0,
        source: "exchangerate-api",
      };

      this.logger.log(
        `Fetched rate from API: ${fromCurrency} -> ${toCurrency} = ${rate}`,
      );

      return rateInfo;
    } catch (error) {
      this.logger.error(`API fetch failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Save fetched FX rate to database for audit trail
   * @param rateInfo - FX rate information to save
   */
  private async saveRateToDatabase(rateInfo: FxRateInfo): Promise<void> {
    try {
      const fxRate = this.fxRateRepository.create({
        fromCurrency: rateInfo.fromCurrency,
        toCurrency: rateInfo.toCurrency,
        rate: rateInfo.rate,
        source: rateInfo.source,
      });

      await this.fxRateRepository.save(fxRate);
    } catch (error) {
      // Non-critical error, just log it
      this.logger.error(`Failed to save rate to database: ${error.message}`);
    }
  }

  /**
   * Retrieve last known rate from database as fallback
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns Last known FX rate or null if not found
   */
  private async getLastKnownRate(
    fromCurrency: Currency,
    toCurrency: Currency,
  ): Promise<FxRateInfo | null> {
    try {
      const fxRate = await this.fxRateRepository.findOne({
        where: {
          fromCurrency,
          toCurrency,
        },
        order: {
          fetchedAt: "DESC",
        },
      });

      if (!fxRate) {
        return null;
      }

      return {
        fromCurrency: fxRate.fromCurrency,
        toCurrency: fxRate.toCurrency,
        rate: fxRate.rate,
        timestamp: fxRate.fetchedAt,
        ageSeconds: 0, // Will be calculated by caller
        source: fxRate.source || "database",
      };
    } catch (error) {
      this.logger.error(`Failed to get last known rate: ${error.message}`);
      return null;
    }
  }

  /**
   * Convert amount using given exchange rate
   * @param amount - Amount to convert
   * @param rate - Exchange rate
   * @returns Converted amount as string with 2 decimal places
   */
  convertAmount(amount: string, rate: string): string {
    return new Decimal(amount).times(rate).toFixed(2);
  }
}
