import { IsString, MinLength, IsOptional, IsEmail, IsBoolean } from 'class-validator';

export class UpdateProfileDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString({ each: true })
    @IsOptional()
    teamIds?: string[];

    @IsBoolean()
    @IsOptional()
    deepSearchEnabled?: boolean;
}

export class ChangePasswordDto {
    @IsString()
    oldPassword: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}

export class ForgotPasswordDto {
    @IsEmail()
    email: string;
}

export class ResetPasswordDto {
    @IsString()
    token: string;

    @IsString()
    @MinLength(8)
    newPassword: string;
}
