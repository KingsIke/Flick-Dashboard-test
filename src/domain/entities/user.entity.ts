/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable, Index } from 'typeorm';
import { Account } from './account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  @Index()
  email: string;

  @Column()
  password: string;

  @Column({ nullable: true })
  verificationCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  verificationExpiresAt?: Date;

  @Column({ nullable: true })
  resetPasswordCode?: string;

  @Column({ type: 'timestamp', nullable: true })
  resetPasswordExpiresAt?: Date;

  @Column({ default: false })
  isLive: boolean;

  @Column({ default: false })
  isVerified: boolean;

  @Column({ nullable: true })
  avatar?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ nullable: true })
  country?: string;

  // @Column({ nullable: true })
  // bizAddress?: string;

  @Column({ nullable: true })
  referral_code?: string;

  @Column({ nullable: true })
  supportEmail?: string;

  @Column({ nullable: true })
  supportPhone?: string;

  @Column({ nullable: true })
  payoutOtp: string;

  @Column({ type: 'timestamp', nullable: true })
  payoutOtpExpiresAt: Date;

  @Column({ nullable: true })
  pendingPayoutId: string;

@ManyToMany(() => Account, (account) => account.users)
@JoinTable({
  name: 'users_accounts',
})
accounts: Account[];

}