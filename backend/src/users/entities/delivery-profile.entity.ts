import {
  ChildEntity,
  Column,
  JoinColumn,
  OneToOne,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from 'src/users/entities/user.entity';

@Entity('delivery_driver_profiles')
export class DeliveryDriverProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, default: false })
  isAvailable: boolean;

  @Column()
  VehicleType: string;

  @Column()
  VehicleLicenseNumber: string;

  @Column()
  VehicleLicensePicture: string;

  @Column()
  VehicleLicensePictureExpiresAt: Date;

  @Column()
  VehicleLicensePictureCreatedAt: Date;

  @Column()
  VehicleLicensePictureUpdatedAt: Date;

  @Column()
  SuccessfulOrders: number;

  @Column()
  FailedOrders: number;

  @Column()
  TotalOrders: number;

  @Column()
  CurrentDelivery: string;

  @Column()
  Rating: number;

  @Column()
  RatingCount: number;

  @Column()
  RatingDate: Date;

  @Column()
  RatingCreatedAt: Date;

  @Column()
  RatingUpdatedAt: Date;

  @OneToOne(() => User, (user) => user.deliveryDriverProfile)
  @JoinColumn({
    name: 'user_id',
  })
  user: User;
}
