import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  Query,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { TradingService } from "./trading.service";
import { ConvertCurrencyDto } from "./dto/convert-currency.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Currency } from "../wallet/entities/wallet.entity";

/**
 * Controller handling trading and currency conversion HTTP endpoints
 */
@ApiTags("Trading")
@Controller("trading")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TradingController {
  constructor(private readonly tradingService: TradingService) {}

  /**
   * Convert currency with real-time FX rates
   * @param req - Express request with authenticated user
   * @param convertDto - Conversion parameters
   * @returns Transaction details and conversion result
   */
  @Post("convert")
  @ApiOperation({ summary: "Convert currency using real-time FX rates" })
  @ApiResponse({ status: 201, description: "Currency converted successfully" })
  @ApiResponse({
    status: 400,
    description: "Insufficient balance or invalid request",
  })
  async convertCurrency(
    @Request() req: ExpressRequest & { user: any },
    @Body() convertDto: ConvertCurrencyDto,
  ) {
    return this.tradingService.convertCurrency(req.user.userId, convertDto);
  }

  /**
   * Trade Naira with other currencies and vice versa
   * @param req - Express request with authenticated user
   * @param convertDto - Trade parameters
   * @returns Transaction details and trade result
   */
  @Post("trade")
  @ApiOperation({ summary: "Trade Naira with other currencies and vice versa" })
  @ApiResponse({ status: 201, description: "Trade executed successfully" })
  @ApiResponse({
    status: 400,
    description: "Insufficient balance or invalid request",
  })
  async tradeCurrency(
    @Request() req: ExpressRequest & { user: any },
    @Body() convertDto: ConvertCurrencyDto,
  ) {
    return this.tradingService.tradeCurrency(req.user.userId, convertDto);
  }

  /**
   * Get preview of currency conversion without executing
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param amount - Amount to convert
   * @returns Conversion preview with current rate
   */
  @Get("preview")
  @ApiOperation({ summary: "Preview currency conversion without executing" })
  @ApiQuery({ name: "from", enum: Currency })
  @ApiQuery({ name: "to", enum: Currency })
  @ApiQuery({ name: "amount", type: Number })
  @ApiResponse({
    status: 200,
    description: "Returns conversion preview with current rate",
  })
  async getConversionPreview(
    @Query("from") fromCurrency: Currency,
    @Query("to") toCurrency: Currency,
    @Query("amount") amount: number,
  ) {
    return this.tradingService.getConversionPreview(
      fromCurrency,
      toCurrency,
      amount,
    );
  }
}
