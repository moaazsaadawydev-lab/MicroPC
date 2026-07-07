import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';
import { PassportModule } from '@nestjs/passport';
import { GoogleStrategy } from './google.strategy';
import { AuthProvider } from './providers/Auth/auth.provider';
import { RegisterAuthProvider } from './providers/Auth/Register.auth.provider';
import { LoggerAuthProvider } from './providers/Auth/Loggers.auth.provider';
import { RefreshAuthProvider } from './providers/Auth/refresh.auth.provider';
import { VerifyingAuthProvider } from './providers/Auth/Verifying.auth.provider';
import { UpdatePasswordProvider } from './providers/Update/UpdatePassword.provider';
import { UpdateProvider } from './providers/Update/Update.provider';
import { GetterProvider } from './providers/Get/Getter.provider';
import { AuthController } from './Controllers/auth.controller';

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
  controllers: [UsersController, AuthController],
  providers: [
    UsersService,
    GoogleStrategy,
    AuthProvider,
    RegisterAuthProvider,
    LoggerAuthProvider,
    VerifyingAuthProvider,
    RefreshAuthProvider,
    GetterProvider,
    UpdateProvider,
    UpdatePasswordProvider,
  ],
})
export class UsersModule {}
