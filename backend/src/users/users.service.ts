import { Injectable, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { LessThan, Repository } from 'typeorm';
import { UpdateEmailDto } from './dto/Update-email.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccountStatus } from 'src/utils/enums';
import { UpdateUserDto } from './dto/UpdateUser.dto';
import { AuthProvider } from './providers/Auth/auth.provider';
import { RegisterAuthProvider } from './providers/Auth/Register.auth.provider';
import { LoggerAuthProvider } from './providers/Auth/Loggers.auth.provider';
import { VerifyingAuthProvider } from './providers/Auth/Verifying.auth.provider';
import { RefreshAuthProvider } from './providers/Auth/refresh.auth.provider';
import { GetterProvider } from './providers/Get/Getter.provider';
import { UpdateProvider } from './providers/Update/Update.provider';
import { UpdatePasswordProvider } from './providers/Update/UpdatePassword.provider';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly authProvider: AuthProvider,
    private readonly registerAuthProvider: RegisterAuthProvider,
    private readonly loggerAuthProvider: LoggerAuthProvider,
    private readonly verifyingAuthProvider: VerifyingAuthProvider,
    private readonly refreshAuthProvider: RefreshAuthProvider,
    private readonly getterProvider: GetterProvider,
    private readonly updateProvider: UpdateProvider,
    private readonly updatePasswordProvider: UpdatePasswordProvider,
  ) {}

  async Register(createUserDto: CreateUserDto, file?: Express.Multer.File) {
    return this.registerAuthProvider.Register(createUserDto, file);
  }

  async validateGoogleUser(googleUser) {
    return this.registerAuthProvider.validateGoogleUser(googleUser);
  }

  async verifyEmail(token: string) {
    return this.verifyingAuthProvider.verifyEmail(token);
  }

  async Login(email: string, password: string) {
    return this.loggerAuthProvider.Login(email, password);
  }

  async validateSession(userId: string) {
    return this.authProvider.validateSession(userId);
  }

  async resendVerificationLink(email: string) {
    return this.verifyingAuthProvider.resendVerificationLink(email);
  }

  async Logout(id: string) {
    return this.loggerAuthProvider.Logout(id);
  }

  async CurrentUser(id: string) {
    return this.getterProvider.CurrentUser(id);
  }

  async GetAllUsers() {
    return this.getterProvider.GetAllUsers();
  }

  async updateRefreshToken(userId: string, refreshToken: string) {
    return this.refreshAuthProvider.updateRefreshToken(userId, refreshToken);
  }

  async refreshSession(userId: string, refreshToken: string) {
    return this.refreshAuthProvider.refreshSession(userId, refreshToken);
  }

  async UpdateUser(
    id: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    return this.updateProvider.UpdateUser(id, updateUserDto, file);
  }

  async banUser(id: string) {
    return this.updateProvider.banUser(id);
  }

  async UpdateEmail(id: string, updateEmailDto: UpdateEmailDto) {
    return this.updateProvider.UpdateEmail(id, updateEmailDto);
  }

  async UpdatePassword(id: string, updatePasswordDto: UpdatePasswordDto) {
    return this.updatePasswordProvider.UpdatePassword(id, updatePasswordDto);
  }

  async SendForgetPasswordCode(email: string) {
    return this.updatePasswordProvider.SendForgetPasswordCode(email);
  }

  async VerifyForgetPasswordCode(email: string, code: number) {
    return this.updatePasswordProvider.VerifyForgetPasswordCode(email, code);
  }

  async ResetPassword(email: string, resetPasswordDto: ResetPasswordDto) {
    return this.updatePasswordProvider.ResetPassword(email, resetPasswordDto);
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
