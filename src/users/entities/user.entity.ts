import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from "typeorm";
import { Exclude } from "class-transformer";
import { Wallet } from "../../wallet/entities/wallet.entity";
import { Transaction } from "../../transactions/entities/transaction.entity";

/**
 * User roles for authorization and access control
 */
export enum UserRole {
  USER = "USER",
  ADMIN = "ADMIN",
}

/**
 * User entity representing registered users with authentication
 * and multi-currency wallet capabilities
 */
@Entity("users")
export class User {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  @Exclude()
  password: string;

  @Column({ type: "enum", enum: UserRole, default: UserRole.USER })
  role: UserRole;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ type: "varchar", nullable: true })
  @Exclude()
  otp: string | null;

  @Column({ type: "timestamp", nullable: true })
  @Exclude()
  otpExpiry: Date | null;

  @Column({ default: 0 })
  @Exclude()
  otpAttempts: number;

  @OneToMany(() => Wallet, (wallet) => wallet.user)
  wallets: Wallet[];

  @OneToMany(() => Transaction, (transaction) => transaction.user)
  transactions: Transaction[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
