import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { RAW_REFRESH_TOKEN_KEY, USER_KEY } from 'src/utils/constants';

@Injectable()
export class JwtRefreshTokenGuard implements CanActivate {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const refreshToken = request.cookies?.refreshToken;

    try {
      if (!refreshToken) {
        throw new BadRequestException('Refresh token not found');
      }
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: this.configService.get<string>('REFRESH_JWT_SECRET') as string,
      });

      request[USER_KEY] = payload;
      request[RAW_REFRESH_TOKEN_KEY] = refreshToken;
    } catch (error) {
      throw new UnauthorizedException('Refresh token is invalid');
    }

    return true;
  }
}
