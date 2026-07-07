import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CommonService } from 'src/common/common.service';
import { User } from 'src/users/entities/user.entity';
import { Email_Verification_Token_EXPIRE_IN } from 'src/utils/constants';
import { AccountStatus } from 'src/utils/enums';
import { Repository } from 'typeorm';

@Injectable()
export class VerifyingAuthProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly commonService: CommonService,
  ) {}

  async verifyEmail(token: string) {
    const user = await this.usersRepository.findOne({
      where: { EmailVerificationToken: token },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (
      user.EmailVerificationLinkExpireIn &&
      user.EmailVerificationLinkExpireIn.getTime() < new Date().getTime()
    ) {
      throw new BadRequestException('Verification link has expired');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('User already verified');
    }

    await this.usersRepository.update(user.id, {
      isEmailVerified: true,
      AccountStatus: AccountStatus.ACTIVE,
      EmailVerificationToken: null,
      EmailVerificationLinkExpireIn: null,
      EmailVerificationLinkCreatedAt: null,
      email: user.PendingEmail ? user.PendingEmail : user.email,
      PendingEmail: null,
    });

    return {
      message: 'Email verified successfully',
    };
  }

  async resendVerificationLink(email: string) {
    const user = await this.usersRepository.findOne({
      where: { email: email },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.isEmailVerified) {
      throw new BadRequestException('User already verified');
    }

    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);

    const verificationLink = `http://localhost:3000/api/v1/users/verify-email/${verificationToken}`;

    this.commonService.sendEmail({
      to: user.email,
      subject: 'Welcome to MicroPC',
      template: 'verify-email',
      context: {
        name: user.username,
        verificationLink: verificationLink,
      },
    });

    await this.usersRepository.update(user.id, {
      EmailVerificationToken: verificationToken,
      EmailVerificationLinkExpireIn: Email_Verification_Token_EXPIRE_IN,
      EmailVerificationLinkCreatedAt: new Date(),
    });

    return {
      message: 'Email verification link sent successfully',
    };
  }
}
