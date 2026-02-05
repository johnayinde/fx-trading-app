import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { CacheModule } from '@nestjs/cache-manager';
import { FxController } from './fx.controller';
import { FxService } from './fx.service';
import { FxRate } from './entities/fx-rate.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([FxRate]),
    HttpModule,
    CacheModule.register(),
  ],
  controllers: [FxController],
  providers: [FxService],
  exports: [FxService],
})
export class FxModule {}
