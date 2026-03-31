import { Body, Controller, Get, Patch, Post, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from './dto/profile.dto';
import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC, AuthGuard } from './auth.guard';

export const Public = () => SetMetadata(IS_PUBLIC, true);

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    login(@Body() body: LoginDto) {
        return this.authService.login(body.email, body.password);
    }

    @UseGuards(AuthGuard)
    @Get('profile')
    getProfile(@Req() req: any) {
        return this.authService.getProfile(req.user.sub);
    }

    @UseGuards(AuthGuard)
    @Patch('profile')
    updateProfile(@Req() req: any, @Body() body: UpdateProfileDto) {
        return this.authService.updateProfile(req.user.sub, body);
    }

    @UseGuards(AuthGuard)
    @Post('change-password')
    @HttpCode(HttpStatus.OK)
    changePassword(@Req() req: any, @Body() body: ChangePasswordDto) {
        return this.authService.changePassword(req.user.sub, body.oldPassword, body.newPassword);
    }

    @Public()
    @Post('forgot-password')
    @HttpCode(HttpStatus.OK)
    forgotPassword(@Body() body: ForgotPasswordDto) {
        return this.authService.forgotPassword(body.email);
    }

    @Public()
    @Post('reset-password')
    @HttpCode(HttpStatus.OK)
    resetPassword(@Body() body: ResetPasswordDto) {
        return this.authService.resetPassword(body.token, body.newPassword);
    }
}
