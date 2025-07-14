/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('beneficiaries')
export class Beneficiary {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  beneficiary_id: string;

  @Column()
  bank_name: string;

  @Column()
  account_number: string;

  @Column({ nullable: true })
  sort_code: string;

  @Column()
  currency: string;

  @Column()
  accountId: string;
}