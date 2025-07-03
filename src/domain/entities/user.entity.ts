/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, JoinTable } from 'typeorm';
import { Account } from './account.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;
  
  @Column({ nullable: true })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({ default: false })
  verified: boolean;

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

  @Column({ nullable: true })
  bizAddress?: string;

  @Column({ nullable: true })
  referral_code?: string;

  @Column({ nullable: true })
  supportEmail?: string;

  @Column({ nullable: true })
  supportPhone?: string;

//   @ManyToMany(() => Account, (account) => account.users)
//   @JoinTable()
//   accounts: Account[];

@ManyToMany(() => Account, (account) => account.users)
@JoinTable({
  name: 'users_accounts',
})
accounts: Account[];

}