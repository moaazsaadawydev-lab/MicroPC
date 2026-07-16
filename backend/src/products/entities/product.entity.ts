import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  description: string;

  @Column()
  price: number;

  @Column({ nullable: true })
  discount: number;

  @Column()
  finalPrice: number;

  @Column('text', { array: true })
  images: string[];

  @Column()
  category: string;

  @Column()
  brand: string;

  @Column()
  stock: number;

  @Column()
  rating: number;

  @Column()
  numReviews: number;

  @Column()
  createdAt: Date;

  @Column()
  updatedAt: Date;
}
