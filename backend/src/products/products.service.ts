import { Injectable } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './entities/product.entity';
import { Repository } from 'typeorm';
import { UsersService } from 'src/users/users.service';
import { CommonService } from 'src/common/common.service';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    private readonly UsersService: UsersService,
    private readonly commonService: CommonService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async CreateProduct(
    files: { images: Express.Multer.File[] },
    data: CreateProductDto,
  ) {
    const { name, price, discount, brand, stock, status, category } = data;

    const finalPrice = await this.commonService.calculateProductPrice(
      +price,
      +discount,
    );

    const images = await this.commonService.uploadImages(files.images);

    const product = this.productRepository.create({
      name,
      price,
      discount,
      finalPrice: (await finalPrice).toFixed(2).toString(),
      images,
      category,
      brand,
      stock,
      status,
    });

    return await this.productRepository.save(product);
  }
}
