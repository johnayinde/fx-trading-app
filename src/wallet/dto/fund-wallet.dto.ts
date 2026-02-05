import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, Min, IsString } from "class-validator";
import { Currency } from "../entities/wallet.entity";

/**
 * Data transfer object for funding wallet
 */
export class FundWalletDto {
  @ApiProperty({ enum: Currency, example: Currency.NGN })
  @IsEnum(Currency)
  @IsNotEmpty()
  currency: Currency;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: "fund-ref-123" })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
