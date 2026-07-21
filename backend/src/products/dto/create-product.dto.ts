import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ProductStatus, ProductType } from 'src/utils/enums';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(ProductType)
  @IsNotEmpty()
  category: ProductType;

  @IsString()
  @IsNotEmpty()
  brand: string;

  @IsNumber()
  @IsNotEmpty()
  stock: number;

  @IsNumber()
  @IsNotEmpty()
  price: number;

  @IsNumber()
  @IsNotEmpty()
  discount: number;

  @IsEnum(ProductStatus)
  @IsNotEmpty()
  status: ProductStatus;
}
