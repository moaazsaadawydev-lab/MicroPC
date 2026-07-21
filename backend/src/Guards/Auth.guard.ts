import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { USER_KEY } from 'src/utils/constants';

@Injectable()
export class AuthGuard implements CanActivate { 
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const [Type, Token] = request.headers.authorization?.split(' ') || [];

    if (Type != 'Bearer' || !Token) {
      throw new UnauthorizedException('You are not authorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(Token, {
        secret: this.configService.get<string>('ACCESS_JWT_SECRET') as string,
      });

      request[USER_KEY] = payload;
    } catch (error) {
      throw new UnauthorizedException('You are not authorized');
    }

    return true;
  }
}
