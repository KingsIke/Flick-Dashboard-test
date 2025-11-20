/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity('payment_pages')
export class PaymentPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  pageName: string;

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

  @Column()
  currency_collected: string;

  @Column()
  currency: string;

  @Column({ name: 'access_code' })
  access_code: string; 

  @Column({ default: 'active' })
  status: string;

  @Column({ nullable: true })
  url: string;

  @Column('decimal', { nullable: true })
  exchange_rate: number;

  @Column('decimal', { nullable: true })
  settled_amount: number;

  @Column('decimal', { nullable: true })
  amountPayable: number;

  @Column({ nullable: true })
  payableAmountString: string;

  @Column({ nullable: true })
  payableFxAmountString: string;

  @Column('decimal', { nullable: true })
  rate: number;

  @Column({ default: 'api' })
  source: string;

  @Column({ default: true })
  isFixedAmount: boolean;

  @Column()
  paymentUrl: string;

  @Column()
  currency_settled: string;

  @Column({ nullable: true })
  successmsg: string;

  @Column({ nullable: true })
  customLink: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dated: Date;

  @Column('decimal', { nullable: true })
  amount: number; 

  @Column({ nullable: true })
  redirectLink: string;

  @Column()
  CustomerCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ nullable: true })
  custompaymentUrl: string;

    @Column({ type: 'jsonb', nullable: true })
  productType: string[];

  @ManyToOne(() => Account, (account) => account.paymentPages)
  account: Account;
}