import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TradingController } from './trading.controller';
import { TradingService } from './trading.service';
import { Transaction } from '../transactions/entities/transaction.entity';
import { WalletModule } from '../wallet/wallet.module';
import { FxModule } from '../fx/fx.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Transaction]),
    WalletModule,
    FxModule,
  ],
  controllers: [TradingController],
  providers: [TradingService],
  exports: [TradingService],
})
export class TradingModule {}
