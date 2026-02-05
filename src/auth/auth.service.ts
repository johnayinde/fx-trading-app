import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { User } from "../users/entities/user.entity";
import { RegisterDto, VerifyOtpDto, LoginDto } from "./dto/auth.dto";
import { EmailService } from "../email/email.service";

/**
 * Service responsible for handling authentication operations
 * including user registration, login, OTP verification, and token management
 */
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * Register a new user and send OTP for email verification
   * @param registerDto - User registration data (email and password)
   * @returns Registration success message with email
   * @throws ConflictException if email is already registered
   */
  async register(registerDto: RegisterDto) {
    const { email, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException("Email already registered");
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = this.generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10); // 10 minutes expiry

    // Create user
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      otp,
      otpExpiry,
      isVerified: false,
    });

    await this.userRepository.save(user);

    // Send OTP email
    await this.emailService.sendOTP(email, otp);

    return {
      message: "Registration successful. Please check your email for OTP.",
      email,
    };
  }

  /**
   * Verify user's email using the OTP code
   * @param verifyOtpDto - Email and OTP code for verification
   * @returns JWT token and user information upon successful verification
   * @throws UnauthorizedException if credentials are invalid
   * @throws BadRequestException if account is already verified, OTP expired, or max attempts exceeded
   */
  async verifyOtp(verifyOtpDto: VerifyOtpDto) {
    const { email, otp } = verifyOtpDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (user.isVerified) {
      throw new BadRequestException("Account already verified");
    }

    // Check OTP attempts
    if (user.otpAttempts >= 3) {
      throw new BadRequestException(
        "Maximum OTP attempts exceeded. Please request a new OTP.",
      );
    }

    // Check OTP expiry
    if (!user.otpExpiry || new Date() > user.otpExpiry) {
      throw new BadRequestException(
        "OTP has expired. Please request a new one.",
      );
    }

    // Verify OTP
    if (user.otp !== otp) {
      user.otpAttempts += 1;
      await this.userRepository.save(user);
      throw new UnauthorizedException("Invalid OTP");
    }

    // Mark as verified
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;
    user.otpAttempts = 0;
    await this.userRepository.save(user);

    // Generate JWT token
    const token = await this.generateToken(user);

    return {
      message: "Email verified successfully",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Authenticate user and generate JWT token
   * @param loginDto - User login credentials (email and password)
   * @returns JWT token and user information
   * @throws UnauthorizedException if credentials are invalid or email not verified
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.isVerified) {
      throw new UnauthorizedException("Please verify your email first");
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    // Generate JWT token
    const token = await this.generateToken(user);

    return {
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }

  /**
   * Resend OTP to user's email for verification
   * @param email - User's email address
   * @returns Success message with email
   * @throws BadRequestException if user not found or already verified
   */
  async resendOtp(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      throw new BadRequestException("User not found");
    }

    if (user.isVerified) {
      throw new BadRequestException("Account already verified");
    }

    // Generate new OTP
    const otp = this.generateOTP();
    const otpExpiry = new Date();
    otpExpiry.setMinutes(otpExpiry.getMinutes() + 10);

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpAttempts = 0;
    await this.userRepository.save(user);

    // Send OTP email
    await this.emailService.sendOTP(email, otp);

    return {
      message: "OTP sent successfully",
      email,
    };
  }

  /**
   * Generate a random 6-digit OTP code
   * @returns 6-digit OTP string
   */
  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate JWT token for authenticated user
   * @param user - User entity
   * @returns JWT token string
   */
  private async generateToken(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    return this.jwtService.sign(payload);
  }

  /**
   * Validate and retrieve user by ID for JWT authentication
   * @param userId - User's unique identifier
   * @returns User entity
   * @throws UnauthorizedException if user not found
   */
  async validateUser(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    return user;
  }
}
