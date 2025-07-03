/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany } from 'typeorm';
import { Account } from './account.entity';
import { Transaction } from './transaction.entity';
// import { Transaction } from './transaction.entity';

@Entity('wallets')
export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'jsonb' })
  balances: {
    currency: string;
    collection_balance: number;
    payout_balance: number;
    api_balance?: number; // Only for NGN
  }[];

  @OneToOne(() => Account, (account) => account.wallet)
  account: Account;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}