import { ApiProperty } from "@nestjs/swagger";
import { IsEnum, IsNotEmpty, IsNumber, Min, IsString } from "class-validator";
import { Currency } from "../../wallet/entities/wallet.entity";

/**
 * Data transfer object for currency conversion/trading
 */
export class ConvertCurrencyDto {
  @ApiProperty({ enum: Currency, example: Currency.NGN })
  @IsEnum(Currency)
  @IsNotEmpty()
  fromCurrency: Currency;

  @ApiProperty({ enum: Currency, example: Currency.USD })
  @IsEnum(Currency)
  @IsNotEmpty()
  toCurrency: Currency;

  @ApiProperty({ example: 10000 })
  @IsNumber()
  @Min(0.01)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({ example: "convert-ref-123" })
  @IsString()
  @IsNotEmpty()
  reference: string;
}
