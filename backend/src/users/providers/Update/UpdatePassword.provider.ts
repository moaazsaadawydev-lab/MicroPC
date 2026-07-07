import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonService } from 'src/common/common.service';
import { ResetPasswordDto } from 'src/users/dto/reset-password.dto';
import { UpdatePasswordDto } from 'src/users/dto/update-password.dto';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UpdatePasswordProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly commonService: CommonService,
  ) {}

  async UpdatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordMatch = await this.commonService.comparator(
      updatePasswordDto.oldPassword,
      user.password || '',
    );
    if (!isPasswordMatch) {
      throw new BadRequestException('Invalid Password');
    }

    const hashedPassword = await this.commonService.hasher(
      updatePasswordDto.newPassword,
    );

    await this.usersRepository.update(user.id, {
      password: hashedPassword,
      isLoggedIn: false,
      RefreshToken: null,
      RefreshTokenExpireIn: null,
    });

    return {
      message: 'Password updated successfully',
    };
  }

  async SendForgetPasswordCode(email: string) {
      const user = await this.usersRepository.findOne({
        where: { email: email },
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      const forgetPasswordCode = Math.floor(100000 + Math.random() * 900000);
  
      await this.usersRepository.update(user.id, {
        PasswordChangingCode: forgetPasswordCode,
        PasswordChangingCodeExpireIn: new Date(Date.now() + 60 * 60 * 1000),
        PasswordChangingCodeCreatedAt: new Date(),
      });
  
      this.commonService.sendEmail({
        to: user.email,
        subject: 'Forget Password',
        template: 'forget-code',
        context: {
          name: user.username,
          code: forgetPasswordCode,
          expireIn: '1 hour',
        },
      });
  
      return {
        message: 'Forget password code sent successfully, Check your email',
      };
    }
  
    async VerifyForgetPasswordCode(email: string, code: number) {
      const user = await this.usersRepository.findOne({
        where: { email: email },
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      if (user.PasswordChangingCode !== code) {
        throw new BadRequestException('Invalid code');
      }
  
      if (
        user.PasswordChangingCodeExpireIn &&
        user.PasswordChangingCodeExpireIn.getTime() < new Date().getTime()
      ) {
        throw new BadRequestException('Code has expired');
      }
  
      await this.usersRepository.update(user.id, {
        isForgetPasswordCodeVerified: true,
        PasswordChangingCode: null,
        PasswordChangingCodeExpireIn: null,
        PasswordChangingCodeCreatedAt: null,
      });
  
      return {
        message: 'Code verified successfully',
      };
    }
  
    async ResetPassword(email: string, resetPasswordDto: ResetPasswordDto) {
      const user = await this.usersRepository.findOne({
        where: { email: email },
      });
  
      if (!user) {
        throw new NotFoundException('User not found');
      }
  
      if (!user.isForgetPasswordCodeVerified) {
        throw new BadRequestException('Code not verified');
      }
  
      if (resetPasswordDto.password !== resetPasswordDto.confirmPassword) {
        throw new BadRequestException('Passwords do not match');
      }
  
      const hashedPassword = await this.commonService.hasher(
        resetPasswordDto.password,
      );
  
      await this.usersRepository.update(user.id, {
        password: hashedPassword,
        isForgetPasswordCodeVerified: false,
      });
  
      return {
        message: 'Password reset successfully',
      };
    }
}
