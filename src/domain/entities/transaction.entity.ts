/* eslint-disable prettier/prettier */
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Wallet } from './wallet.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  eventname: string;

  @Column()
  transtype: 'credit' | 'debit';

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  settled_amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  fee_charged: number;

  @Column()
  currency_settled: string;

  @Column({ type: 'timestamp' })
  dated: Date;

  @Column()
  status: string;

  @Column({ nullable: true })
  initiator?: string;

  @Column()
  type: 'Inflow' | 'Outflow'| 'Pending' | 'CardPending';

  @Column()
  transactionid: string;

  @Column()
  narration: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_before: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  balance_after: number;

  @Column({ nullable: true })
  channel?: string;

  @Column({ nullable: true })
  beneficiary_bank?: string;

  @Column({ nullable: true })
  email?: string;

 @ManyToOne(() => Wallet, (wallet) => wallet.transactions)
  @JoinColumn({ name: 'wallet_id' }) // ✅ FIX: use correct column
  wallet: Wallet;
}
