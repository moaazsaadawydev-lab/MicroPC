import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from 'src/users/entities/user.entity';
import { Repository } from 'typeorm';
import { CommonService } from 'src/common/common.service';

@Injectable()
export class RefreshAuthProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly commonService: CommonService,
  ) {}

  async updateRefreshToken(userId: string, refreshToken: string) {
    await this.usersRepository.update(userId, {
      RefreshToken: refreshToken,
    });
  }
  async refreshSession(userId: string, refreshToken: string) {
    const user = await this.usersRepository.findOne({ where: { id: userId } });
    if (!user || !user.RefreshToken) {
      throw new UnauthorizedException('Access Denied or Session Expired');
    }

    const isTokenMatch = await this.commonService.comparator(
      refreshToken,
      user.RefreshToken,
    );
    if (!isTokenMatch) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (
      user.RefreshTokenExpireIn &&
      user.RefreshTokenExpireIn.getTime() < new Date().getTime()
    ) {
      throw new UnauthorizedException('Refresh token expired');
    }

    const tokens = await this.commonService.generateTokens(user);
    await this.updateRefreshToken(user.id, tokens.hashed_refresh_token);
    return tokens;
  }
}
