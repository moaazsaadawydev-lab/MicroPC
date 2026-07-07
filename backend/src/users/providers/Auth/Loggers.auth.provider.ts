import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonService } from 'src/common/common.service';
import { User } from 'src/users/entities/user.entity';
import { AccountStatus } from 'src/utils/enums';
import { Repository } from 'typeorm';

@Injectable()
export class LoggerAuthProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly commonService: CommonService,
  ) {}

  async Login(email: string, password: string) {
    const user = await this.usersRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.AccountStatus === AccountStatus.BANNED) {
      throw new BadRequestException('Your account is banned');
    }

    if (user.AccountStatus === AccountStatus.SUSPENDED) {
      throw new BadRequestException('Your account is suspended');
    }

    const isMatch = await this.commonService.comparator(
      password,
      user.password || '',
    );

    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    if (!user.isEmailVerified && !user.PendingEmail) {
      throw new BadRequestException('You need to verify your email');
    }

    const tokens = await this.commonService.generateTokens(user);

    await this.usersRepository.update(user.id, {
      RefreshToken: tokens.hashed_refresh_token,
      RefreshTokenExpireIn: new Date(Date.now() + 60 * 60 * 24 * 15 * 1000),
      isLoggedIn: true,
      LastLogin: new Date(),
    });

    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    };
  }

  async Logout(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isLoggedIn) {
      throw new BadRequestException('User not logged in');
    }

    await this.usersRepository.update(user.id, {
      isLoggedIn: false,
      RefreshToken: null,
      RefreshTokenExpireIn: null,
    });

    return {
      message: 'User logged out successfully',
    };
  }
}
