import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { DataSource } from "typeorm";
import { BadRequestException } from "@nestjs/common";
import { TradingService } from "./trading.service";
import {
  Transaction,
  TransactionStatus,
} from "../transactions/entities/transaction.entity";
import { WalletService } from "../wallet/wallet.service";
import { FxService } from "../fx/fx.service";
import { Currency } from "../wallet/entities/wallet.entity";

describe("TradingService", () => {
  let service: TradingService;
  let walletService: WalletService;
  let fxService: FxService;
  let transactionRepository: any;
  let dataSource: any;

  const mockTransactionRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockWalletService = {
    deductBalance: jest.fn(),
    addBalance: jest.fn(),
  };

  const mockFxService = {
    getRate: jest.fn(),
    convertAmount: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradingService,
        {
          provide: getRepositoryToken(Transaction),
          useValue: mockTransactionRepository,
        },
        {
          provide: WalletService,
          useValue: mockWalletService,
        },
        {
          provide: FxService,
          useValue: mockFxService,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<TradingService>(TradingService);
    walletService = module.get<WalletService>(WalletService);
    fxService = module.get<FxService>(FxService);
    transactionRepository = module.get(getRepositoryToken(Transaction));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("convertCurrency", () => {
    it("should convert currency successfully", async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
        reference: "test-ref-123",
      };

      const rateInfo = {
        fromCurrency: "NGN",
        toCurrency: "USD",
        rate: "0.00065",
        timestamp: new Date(),
        ageSeconds: 0,
        source: "test",
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockFxService.getRate.mockResolvedValue(rateInfo);
      mockFxService.convertAmount.mockReturnValue("6.50");
      mockTransactionRepository.create.mockReturnValue({
        id: "123",
        ...convertDto,
        status: TransactionStatus.PENDING,
      });
      mockQueryRunner.manager.save.mockResolvedValue({
        id: "123",
        status: TransactionStatus.COMPLETED,
      });
      mockWalletService.deductBalance.mockResolvedValue({});
      mockWalletService.addBalance.mockResolvedValue({});

      const result = await service.convertCurrency("user-123", convertDto);

      expect(result).toHaveProperty("message");
      expect(result.transaction).toHaveProperty("fromCurrency", Currency.NGN);
      expect(result.transaction).toHaveProperty("toCurrency", Currency.USD);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it("should throw error for same currency conversion", async () => {
      const convertDto = {
        fromCurrency: Currency.USD,
        toCurrency: Currency.USD,
        amount: 100,
        reference: "test-ref",
      };

      await expect(
        service.convertCurrency("user-123", convertDto),
      ).rejects.toThrow(BadRequestException);
    });

    it("should return cached result for duplicate reference", async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
        reference: "existing-ref",
      };

      const existingTransaction = {
        id: "123",
        ...convertDto,
        status: TransactionStatus.COMPLETED,
        toAmount: "6.50",
      };

      mockTransactionRepository.findOne.mockResolvedValue(existingTransaction);

      const result = await service.convertCurrency("user-123", convertDto);

      expect(result).toHaveProperty("message", "Conversion already processed");
      expect(result).toHaveProperty("transaction", existingTransaction);
    });

    it("should rollback transaction on error", async () => {
      const convertDto = {
        fromCurrency: Currency.NGN,
        toCurrency: Currency.USD,
        amount: 10000,
        reference: "test-ref",
      };

      mockTransactionRepository.findOne.mockResolvedValue(null);
      mockFxService.getRate.mockResolvedValue({
        rate: "0.00065",
        fromCurrency: "NGN",
        toCurrency: "USD",
        timestamp: new Date(),
        ageSeconds: 0,
        source: "test",
      });
      mockFxService.convertAmount.mockReturnValue("6.50");
      mockTransactionRepository.create.mockReturnValue({
        id: "123",
        status: TransactionStatus.PENDING,
      });
      mockQueryRunner.manager.save.mockResolvedValue({});
      mockWalletService.deductBalance.mockRejectedValue(
        new Error("Insufficient balance"),
      );

      await expect(
        service.convertCurrency("user-123", convertDto),
      ).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe("getConversionPreview", () => {
    it("should return conversion preview", async () => {
      const rateInfo = {
        fromCurrency: "NGN",
        toCurrency: "USD",
        rate: "0.00065",
        timestamp: new Date(),
        ageSeconds: 0,
        source: "test",
      };

      mockFxService.getRate.mockResolvedValue(rateInfo);
      mockFxService.convertAmount.mockReturnValue("6.50");

      const result = await service.getConversionPreview(
        Currency.NGN,
        Currency.USD,
        10000,
      );

      expect(result).toHaveProperty("fromCurrency", Currency.NGN);
      expect(result).toHaveProperty("toCurrency", Currency.USD);
      expect(result).toHaveProperty("toAmount", "6.50");
      expect(result).toHaveProperty("rate", "0.00065");
      expect(result).toHaveProperty("note");
    });
  });
});
