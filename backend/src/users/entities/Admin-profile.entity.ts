import { Product } from 'src/products/entities/product.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AdminProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToMany(() => Product, (product) => product.createdBy)
  products: Product[];
}
