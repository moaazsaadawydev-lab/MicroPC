import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Render,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthGuard } from 'src/Guards/Auth.guard';
import { User } from './entities/user.entity';
import { JwtRefreshTokenGuard } from 'src/Guards/JwtRefreshToken.guard';
import type { Request, Response } from 'express';
import { RAW_REFRESH_TOKEN_KEY } from 'src/utils/constants';
import { UpdateEmailDto } from './dto/Update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { AuthRoleGuard } from 'src/Guards/AuthRole.guard';
import { Roles } from 'src/decorators/UserRoles.decorator';
import { UserRole } from 'src/utils/enums';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('auth/register')
  @UseInterceptors(FileInterceptor('profileImage'))
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.Register(createUserDto, file);
  }

  @Get('verify-email/:token')
  @Render('email-verified')
  async verifyEmail(@Param('token') token: string) {
    return this.usersService.verifyEmail(token);
  }

  @Post('auth/login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.usersService.Login(
      loginUserDto.email,
      loginUserDto.password,
    );

    res.cookie('refreshToken', tokens.refresh_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: tokens.access_token,
    };
  }

  @Post('auth/validate-session')
  @UseGuards(AuthGuard)
  async validateSession(@CurrentUser() user: User) {
    return this.usersService.validateSession(user.id);
  }

  @Post('auth/logout')
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: User) {
    return this.usersService.Logout(user.id);
  }

  @Get('auth/profile')
  @UseGuards(AuthGuard)
  async CurrentUser(@CurrentUser() user: User) {
    return this.usersService.CurrentUser(user.id);
  }

  @Get('all-users')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @UseGuards(AuthGuard, AuthRoleGuard)
  async GetAllUsers() {
    return this.usersService.GetAllUsers();
  }

  @Post('auth/resend-verification-link')
  async resendVerificationLink(@Body('email') email: string) {
    return this.usersService.resendVerificationLink(email);
  }

  @Get('auth/refresh')
  @UseGuards(JwtRefreshTokenGuard)
  async RefreshAccessToken(
    @CurrentUser() user: User,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const oldRefreshToken = req[RAW_REFRESH_TOKEN_KEY];

    const tokens = await this.usersService.refreshSession(
      user.id,
      oldRefreshToken,
    );

    res.cookie('refreshToken', tokens.refresh_token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    return {
      access_token: tokens.access_token,
    };
  }

  @Patch('update-user')
  @UseGuards(AuthGuard)
  @UseInterceptors(FileInterceptor('profileImage'))
  async UpdateUser(
    @CurrentUser() user: User,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.UpdateUser(user.id, updateUserDto, file);
  }

  @Patch('update-email')
  @UseGuards(AuthGuard)
  async UpdateEmail(
    @CurrentUser() user: User,
    @Body() updateEmailDto: UpdateEmailDto,
  ) {
    return this.usersService.UpdateEmail(user.id, updateEmailDto);
  }

  @Patch('update-password')
  @UseGuards(AuthGuard)
  async UpdatePassword(
    @CurrentUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.UpdatePassword(user.id, updatePasswordDto);
  }

  @Post('send-forget-password-code')
  async sendForgetPasswordCode(@Body('email') email: string) {
    return this.usersService.SendForgetPasswordCode(email);
  }

  @Post('verify-forget-password-code')
  async verifyForgetPasswordCode(
    @Body('email') email: string,
    @Body('code') code: number,
  ) {
    return this.usersService.VerifyForgetPasswordCode(email, code);
  }

  @Post('reset-password')
  async resetPassword(
    @Body('email') email: string,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    return this.usersService.ResetPassword(email, resetPasswordDto);
  }

  @Get('auth/google')
  @UseGuards(PassportAuthGuard('google'))
  async googleLogin() {}

  @Get('auth/google/callback')
  @UseGuards(PassportAuthGuard('google'))
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    const user = req.user;

    const tokens = await this.usersService.validateGoogleUser(user);

    res.cookie('refreshToken', tokens.refresh_token, {
      httpOnly: true,
      sameSite: 'strict',
      maxAge: 15 * 24 * 60 * 60 * 1000,
    });

    res.json({
      access_token: tokens.access_token,
    });
  }
}
