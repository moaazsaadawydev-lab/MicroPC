import { DeliveryDriverProfile } from './delivery-profile.entity';
import { TIMESTAMP } from 'src/utils/constants';
import { UserRole } from 'src/utils/enums';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: false, unique: true })
  username: string;

  @Column({ nullable: false, unique: true })
  email: string;

  @Column({ nullable: false })
  password: string;

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

  @Column({ nullable: false, default: false })
  isEmailVerified: boolean;

  @Column({ nullable: false, default: false })
  isAccountBanned: boolean;

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
}
