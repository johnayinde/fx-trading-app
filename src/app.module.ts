import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CacheModule } from "@nestjs/cache-manager";
import * as redisStore from "cache-manager-redis-store";
import { AuthModule } from "./auth/auth.module";
import { WalletModule } from "./wallet/wallet.module";
import { FxModule } from "./fx/fx.module";
import { TradingModule } from "./trading/trading.module";
import { TransactionsModule } from "./transactions/transactions.module";
import { EmailModule } from "./email/email.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: "postgres",
        host: configService.get("DB_HOST"),
        port: configService.get("DB_PORT"),
        username: configService.get("DB_USERNAME"),
        password: configService.get("DB_PASSWORD"),
        database: configService.get("DB_DATABASE"),
        entities: [__dirname + "/**/*.entity{.ts,.js}"],
        synchronize: configService.get("NODE_ENV") === "development",
        logging: configService.get("NODE_ENV") === "development",
      }),
      inject: [ConfigService],
    }),
    CacheModule.registerAsync({
      imports: [ConfigModule],
      isGlobal: true,
      useFactory: async (configService: ConfigService) => ({
        store: redisStore as any,
        host: configService.get("REDIS_HOST"),
        port: configService.get<number>("REDIS_PORT"),
        password: configService.get("REDIS_PASSWORD") || undefined,
        ttl: configService.get<number>("REDIS_TTL", 60),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    WalletModule,
    FxModule,
    TradingModule,
    TransactionsModule,
    EmailModule,
  ],
})
export class AppModule {}
