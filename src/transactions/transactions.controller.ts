import {
  Controller,
  Get,
  Param,
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
import { TransactionsService } from "./transactions.service";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";

/**
 * Controller for transaction history and details endpoints
 */
@ApiTags("Transactions")
@Controller("transactions")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  /**
   * Get paginated transaction history for authenticated user
   * @param req - Express request with authenticated user
   * @param limit - Number of transactions to return
   * @param offset - Pagination offset
   * @returns List of transactions with pagination info
   */
  @Get()
  @ApiOperation({ summary: "Get user transaction history" })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Number of transactions to return (default: 50)",
  })
  @ApiQuery({
    name: "offset",
    required: false,
    type: Number,
    description: "Offset for pagination (default: 0)",
  })
  @ApiResponse({ status: 200, description: "Returns user transaction history" })
  async getTransactionHistory(
    @Request() req: ExpressRequest & { user: any },
    @Query("limit") limit = 50,
    @Query("offset") offset = 0,
  ) {
    const transactions = await this.transactionsService.getUserTransactions(
      req.user.userId,
      parseInt(limit as any),
      parseInt(offset as any),
    );

    return {
      message: "Transaction history retrieved successfully",
      transactions,
      limit: parseInt(limit as any),
      offset: parseInt(offset as any),
    };
  }

  /**
   * Get specific transaction details by ID
   * @param req - Express request with authenticated user
   * @param id - Transaction ID
   * @returns Transaction details
   */
  @Get(":id")
  @ApiOperation({ summary: "Get specific transaction details" })
  @ApiResponse({ status: 200, description: "Returns transaction details" })
  @ApiResponse({ status: 404, description: "Transaction not found" })
  async getTransaction(
    @Request() req: ExpressRequest & { user: any },
    @Param("id") id: string,
  ) {
    const transaction = await this.transactionsService.getTransaction(
      req.user.userId,
      id,
    );

    return {
      message: "Transaction retrieved successfully",
      transaction,
    };
  }
}
