import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CommonService } from 'src/common/common.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { User } from 'src/users/entities/user.entity';
import { AccountStatus } from 'src/utils/enums';
import { Repository } from 'typeorm';

@Injectable()
export class RegisterAuthProvider {
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

    const verification = await this.commonService.generateLink(
      `http://localhost:3000/api/v1/users/verify-email/`,
    );

    let uploadResult: any = null;
    if (file) uploadResult = await this.cloudinaryService.uploadFile(file);

    const newUser: User = this.usersRepository.create({
      username,
      email,
      password: hashedPassword,
      PhotoUrl: uploadResult?.secure_url || '',
      EmailVerificationToken: verification.Token,
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
        verificationLink: verification.Link,
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
}
