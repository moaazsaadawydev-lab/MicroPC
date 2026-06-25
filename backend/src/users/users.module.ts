import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { DeliveryDriverProfile } from './entities/delivery-profile.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    CommonModule,
    CloudinaryModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        return {
          secret: config.get<string>('ACCESS_JWT_SECRET'),
          signOptions: {
            expiresIn: config.get<string>('ACCESS_EXPIRE_IN') as any,
          },
        };
      },
    }),
    PassportModule.register({
      defaultStrategy: 'google',
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, GoogleStrategy],
})
export class UsersModule {}
