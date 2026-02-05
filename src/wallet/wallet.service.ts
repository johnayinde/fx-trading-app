import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import Decimal from "decimal.js";
import { Wallet, Currency } from "./entities/wallet.entity";
import {
  Transaction,
  TransactionType,
  TransactionStatus,
} from "../transactions/entities/transaction.entity";
import { FundWalletDto } from "./dto/fund-wallet.dto";

/**
 * Service for managing user wallet operations including balance management,
 * funding, and multi-currency support
 */
@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private readonly walletRepository: Repository<Wallet>,
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Get existing wallet or create a new one for the specified currency
   * @param userId - User's unique identifier
   * @param currency - Currency type for the wallet
   * @returns Wallet entity
   */
  async getOrCreateWallet(userId: string, currency: Currency): Promise<Wallet> {
    let wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        currency,
        balance: "0.00",
        lockedBalance: "0.00",
      });
      await this.walletRepository.save(wallet);
    }

    return wallet;
  }

  /**
   * Retrieve all wallets for a user across all currencies
   * @param userId - User's unique identifier
   * @returns Array of wallet entities
   */
  async getUserWallets(userId: string): Promise<Wallet[]> {
    return this.walletRepository.find({
      where: { userId },
      order: { currency: "ASC" },
    });
  }

  /**
   * Get wallet balance for a specific currency
   * @param userId - User's unique identifier
   * @param currency - Currency type
   * @returns Wallet entity with balance
   * @throws NotFoundException if wallet doesn't exist
   */
  async getWalletBalance(userId: string, currency: Currency): Promise<Wallet> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for currency ${currency}`);
    }

    return wallet;
  }

  /**
   * Fund a wallet with idempotency support using transaction reference
   * @param userId - User's unique identifier
   * @param fundWalletDto - Funding details including amount, currency and reference
   * @returns Transaction and updated wallet information
   * @throws BadRequestException if duplicate or invalid transaction
   */
  async fundWallet(userId: string, fundWalletDto: FundWalletDto) {
    const { currency, amount, reference } = fundWalletDto;

    // Check if transaction reference already exists (idempotency)
    const existingTransaction = await this.transactionRepository.findOne({
      where: { reference },
    });

    if (existingTransaction) {
      if (existingTransaction.status === TransactionStatus.COMPLETED) {
        return {
          message: "Transaction already processed",
          transaction: existingTransaction,
        };
      } else if (existingTransaction.status === TransactionStatus.PENDING) {
        throw new BadRequestException(
          "Transaction is being processed. Please wait.",
        );
      } else {
        throw new BadRequestException(
          "Transaction has failed. Please use a new reference.",
        );
      }
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction("SERIALIZABLE");

    try {
      // Create pending transaction
      const transaction = this.transactionRepository.create({
        userId,
        type: TransactionType.FUND,
        toCurrency: currency,
        toAmount: amount.toString(),
        status: TransactionStatus.PENDING,
        reference,
        metadata: {
          fundingMethod: "direct",
        },
      });
      await queryRunner.manager.save(transaction);

      // Get or create wallet with lock
      let wallet = await queryRunner.manager.findOne(Wallet, {
        where: { userId, currency },
        lock: { mode: "pessimistic_write" },
      });

      if (!wallet) {
        wallet = this.walletRepository.create({
          userId,
          currency,
          balance: "0.00",
          lockedBalance: "0.00",
        });
      }

      // Update balance
      const newBalance = new Decimal(wallet.balance).plus(amount).toFixed(2);
      wallet.balance = newBalance;
      await queryRunner.manager.save(wallet);

      // Mark transaction as completed
      transaction.status = TransactionStatus.COMPLETED;
      await queryRunner.manager.save(transaction);

      await queryRunner.commitTransaction();

      return {
        message: "Wallet funded successfully",
        transaction,
        wallet,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Check if user has sufficient balance in specified currency
   * @param userId - User's unique identifier
   * @param currency - Currency type
   * @param amount - Amount to check
   * @returns True if sufficient balance, false otherwise
   */
  async checkSufficientBalance(
    userId: string,
    currency: Currency,
    amount: string,
  ): Promise<boolean> {
    const wallet = await this.walletRepository.findOne({
      where: { userId, currency },
    });

    if (!wallet) {
      return false;
    }

    const balance = new Decimal(wallet.balance);
    const requiredAmount = new Decimal(amount);

    return balance.greaterThanOrEqualTo(requiredAmount);
  }

  /**
   * Deduct amount from wallet balance with pessimistic locking
   * @param queryRunner - Database query runner for transaction
   * @param userId - User's unique identifier
   * @param currency - Currency type
   * @param amount - Amount to deduct
   * @returns Updated wallet entity
   * @throws NotFoundException if wallet doesn't exist
   * @throws BadRequestException if insufficient balance
   */
  async deductBalance(
    queryRunner: any,
    userId: string,
    currency: Currency,
    amount: string,
  ): Promise<Wallet> {
    const wallet = await queryRunner.manager.findOne(Wallet, {
      where: { userId, currency },
      lock: { mode: "pessimistic_write" },
    });

    if (!wallet) {
      throw new NotFoundException(`Wallet not found for currency ${currency}`);
    }

    const currentBalance = new Decimal(wallet.balance);
    const deductAmount = new Decimal(amount);

    if (currentBalance.lessThan(deductAmount)) {
      throw new BadRequestException(
        `Insufficient balance in ${currency} wallet`,
      );
    }

    wallet.balance = currentBalance.minus(deductAmount).toFixed(2);
    return queryRunner.manager.save(wallet);
  }

  /**
   * Add amount to wallet balance with pessimistic locking
   * @param queryRunner - Database query runner for transaction
   * @param userId - User's unique identifier
   * @param currency - Currency type
   * @param amount - Amount to add
   * @returns Updated wallet entity
   */
  async addBalance(
    queryRunner: any,
    userId: string,
    currency: Currency,
    amount: string,
  ): Promise<Wallet> {
    let wallet = await queryRunner.manager.findOne(Wallet, {
      where: { userId, currency },
      lock: { mode: "pessimistic_write" },
    });

    if (!wallet) {
      wallet = this.walletRepository.create({
        userId,
        currency,
        balance: "0.00",
        lockedBalance: "0.00",
      });
    }

    const currentBalance = new Decimal(wallet.balance);
    const addAmount = new Decimal(amount);

    wallet.balance = currentBalance.plus(addAmount).toFixed(2);
    return queryRunner.manager.save(wallet);
  }
}
