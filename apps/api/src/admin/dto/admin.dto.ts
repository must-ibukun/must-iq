import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

export class InviteUserDto {
    @IsEmail()
    email: string;

    @IsString()
    name: string;

    @IsEnum(['ADMIN', 'MANAGER', 'EMPLOYEE', 'VIEWER'])
    role: string;

    @IsString({ each: true })
    @IsOptional()
    teamIds?: string[];
}
