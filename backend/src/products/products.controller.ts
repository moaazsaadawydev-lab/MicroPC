import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { FileInterceptor } from '@nestjs/platform-express';
import { AuthRoleGuard } from 'src/Guards/AuthRole.guard';
import { Roles } from 'src/decorators/UserRoles.decorator';
import { UserRole } from 'src/utils/enums';
import { AuthGuard } from 'src/Guards/Auth.guard';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @UseGuards(AuthGuard, AuthRoleGuard)
  @UseInterceptors(FileInterceptor('image'))
  create(
    @UploadedFiles() files: { image: Express.Multer.File[] },
    @Body() createProductDto: CreateProductDto,
  ) {
    return this.productsService.CreateProduct(files, createProductDto);
  }
}
