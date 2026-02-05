import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

/**
 * Bootstrap the NestJS application with global configuration,
 * validation pipes, CORS, and Swagger documentation
 */
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors();

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("FX Trading App API")
    .setDescription(
      "Multi-currency wallet and FX trading platform with real-time exchange rates. " +
        "Users can register, fund wallets, and trade between NGN and major international currencies (USD, EUR, GBP).",
    )
    .setVersion("1.0")
    .addBearerAuth()
    .addTag(
      "Authentication",
      "User registration, email verification, and login",
    )
    .addTag("Wallet", "Multi-currency wallet management and funding")
    .addTag("FX Rates", "Real-time foreign exchange rates")
    .addTag("Trading", "Currency conversion and trading operations")
    .addTag("Transactions", "Transaction history and details")
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, document, {
    customSiteTitle: "FX Trading API Documentation",
    customCss: ".swagger-ui .topbar { display: none }",
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  console.log(`
🚀 Application is running on: http://localhost:${port}
📚 Swagger documentation: http://localhost:${port}/api/docs
  `);
}

bootstrap();
