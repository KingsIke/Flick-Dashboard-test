/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Account } from './account.entity';

@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  beneficiary_id: string;

  @Column()
  account_no: string;

  @Column()
  routing: string;

  @Column()
  dated: Date;

  @Column()
  beneficiary_name: string;

  @Column()
  beneficiary_address_1: string;

  @Column({ nullable: true })
  beneficiary_address_2: string;

  @Column()
  beneficiary_city: string;

  @Column()
  beneficiary_state: string;

  @Column()
  beneficiary_country: string;

  @Column({ nullable: true })
  beneficiary_postal_code: string;

  @Column()
  bank_name: string;

  @Column({ nullable: true })
  bank_address_1: string;

  @Column({ nullable: true })
  bank_address_2: string;

  @Column({ nullable: true })
  bank_city: string;

  @Column({ nullable: true })
  bank_state: string;

  @Column({ nullable: true })
  bank_country: string;

  @Column({ nullable: true })
  bank_postal_code: string;

  @Column({ nullable: true })
  swift_code: string;

  @Column()
  transfer_type: string;

  @Column({ nullable: true })
  recipient_firstname: string;

  @Column({ nullable: true })
  recipient_lastname: string;

  @Column({ type: 'jsonb', nullable: true })
  recipient_kyc: {
    type: string;
    number: string;
    issuedCountryCode: string;
    issuedBy: string;
  };

  @Column({ default: false })
  is_domiciliary: boolean;

  @Column({ default: true })
  is_individual: boolean;

  @ManyToOne(() => Account, (account) => account.beneficiaries)
  account: Account;

  @Column()
  account_id: string;

  
}

