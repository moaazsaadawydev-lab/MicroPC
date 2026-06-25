import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { LessThan, Like, Repository } from 'typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CommonService } from 'src/common/common.service';
import { UpdateEmailDto } from './dto/Update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountStatus, UserRole } from 'src/utils/enums';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { Email_Verification_Token_EXPIRE_IN } from 'src/utils/constants';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly commonService: CommonService,
  ) {}

  async Register(createUserDto: CreateUserDto, file?: Express.Multer.File) {
    const { username, email, password } = createUserDto;

    const user = await this.usersRepository.findOne({
      where: { email: email, username: username },
    });

    if (user) {
      throw new NotFoundException('User already exists');
    }

    if (!password) throw new BadRequestException('Password is required');

    const hashedPassword = await this.commonService.hasher(password);

    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const verificationLink = `http://localhost:3000/api/v1/users/verify-email/${verificationToken}`;

    let uploadResult: any = null;
    if (file) uploadResult = await this.cloudinaryService.uploadFile(file);

    const newUser: User = this.usersRepository.create({
      username,
      email,
      password: hashedPassword,
      PhotoUrl: uploadResult?.secure_url || '',
      EmailVerificationToken: verificationToken,
      EmailVerificationLinkExpireIn: new Date(Date.now() + 60 * 60 * 24 * 1000),
      EmailVerificationLinkCreatedAt: new Date(),
    });

    await this.usersRepository.save(newUser);

    this.commonService.sendEmail({
      to: newUser.email,
      subject: 'Welcome to MicroPC',
      template: 'verify-email',
      context: {
        name: newUser.username,
        verificationLink: verificationLink,
      },
    });

    return {
      message: 'User created successfully',
    };
  }

  async validateGoogleUser(googleUser) {
    const { email, firstName, lastName, picture } = googleUser;

    let user = await this.usersRepository.findOne({ where: { email } });
    let tokens;

    if (user) {
      if (user.AccountStatus === AccountStatus.BANNED) {
        throw new ForbiddenException(
          'Your account has been permanently banned.',
        );
      }

      if (user.AccountStatus === AccountStatus.UNVERIFIED) {
        user.AccountStatus = AccountStatus.ACTIVE;
      }

      if (user.AccountStatus === AccountStatus.SUSPENDED) {
        throw new ForbiddenException(
          'Your account has been suspended from accessing our services.',
        );
      }

      tokens = await this.commonService.generateTokens(user);

      user.LastLogin = new Date();
      user.RefreshToken = tokens.hashed_refresh_token;
      user.RefreshTokenExpireIn = new Date(
        Date.now() + 60 * 60 * 24 * 15 * 1000,
      );

      await this.usersRepository.save(user);
    } else {
      const safeFirstName: string = firstName
        ? firstName.toLowerCase()
        : 'user';
      const safeLastName: string = lastName ? `_${lastName.toLowerCase()}` : '';

      const baseUsername: string = `${safeFirstName}${safeLastName}`;

      const newUser: User = this.usersRepository.create({
        email,
        username: baseUsername,
        PhotoUrl: picture,
        AccountStatus: AccountStatus.ACTIVE,
        isEmailVerified: true,
        LastLogin: new Date(),
        isLoggedIn: true,
      });

      const savedUser = await this.usersRepository.save(newUser);

      tokens = await this.commonService.generateTokens(savedUser);

      await this.usersRepository.update(savedUser.id, {
        RefreshToken: tokens.hashed_refresh_token,
        RefreshTokenExpireIn: new Date(Date.now() + 60 * 60 * 24 * 15 * 1000),
      });
    }

    return {
      message: 'Google login successful',
      ...tokens,
    };
  }

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

  async CurrentUser(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      user,
    };
  }

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

  async UpdateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateUserDto.username) {
      const existingUser = await this.usersRepository.findOne({
        where: { username: updateUserDto.username },
      });
      if (existingUser) {
        throw new BadRequestException('Username already exists');
      }
    }

    if (file) {
      if (user.PhotoUrl) {
        await this.cloudinaryService.deleteFile(user.PhotoUrl);
      }

      const photoUrl = await this.cloudinaryService.uploadFile(file);
      await this.usersRepository.update(user.id, {
        PhotoUrl: photoUrl.secure_url,
      });
    }

    await this.usersRepository.update(user.id, {
      username: updateUserDto.username,
    });

    return {
      message: 'User updated successfully',
    };
  }

  async banUser(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.AccountStatus === AccountStatus.BANNED) {
      throw new BadRequestException('User already banned');
    }

    await this.usersRepository.update(user.id, {
      isLoggedIn: false,
      RefreshToken: null,
      RefreshTokenExpireIn: null,
      AccountStatus: AccountStatus.BANNED,
    });

    return {
      message: 'User banned successfully',
    };
  }

  async UpdateEmail(id: string, updateEmailDto: UpdateEmailDto) {
    const user = await this.usersRepository.findOne({
      where: { id: id },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existingUser = await this.usersRepository.findOne({
      where: { email: updateEmailDto.newEmail },
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    const isPasswordMatch = await this.commonService.comparator(
      updateEmailDto.password,
      user.password || '',
    );
    if (!isPasswordMatch) {
      throw new BadRequestException('Invalid Password');
    }

    const verificationToken =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    const verificationLink = `http://localhost:3000/api/v1/users/verify-email/${verificationToken}`;

    await this.usersRepository.update(user.id, {
      isEmailVerified: false,
      isLoggedIn: false,
      RefreshToken: null,
      RefreshTokenExpireIn: null,
      PendingEmail: updateEmailDto.newEmail,
      EmailVerificationToken: verificationToken,
      EmailVerificationLinkExpireIn: new Date(Date.now() + 60 * 60 * 24 * 1000),
      EmailVerificationLinkCreatedAt: new Date(),
    });

    this.commonService.sendEmail({
      to: updateEmailDto.newEmail,
      subject: 'Welcome to MicroPC',
      template: 'verify-email',
      context: {
        name: user.username,
        verificationLink: verificationLink,
      },
    });

    return {
      message: 'Email updated successfully',
    };
  }

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

    if (updatePasswordDto.newPassword !== updatePasswordDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const hashedPassword = await this.commonService.hasher(
      updatePasswordDto.newPassword,
    );

    await this.usersRepository.update(user.id, {
      password: hashedPassword,
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleUserCleanups() {
    this.logger.log('--- Starting Daily Users Maintenance Job ---');

    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const deleteResult = await this.usersRepository.delete({
      isEmailVerified: false,
      EmailVerificationLinkCreatedAt: LessThan(threeDaysAgo),
    });

    if (deleteResult.affected && deleteResult.affected > 0) {
      this.logger.warn(
        `Successfully deleted ${deleteResult.affected} unverified ghost accounts.`,
      );
    }

    const threeMonthsAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

    const updateResult = await this.usersRepository.update(
      {
        isEmailVerified: true,
        AccountStatus: AccountStatus.ACTIVE,
        LastLogin: LessThan(threeMonthsAgo),
      },
      {
        AccountStatus: AccountStatus.SUSPENDED,
        isLoggedIn: false,
        RefreshToken: null,
        RefreshTokenExpireIn: null,
      },
    );

    if (updateResult.affected && updateResult.affected > 0) {
      this.logger.log(
        `Successfully suspended ${updateResult.affected} inactive accounts (No activity for 3+ months).`,
      );
    }

    this.logger.log('--- Users Maintenance Job Finished ---');
  }

  private readonly logger = new Logger(UsersService.name);
}
