import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  VersionColumn,
} from "typeorm";
import { User } from "../../users/entities/user.entity";

/**
 * Supported currency types for wallet
 */
export enum Currency {
  NGN = "NGN",
  USD = "USD",
  EUR = "EUR",
  GBP = "GBP",
}

/**
 * Wallet entity representing user's balance in a specific currency
 */
@Entity("wallets")
@Index(["userId", "currency"], { unique: true })
export class Wallet {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column("uuid")
  userId: string;

  @ManyToOne(() => User, (user) => user.wallets)
  @JoinColumn({ name: "userId" })
  user: User;

  @Column({ type: "enum", enum: Currency })
  currency: Currency;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  balance: string;

  @Column({ type: "decimal", precision: 15, scale: 2, default: 0 })
  lockedBalance: string;

  @VersionColumn()
  version: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
