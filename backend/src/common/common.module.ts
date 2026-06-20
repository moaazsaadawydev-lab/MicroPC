import { Global, Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
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
  ],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
