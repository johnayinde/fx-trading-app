import { Controller, Get, Param, UseGuards, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { FxService } from "./fx.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Currency } from "../wallet/entities/wallet.entity";

/**
 * Controller for foreign exchange rate endpoints
 */
@ApiTags("FX Rates")
@Controller("fx")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FxController {
  constructor(private readonly fxService: FxService) {}

  /**
   * Get all current FX rates for a base currency
   * @param baseCurrency - Optional base currency (default: NGN)
   * @returns All FX rates relative to base currency
   */
  @Get("rates")
  @ApiOperation({ summary: "Get all current FX rates for a base currency" })
  @ApiQuery({
    name: "base",
    enum: Currency,
    required: false,
    description: "Base currency (default: NGN)",
  })
  @ApiResponse({ status: 200, description: "Returns all FX rates" })
  async getAllRates(@Query("base") baseCurrency?: Currency) {
    const base = baseCurrency || Currency.NGN;
    const rates = await this.fxService.getAllRates(base);

    return {
      message: "FX rates retrieved successfully",
      baseCurrency: base,
      rates,
      timestamp: new Date(),
    };
  }

  /**
   * Get specific FX rate between two currencies
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @returns FX rate for the currency pair
   */
  @Get("rates/:from/:to")
  @ApiOperation({ summary: "Get specific FX rate between two currencies" })
  @ApiResponse({
    status: 200,
    description: "Returns FX rate for the currency pair",
  })
  @ApiResponse({ status: 400, description: "Invalid currency pair" })
  async getRate(
    @Param("from") fromCurrency: Currency,
    @Param("to") toCurrency: Currency,
  ) {
    const rate = await this.fxService.getRate(fromCurrency, toCurrency);

    return {
      message: "FX rate retrieved successfully",
      ...rate,
    };
  }
}
