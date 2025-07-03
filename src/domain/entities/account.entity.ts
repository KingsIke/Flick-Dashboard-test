/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Wallet } from './wallet.entity';


@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  businessId: number;

  @Column()
  business_name: string;

  @Column()
  business_type: string;

  @Column({ type: 'jsonb', nullable: true })
  checkout_settings: {
    customization: {
      primaryColor: string;
      brandName: string;
      showLogo: boolean;
      showBrandName: boolean;
      secondaryColor: string;
    };
    card: boolean;
    bank_transfer: boolean;
  };

  @Column({ nullable: true })
  merchantCode?: string;

  @Column({ nullable: true })
  webhook_url?: string;

  @Column({ type: 'jsonb', nullable: true })
  settlementType: {
    settledType: string;
    fee: string;
  };

  @Column({ default: false })
  isVulaUser: boolean;

  @Column({ default: false })
  is_identity_only: boolean;

  @Column({ default: true })
  is_regular: boolean;

  @Column({ default: false })
  is_otc: boolean;

  @Column({ default: false })
  is_portco: boolean;

  @Column({ default: false })
  is_tx: boolean;

  @Column({ default: false })
  is_vc: boolean;

  @Column({ type: 'jsonb', nullable: true })
  FPR: {
    merchant: boolean;
    customer: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  YPEM: {
    bankAccount: boolean;
    payoutBalance: boolean;
  };

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dated: Date;

  @ManyToMany(() => User, (user) => user.accounts)
  users: User[];

  @OneToOne(() => Wallet, (wallet) => wallet.account, { cascade: true })
  @JoinColumn()
  wallet: Wallet;
}