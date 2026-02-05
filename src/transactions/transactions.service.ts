import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Transaction } from "./entities/transaction.entity";

/**
 * Service for managing and retrieving transaction history
 */
@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
  ) {}

  /**
   * Get transaction history for a user with pagination
   * @param userId - User's unique identifier
   * @param limit - Maximum number of transactions to return
   * @param offset - Number of transactions to skip
   * @returns Array of transactions ordered by creation date (newest first)
   */
  async getUserTransactions(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<Transaction[]> {
    return this.transactionRepository.find({
      where: { userId },
      order: { createdAt: "DESC" },
      take: limit,
      skip: offset,
    });
  }

  /**
   * Get specific transaction details by ID
   * @param userId - User's unique identifier
   * @param transactionId - Transaction's unique identifier
   * @returns Transaction entity
   * @throws NotFoundException if transaction not found or doesn't belong to user
   */
  async getTransaction(
    userId: string,
    transactionId: string,
  ): Promise<Transaction> {
    const transaction = await this.transactionRepository.findOne({
      where: { id: transactionId, userId },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    return transaction;
  }
}
