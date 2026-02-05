import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { JwtService } from "@nestjs/jwt";
import {
  ConflictException,
  UnauthorizedException,
  BadRequestException,
} from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { User } from "../users/entities/user.entity";
import { EmailService } from "../email/email.service";
import * as bcrypt from "bcrypt";

describe("AuthService", () => {
  let service: AuthService;
  let userRepository: any;
  let jwtService: JwtService;
  let emailService: EmailService;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockEmailService = {
    sendOTP: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(getRepositoryToken(User));
    jwtService = module.get<JwtService>(JwtService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user and send OTP", async () => {
      const registerDto = {
        email: "test@example.com",
        password: "Password123!",
      };

      mockUserRepository.findOne.mockResolvedValue(null);
      mockUserRepository.create.mockReturnValue({
        ...registerDto,
        otp: "123456",
        otpExpiry: new Date(),
      });
      mockUserRepository.save.mockResolvedValue({
        id: "123",
        ...registerDto,
      });
      mockEmailService.sendOTP.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toHaveProperty("message");
      expect(result).toHaveProperty("email", registerDto.email);
      expect(mockEmailService.sendOTP).toHaveBeenCalled();
    });

    it("should throw ConflictException if email already exists", async () => {
      const registerDto = {
        email: "existing@example.com",
        password: "Password123!",
      };

      mockUserRepository.findOne.mockResolvedValue({ id: "123" });

      await expect(service.register(registerDto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("verifyOtp", () => {
    it("should verify OTP and return JWT token", async () => {
      const verifyDto = {
        email: "test@example.com",
        otp: "123456",
      };

      const mockUser = {
        id: "123",
        email: verifyDto.email,
        otp: "123456",
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
        isVerified: false,
        role: "USER",
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue({
        ...mockUser,
        isVerified: true,
      });
      mockJwtService.sign.mockReturnValue("jwt-token");

      const result = await service.verifyOtp(verifyDto);

      expect(result).toHaveProperty("token", "jwt-token");
      expect(result).toHaveProperty("message");
      expect(mockUserRepository.save).toHaveBeenCalled();
    });

    it("should throw UnauthorizedException for invalid OTP", async () => {
      const verifyDto = {
        email: "test@example.com",
        otp: "wrong-otp",
      };

      const mockUser = {
        id: "123",
        email: verifyDto.email,
        otp: "123456",
        otpExpiry: new Date(Date.now() + 10 * 60 * 1000),
        otpAttempts: 0,
        isVerified: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockUserRepository.save.mockResolvedValue(mockUser);

      await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("should throw BadRequestException for expired OTP", async () => {
      const verifyDto = {
        email: "test@example.com",
        otp: "123456",
      };

      const mockUser = {
        id: "123",
        email: verifyDto.email,
        otp: "123456",
        otpExpiry: new Date(Date.now() - 1000), // Expired
        otpAttempts: 0,
        isVerified: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.verifyOtp(verifyDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("login", () => {
    it("should login user and return JWT token", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "Password123!",
      };

      const hashedPassword = await bcrypt.hash(loginDto.password, 10);
      const mockUser = {
        id: "123",
        email: loginDto.email,
        password: hashedPassword,
        isVerified: true,
        role: "USER",
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);
      mockJwtService.sign.mockReturnValue("jwt-token");

      const result = await service.login(loginDto);

      expect(result).toHaveProperty("token", "jwt-token");
      expect(result).toHaveProperty("message");
    });

    it("should throw UnauthorizedException for unverified user", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "Password123!",
      };

      const mockUser = {
        id: "123",
        email: loginDto.email,
        password: "hashed",
        isVerified: false,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      await expect(service.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
