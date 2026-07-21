import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    CommonModule,
    CloudinaryModule,
    UsersModule,
    TypeOrmModule.forFeature([Product]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('ACCESS_JWT_SECRET'),
        signOptions: {
          expiresIn: config.get<string>('ACCESS_EXPIRE_IN') as any,
        },
      }),
    }),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
