import { DeliveryDriverProfile } from './delivery-profile.entity';
import { TIMESTAMP } from 'src/utils/constants';
import { AccountStatus, UserRole } from 'src/utils/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Admin } from 'typeorm/driver/mongodb/typings.js';
import { AdminProfile } from './Admin-profile.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: true, default: null, type: 'varchar', length: 255 })
  password: string | null;

  @Column({
    type: 'enum',
    enum: UserRole,
    nullable: false,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  PendingEmail: string | null;

  @Column({ nullable: false, default: false })
  isLoggedIn: boolean;

  @Column({ nullable: true, type: 'timestamp' })
  LastLogin: Date;

  @Column({ nullable: false, default: false })
  isEmailVerified: boolean;

  @Column({
    type: 'enum',
    enum: AccountStatus,
    nullable: false,
    default: AccountStatus.UNVERIFIED,
  })
  AccountStatus: AccountStatus;

  @Column({ nullable: false, default: false })
  isPasswordChanged: boolean;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  EmailVerificationToken: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  EmailVerificationLinkExpireIn: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  EmailVerificationLinkCreatedAt: Date | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  PhotoUrl: string | null;

  @Column({ nullable: true, type: 'int' })
  PasswordChangingCode: number | null;

  @Column({ nullable: true, type: 'timestamp' })
  PasswordChangingCodeExpireIn: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  PasswordChangingCodeCreatedAt: Date | null;

  @Column({ nullable: true, type: 'boolean' })
  isForgetPasswordCodeVerified: boolean | null;

  @Column({ nullable: true, type: 'varchar', length: 255 })
  RefreshToken: string | null;

  @Column({ nullable: true, type: 'timestamp' })
  RefreshTokenExpireIn: Date | null;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => TIMESTAMP,
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => TIMESTAMP,
  })
  updatedAt: Date;

  @OneToOne(() => DeliveryDriverProfile, (profile) => profile.user, {
    cascade: true,
  })
  deliveryDriverProfile: DeliveryDriverProfile;

  @OneToOne(() => AdminProfile, (profile) => profile.products, {
    cascade: true,
  })
  adminProfile: AdminProfile;
}
