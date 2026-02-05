import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

/**
 * Types of transactions supported by the system
 */
export enum TransactionType {
  FUND = "FUND",
  CONVERT = "CONVERT",
  TRADE = "TRADE",
}

/**
 * Status states for transaction lifecycle
 */
export enum TransactionStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
}

/**
 * Transaction entity for logging all financial operations
 * with support for fund deposits, currency conversions, and trades
 */
@Entity("transactions")
@Index(["userId"])
@Index(["reference"], { unique: true })
@Index(["status"])
@Index(["createdAt"])
export class Transaction {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => User, (user) => user.transactions)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "enum", enum: TransactionType })
  type: TransactionType;

  @Column({ nullable: true })
  fromCurrency: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  fromAmount: string;

  @Column({ nullable: true })
  toCurrency: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  toAmount: string;

  @Column({ type: "decimal", precision: 10, scale: 6, nullable: true })
  fxRate: string;

  @Column({
    type: "enum",
    enum: TransactionStatus,
    default: TransactionStatus.PENDING,
  })
  status: TransactionStatus;

  @Column({ unique: true })
  reference: string;

  @Column({ type: "jsonb", nullable: true })
  metadata: any;

  @Column({ type: "text", nullable: true })
  errorMessage: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
