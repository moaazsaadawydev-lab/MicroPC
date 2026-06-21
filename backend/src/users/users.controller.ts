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
import { AuthGuard } from 'src/Guards/Auth.guard';
import { User } from './entities/user.entity';
import { JwtRefreshTokenGuard } from 'src/Guards/JwtRefreshToken.guard';
import type { Request, Response } from 'express';
import { RAW_REFRESH_TOKEN_KEY } from 'src/utils/constants';
import { UpdateEmailDto } from './dto/Update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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
    const result = await this.usersService.verifyEmail(token);

    return {
      name: result.user.username,
    };
  }

  @Post('auth/login')
  async login(
    @Body() loginUserDto: LoginUserDto,
    @Req() req: Request,
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

  @Post('auth/refresh')
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

  @Patch('update-email')
  @UseGuards(AuthGuard)
  async UpdateEmail(
    @CurrentUser() user: User,
    @Body() updateEmailDto: UpdateEmailDto,
  ) {
    return this.usersService.UpdateEmail(user.id, updateEmailDto);
  }

  @Patch('update-password')
  async UpdatePassword(
    @CurrentUser() user: User,
    @Body() updatePasswordDto: UpdatePasswordDto,
  ) {
    return this.usersService.UpdatePassword(user.id, updatePasswordDto);
  }

  @Post('send-forget-password-code')
  async sendForgetPasswordCode(@CurrentUser() user: User) {
    return this.usersService.SendForgetPasswordCode(user.id);
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
}
