import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Index,
} from "typeorm";

/**
 * Entity for storing historical FX rate data for audit trail and fallback
 */
@Entity("fx_rates")
@Index(["fromCurrency", "toCurrency"])
@Index(["fetchedAt"])
export class FxRate {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  fromCurrency: string;

  @Column()
  toCurrency: string;

  @Column({ type: "decimal", precision: 10, scale: 6 })
  rate: string;

  @Column({ nullable: true })
  source: string;

  @CreateDateColumn()
  fetchedAt: Date;
}
