import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString, MinLength, IsNotEmpty } from "class-validator";

/**
 * Data transfer object for user registration
 */
export class RegisterDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;
}

/**
 * Data transfer object for OTP verification
 */
export class VerifyOtpDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "123456" })
  @IsString()
  @IsNotEmpty()
  otp: string;
}

/**
 * Data transfer object for user login
 */
export class LoginDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: "SecurePassword123!" })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Data transfer object for resending OTP
 */
export class ResendOtpDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
