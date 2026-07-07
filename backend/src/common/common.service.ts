import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { User } from 'src/users/entities/user.entity';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class CommonService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  public async hasher(hashString: string): Promise<string> {
    return await bcrypt.hash(hashString, 10);
  }

  public async comparator(plainText: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hash);
  }

  public async generateTokens(user: User) {
    const AccessToken = await this.jwtService.signAsync({
      id: user.id,
      role: user.role,
    });

    const RefreshToken = await this.jwtService.signAsync(
      {
        id: user.id,
      },
      {
        secret: this.configService.get<string>('REFRESH_JWT_SECRET') as string,
        expiresIn: this.configService.get<string>('REFRESH_EXPIRE_IN') as any,
      },
    );

    const hashRefreshToken = await this.hasher(RefreshToken);

    return {
      access_token: AccessToken,
      refresh_token: RefreshToken,
      hashed_refresh_token: hashRefreshToken,
    };
  }

  public async sendEmail(options: {
    to: string;
    subject: string;
    template: string;
    context: Record<string, any>;
  }) {
    await this.mailerService.sendMail({
      from: '"MicroPC" Support',
      to: options.to,
      subject: options.subject,
      template: options.template,
      context: options.context,
    });
  }

  public async generateLink(
    prefix: string,
  ): Promise<{ Link: string; Token: string }> {
    const randomCode: string =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    return { Link: `${prefix}${randomCode}`, Token: randomCode };
  }
}
