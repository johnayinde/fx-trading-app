import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import { Request as ExpressRequest } from "express";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { WalletService } from "./wallet.service";
import { FundWalletDto } from "./dto/fund-wallet.dto";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { Currency } from "./entities/wallet.entity";

/**
 * Controller handling wallet-related HTTP endpoints
 */
@ApiTags("Wallet")
@Controller("wallet")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  /**
   * Get all wallets for authenticated user
   * @param req - Express request with authenticated user
   * @returns List of all user wallets
   */
  @Get()
  @ApiOperation({ summary: "Get all user wallet balances" })
  @ApiResponse({
    status: 200,
    description: "Returns all wallet balances by currency",
  })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async getUserWallets(@Request() req: ExpressRequest & { user: any }) {
    const wallets = await this.walletService.getUserWallets(req.user.userId);
    return {
      message: "Wallets retrieved successfully",
      wallets: wallets.map((wallet) => ({
        currency: wallet.currency,
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        updatedAt: wallet.updatedAt,
      })),
    };
  }

  /**
   * Get wallet balance for specific currency
   * @param req - Express request with authenticated user
   * @param currency - Currency type
   * @returns Wallet balance for specified currency
   */
  @Get(":currency")
  @ApiOperation({ summary: "Get specific currency wallet balance" })
  @ApiResponse({
    status: 200,
    description: "Returns wallet balance for specified currency",
  })
  @ApiResponse({ status: 404, description: "Wallet not found" })
  async getWalletBalance(
    @Request() req: ExpressRequest & { user: any },
    @Param("currency") currency: Currency,
  ) {
    const wallet = await this.walletService.getWalletBalance(
      req.user.userId,
      currency,
    );
    return {
      message: "Wallet balance retrieved successfully",
      wallet: {
        currency: wallet.currency,
        balance: wallet.balance,
        lockedBalance: wallet.lockedBalance,
        updatedAt: wallet.updatedAt,
      },
    };
  }

  /**
   * Fund wallet with specified amount and currency
   * @param req - Express request with authenticated user
   * @param fundWalletDto - Funding details
   * @returns Transaction details and updated wallet
   */
  @Post("fund")
  @ApiOperation({ summary: "Fund wallet in any supported currency" })
  @ApiResponse({ status: 201, description: "Wallet funded successfully" })
  @ApiResponse({
    status: 400,
    description: "Invalid request or duplicate reference",
  })
  async fundWallet(
    @Request() req: ExpressRequest & { user: any },
    @Body() fundWalletDto: FundWalletDto,
  ) {
    return this.walletService.fundWallet(req.user.userId, fundWalletDto);
  }
}
