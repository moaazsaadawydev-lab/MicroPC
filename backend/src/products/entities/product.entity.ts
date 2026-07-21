import { User } from 'src/users/entities/user.entity';
import { TIMESTAMP } from 'src/utils/constants';
import { ProductStatus, ProductType } from 'src/utils/enums';
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

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
  finalPrice: string;

  @Column('text', { array: true })
  images: string[];

  @Column({
    type: 'enum',
    enum: ProductType,
  })
  category: ProductType;

  @Column()
  brand: string;

  @Column()
  stock: number;

  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.ACTIVE,
  })
  status: ProductStatus;

  @Column({ type: 'timestamp', default: () => TIMESTAMP })
  createdAt: Date;

  @Column({ type: 'timestamp', default: () => TIMESTAMP, onUpdate: TIMESTAMP })
  updatedAt: Date;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'updated_by' })
  updatedBy: User;
}
