import { Body, Controller, Patch, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { UpdateUserDto } from '../dto/UpdateUser.dto';
import { UsersService } from '../users.service';
import { UpdatePasswordDto } from '../dto/update-password.dto';
import { UpdateEmailDto } from '../dto/Update-email.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';

@Controller('users/auth')
export class UpdateController {
  constructor(private readonly usersService: UsersService) {}

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
}
