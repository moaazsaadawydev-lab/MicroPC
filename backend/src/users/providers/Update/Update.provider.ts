import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { CommonService } from 'src/common/common.service';
import { UpdateEmailDto } from 'src/users/dto/Update-email.dto';
import { UpdateUserDto } from 'src/users/dto/UpdateUser.dto';
import { User } from 'src/users/entities/user.entity';
import { AccountStatus } from 'src/utils/enums';
import { Repository } from 'typeorm';

@Injectable()
export class UpdateProvider {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
    private readonly commonService: CommonService,
  ) {}

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
}
