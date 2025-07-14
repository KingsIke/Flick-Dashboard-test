/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity('payment_pages')
export class PaymentPage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
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
  productType: string;

  @Column()
  currency_collected: string;

  @Column()
  currency: string;

  @Column()
  access_code: string;

  @Column()
  status: string;

  @Column()
  source: string;

  @Column()
  isFixedAmount: boolean;

  @Column()
  paymentUrl: string;

  @Column()
  currency_settled: string;

  @Column({ nullable: true })
  successmsg: string | null;

  @Column({ nullable: true })
  customLink: string | null;

  @Column()
  dated: Date;

  @Column()
  amount: string;

  @Column({ nullable: true })
  redirectLink: string | null;

  @Column()
  CustomerCode: string;

  @Column()
  description: string;

  @Column({ nullable: true })
  custompaymentUrl: string | null;

  @ManyToOne(() => Account, (account) => account.paymentPages)
  account: Account;
}