import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Decimal from "decimal.js";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "../transactions/entities/transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { FxService } from "../fx/fx.service";
import { ConvertCurrencyDto } from "./dto/convert-currency.dto";
import { Currency } from "../wallet/entities/wallet.entity";

/**
 * Service for handling currency conversion and trading operations
 * with support for FX rate management and transaction processing
 */
@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly walletService: WalletService,
    private readonly fxService: FxService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Convert currency from one to another using real-time FX rates
   * Handles idempotency, wallet deductions, and transaction logging
   * @param userId - User's unique identifier
   * @param convertDto - Conversion details including currencies, amount and reference
   * @returns Transaction details and rate information
   * @throws BadRequestException if converting to same currency or invalid transaction
   */
  async convertCurrency(userId: string, convertDto: ConvertCurrencyDto) {
    const { fromCurrency, toCurrency, amount, reference } = convertDto;

    // Validate: cannot convert to same currency
    if (fromCurrency === toCurrency) {
      throw new BadRequestException("Cannot convert to the same currency");
    }

    // Check idempotency
    const existingTransaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (existingTransaction) {
      if (existingTransaction.status === TransactionStatus.COMPLETED) {
        return {
          message: "Conversion already processed",
          transaction: existingTransaction,
        };
      } else if (existingTransaction.status === TransactionStatus.PENDING) {
        throw new BadRequestException(
          "Conversion is being processed. Please wait.",
        );
      } else {
        throw new BadRequestException(
          "Conversion has failed. Please use a new reference.",
        );
      }
    }

    // Get FX rate
    const rateInfo = await this.fxService.getRate(fromCurrency, toCurrency);

    // Calculate converted amount
    const convertedAmount = this.fxService.convertAmount(
      amount.toString(),
      rateInfo.rate,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");

    try {
      // Create pending transaction log (acts as distributed lock)
      const transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.CONVERT,
        fromCurrency,
        fromAmount: amount.toString(),
        toCurrency,
        toAmount: convertedAmount,
        fxRate: rateInfo.rate,
        status: TransactionStatus.PENDING,
        reference,
        metadata: {
          rateSource: rateInfo.source,
          rateTimestamp: rateInfo.timestamp,
          rateAgeSeconds: rateInfo.ageSeconds,
          warning: rateInfo.warning,
        },
      });
      await queryRunner.manager.save(transaction);

      // Deduct from source wallet
      await this.walletService.deductBalance(
        queryRunner,
        userId,
        fromCurrency,
        amount.toString(),
      );

      // Add to destination wallet
      await this.walletService.addBalance(
        queryRunner,
        userId,
        toCurrency,
        convertedAmount,
      );

      // Mark transaction as completed
      transaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      this.logger.log(
        `Conversion completed: ${amount} ${fromCurrency} -> ${convertedAmount} ${toCurrency} @ ${rateInfo.rate}`,
      );

      return {
        message: "Currency converted successfully",
        transaction: {
          id: transaction.id,
          fromCurrency: transaction.fromCurrency,
          fromAmount: transaction.fromAmount,
          toCurrency: transaction.toCurrency,
          toAmount: transaction.toAmount,
          fxRate: transaction.fxRate,
          reference: transaction.reference,
          status: transaction.status,
          createdAt: transaction.createdAt,
        },
        rateInfo: {
          rate: rateInfo.rate,
          timestamp: rateInfo.timestamp,
          ageSeconds: rateInfo.ageSeconds,
          source: rateInfo.source,
          warning: rateInfo.warning,
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();

      // Try to mark transaction as failed
      try {
        const failedTransaction = await this.transactionRepository.findOne({
          where: { reference },
        });
        if (
          failedTransaction &&
          failedTransaction.status === TransactionStatus.PENDING
        ) {
          failedTransaction.status = TransactionStatus.FAILED;
          failedTransaction.errorMessage = error.message;
          await this.transactionRepository.save(failedTransaction);
        }
      } catch (updateError) {
        this.logger.error("Failed to update transaction status", updateError);
      }

      this.logger.error(`Conversion failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Execute currency trade between Naira and other currencies
   * Currently an alias for convertCurrency, can be extended for market orders
   * @param userId - User's unique identifier
   * @param convertDto - Trade details
   * @returns Transaction details and rate information
   */
  async tradeCurrency(userId: string, convertDto: ConvertCurrencyDto) {
    // Trade is essentially the same as convert for this implementation
    // In a real-world scenario, trade might have different business logic
    // (e.g., market orders, limit orders, etc.)
    return this.convertCurrency(userId, convertDto);
  }

  /**
   * Get a preview of currency conversion without executing the trade
   * @param fromCurrency - Source currency
   * @param toCurrency - Target currency
   * @param amount - Amount to convert
   * @returns Conversion preview with current rate and estimated amount
   * @throws BadRequestException if converting to same currency
   */
  async getConversionPreview(
    fromCurrency: Currency,
    toCurrency: Currency,
    amount: number,
  ) {
    if (fromCurrency === toCurrency) {
      throw new BadRequestException("Cannot convert to the same currency");
    }

    const rateInfo = await this.fxService.getRate(fromCurrency, toCurrency);
    const convertedAmount = this.fxService.convertAmount(
      amount.toString(),
      rateInfo.rate,
    );

    return {
      fromCurrency,
      fromAmount: amount.toString(),
      toCurrency,
      toAmount: convertedAmount,
      rate: rateInfo.rate,
      rateTimestamp: rateInfo.timestamp,
      rateAgeSeconds: rateInfo.ageSeconds,
      rateSource: rateInfo.source,
      warning: rateInfo.warning,
      note: "This is a preview. Actual rate may differ at the time of conversion.",
    };
  }
}
