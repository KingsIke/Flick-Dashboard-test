/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn, OneToOne, } from 'typeorm';
import { User } from './user.entity';
import { Wallet } from './wallet.entity';
import { PaymentPage } from './payment.entity';
import { Beneficiary } from './beneficiary.entity';

@Entity('accounts')
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  business_name: string;

  @Column({ nullable: true })
  businessId?: string;

  @Column({ nullable: true })
  business_type: string;

  @Column({ nullable: true })
  bizAddress?: string;

  @Column({ nullable: true })
  business_website?: string;

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

  @Column({ type: 'text', array: true, nullable: true })
  currencies: string[];

  @Column({ nullable: true })
  merchantCode?: string;

  @Column({ nullable: true })
  superMerchantCode?: string;

  @Column({ nullable: true })
  webhook_url?: string;

  @Column({ type: 'jsonb', nullable: true })
  settlementType?: {
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

  @Column({ default: false })
  isLive: boolean;

  @Column({ type: 'jsonb', nullable: true })
  FPR?: {
    merchant: boolean;
    customer: boolean;
  };

  @Column({ type: 'jsonb', nullable: true })
  YPEM?: {
    bankAccount: boolean;
    payoutBalance: boolean;
  };

  @Column()
  country: string;

  @Column()
  currency: string;

  @Column()
  account_no: string;

  @Column()
  account_name: string;

  @Column()
  bank_name: string;

  @Column({ nullable: true })
  bank_code?: string;

  @Column({ nullable: true })
  bank_address?: string;

  @Column({ nullable: true })
  swift_code?: string;

  @Column({ nullable: true })
  sort_code?: string;

  @Column({ nullable: true })
  routing_number?: string;

  @Column({ nullable: true })
  iban?: string;

  @Column({ default: false })
  is_domiciliary: boolean;

  @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dated: Date;

   @OneToOne(() => Wallet, (wallet) => wallet.account)
  wallet: Wallet;

  @OneToMany(() => PaymentPage, (paymentPage) => paymentPage.account)
  paymentPages: PaymentPage[];

  @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.account)
  beneficiaries: Beneficiary[];
}



// /* eslint-disable prettier/prettier */
// import { Entity, Column, PrimaryGeneratedColumn, ManyToMany, OneToOne, OneToMany, JoinTable, ManyToOne, JoinColumn } from 'typeorm';
// import { User } from './user.entity';
// import { Wallet } from './wallet.entity';
// import { PaymentPage } from './payment.entity';
// import { Beneficiary } from './beneficiary.entity';


// @Entity('accounts')
// export class Account {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column()
//   business_name: string;

//   @Column({ nullable: true })
//   businessId?: string;

//   @Column({ nullable: true }) 
//   business_type: string;

//   @Column({ nullable: true })
//   bizAddress?: string;

//   @Column({ nullable: true })
//   business_website?: string;

//   @Column({ type: 'jsonb', nullable: true })
//   checkout_settings: {
//     customization: {
//       primaryColor: string;
//       brandName: string;
//       showLogo: boolean;
//       showBrandName: boolean;
//       secondaryColor: string;
//     };
//     card: boolean;
//     bank_transfer: boolean;
//   };

//   @Column({ type: 'text', array: true, nullable: true })
//   currencies: string[];

//   @Column({ nullable: true })
//   merchantCode?: string;

//   @Column({ nullable: true })
//   superMerchantCode?: string;

//   @Column({ nullable: true })
//   webhook_url?: string;

//   @Column({ type: 'jsonb', nullable: true })
//   settlementType?: {
//     settledType: string;
//     fee: string;
//   };

//   @Column({ default: false })
//   isVulaUser: boolean;

//   @Column({ default: false })
//   is_identity_only: boolean;

//   @Column({ default: true })
//   is_regular: boolean;

//   @Column({ default: false })
//   is_otc: boolean;

//   @Column({ default: false })
//   is_portco: boolean;

//   @Column({ default: false })
//   is_tx: boolean;

//   @Column({ default: false })
//   is_vc: boolean;

//   @Column({ default: false })
//   isLive: boolean;

//   @Column({ type: 'jsonb', nullable: true })
//   FPR?: {
//     merchant: boolean;
//     customer: boolean;
//   };

//   @Column({ type: 'jsonb', nullable: true })
//   YPEM?: {
//     bankAccount: boolean;
//     payoutBalance: boolean;
//   };

//   @Column()
//   country: string;

//   @Column()
//   currency: string;

//   @Column()
//   account_no: string;

//   @Column()
//   account_name: string;

//   @Column()
//   bank_name: string;

//   @Column({ nullable: true })
//   bank_code?: string;

//   @Column({ nullable: true })
//   bank_address?: string;

//   @Column({ nullable: true })
//   swift_code?: string;

//   @Column({ nullable: true })
//   sort_code?: string;

//   @Column({ nullable: true })
//   routing_number?: string;

//   @Column({ nullable: true })
//   iban?: string;

//   @Column({ default: false })
//   is_domiciliary: boolean;

//   @OneToOne(() => Wallet, (wallet) => wallet.account)
//   wallet: Wallet;

//   // 🔹 Each account belongs to one user
//   @ManyToOne(() => User, (user) => user.accounts, { onDelete: 'CASCADE' })
//   @JoinColumn({ name: 'userId' })
//   user: User;

//   @Column()
//   userId: string;

//   @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
//   dated: Date;

//   @OneToMany(() => PaymentPage, (paymentPage) => paymentPage.account)
//   paymentPages: PaymentPage[];

//   @OneToMany(() => Beneficiary, (beneficiary) => beneficiary.account)
//   beneficiaries: Beneficiary[];
// }