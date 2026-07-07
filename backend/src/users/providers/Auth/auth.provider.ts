import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async validateSession(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isLoggedIn) {
      throw new BadRequestException('User not logged in');
    }

    if (
      user.RefreshTokenExpireIn &&
      user.RefreshTokenExpireIn.getTime() < new Date().getTime()
    ) {
      throw new BadRequestException('Refresh token expired');
    }

    await this.usersRepository.update(user.id, {
      LastLogin: new Date(),
    });

    return {
      message: 'Session is valid',
    };
  }
}
