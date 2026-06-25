import {
  Column,
  JoinColumn,
  OneToOne,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('delivery_driver_profiles')
export class DeliveryDriverProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: false, default: false })
  isAvailable: boolean;

  @Column({ nullable: false })
  VehicleType: string;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLatitude: number;

  @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
  currentLongitude: number;

  @Column({ nullable: false })
  VehicleLicenseNumber: number;

  @Column({ default: 0 })
  SuccessfulOrders: number;

  @Column({ default: 0 })
  FailedOrders: number;

  @Column({ default: 0 })
  TotalOrders: number;

  @OneToOne(() => User, (user) => user.deliveryDriverProfile)
  @JoinColumn({
    name: 'user_id',
  })
  user: User;
}
