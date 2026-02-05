import { Controller, Post, Body, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import {
  RegisterDto,
  VerifyOtpDto,
  LoginDto,
  ResendOtpDto,
} from "./dto/auth.dto";

/**
 * Controller handling authentication-related HTTP endpoints
 */
@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account
   * @param registerDto - User registration data
   * @returns Success message and email
   */
  @Post("register")
  @ApiOperation({ summary: "Register a new user and send OTP" })
  @ApiResponse({
    status: 201,
    description: "User registered successfully. OTP sent to email.",
  })
  @ApiResponse({ status: 409, description: "Email already registered" })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  /**
   * Verify user email with OTP code
   * @param verifyOtpDto - Email and OTP for verification
   * @returns JWT token and user data
   */
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Verify email with OTP" })
  @ApiResponse({
    status: 200,
    description: "Email verified successfully. Returns JWT token.",
  })
  @ApiResponse({ status: 400, description: "Invalid or expired OTP" })
  async verifyOtp(@Body() verifyOtpDto: VerifyOtpDto) {
    return this.authService.verifyOtp(verifyOtpDto);
  }

  /**
   * Authenticate user and issue JWT token
   * @param loginDto - User login credentials
   * @returns JWT token and user data
   */
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({
    status: 200,
    description: "Login successful. Returns JWT token.",
  })
  @ApiResponse({
    status: 401,
    description: "Invalid credentials or email not verified",
  })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  /**
   * Resend OTP to user's email
   * @param resendOtpDto - User's email address
   * @returns Success message
   */
  @Post("resend-otp")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Resend OTP to email" })
  @ApiResponse({ status: 200, description: "OTP resent successfully" })
  @ApiResponse({
    status: 400,
    description: "User not found or already verified",
  })
  async resendOtp(@Body() resendOtpDto: ResendOtpDto) {
    return this.authService.resendOtp(resendOtpDto.email);
  }
}
