import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CommonService } from 'src/common/common.service';
import { UpdateEmailDto } from './dto/Update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

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

    if (user.PendingEmail) {
      user.email = user.PendingEmail;
      user.PendingEmail = null;
    }

    user.isEmailVerified = true;
    user.EmailVerificationToken = null;
    user.EmailVerificationLinkExpireIn = null;
    user.EmailVerificationLinkCreatedAt = null;

    await this.usersRepository.save(user);

    return {
      user: user,
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

    if (!user.isEmailVerified) {
      throw new BadRequestException('User not verified');
    }

    const isMatch = await this.commonService.comparator(
      password,
      user.password,
    );
    if (!isMatch) {
      throw new BadRequestException('Invalid credentials');
    }

    const tokens = await this.commonService.generateTokens(user);

    await this.usersRepository.update(user.id, {
      RefreshToken: tokens.hashed_refresh_token,
      RefreshTokenExpireIn: new Date(Date.now() + 60 * 60 * 24 * 15 * 1000),
      isLoggedIn: true,
    });

    return tokens;
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

    return user;
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
      user.password,
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
      user.password,
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

    const newUser = await this.usersRepository.update(user.id, {
      password: hashedPassword,
      isForgetPasswordCodeVerified: false,
    });

    return {
      message: 'Password reset successfully',
      newUser,
    };
  }
}
