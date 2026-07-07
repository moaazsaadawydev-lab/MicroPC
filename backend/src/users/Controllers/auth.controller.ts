import {
  Controller,
  Get,
  Post,
  Body,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from '../users.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { LoginUserDto } from '../dto/login.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { AuthGuard as PassportAuthGuard } from '@nestjs/passport';
import { AuthGuard } from 'src/Guards/Auth.guard';
import { JwtRefreshTokenGuard } from 'src/Guards/JwtRefreshToken.guard';
import type { Request, Response } from 'express';
import { RAW_REFRESH_TOKEN_KEY } from 'src/utils/constants';
import { User } from '../entities/user.entity';

@Controller('users/auth')
export class AuthController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseInterceptors(FileInterceptor('profileImage'))
  async create(
    @Body() createUserDto: CreateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.Register(createUserDto, file);
  }

  @Post('login')
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

  @Post('validate-session')
  @UseGuards(AuthGuard)
  async validateSession(@CurrentUser() user: User) {
    return this.usersService.validateSession(user.id);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@CurrentUser() user: User) {
    return this.usersService.Logout(user.id);
  }

  @Get('profile')
  @UseGuards(AuthGuard)
  async CurrentUser(@CurrentUser() user: User) {
    return this.usersService.CurrentUser(user.id);
  }

  @Get('refresh')
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

  @Post('resend-verification-link')
  async resendVerificationLink(@Body('email') email: string) {
    return this.usersService.resendVerificationLink(email);
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
