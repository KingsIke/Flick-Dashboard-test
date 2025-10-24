/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn, OneToMany,JoinColumn, OneToOne  } from 'typeorm';
import { Account } from './account.entity';
import { Transaction } from './transaction.entity';
// import { Transaction } from './transaction.entity';

@Entity('wallets')

export class Wallet {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  account_id: string;

  // @ManyToOne(() => Account, (account) => account.wallet)
  // account: Account;

  // @Column({ type: 'jsonb', default: {} })
  // balances: {
  //   currency: string;
  //   api_balance: number;
  // };
@Column({ type: 'jsonb', nullable: true })
balances: { 
  currency: string; 
  api_balance: number; 
  payout_balance?: number; 
  collection_balance?: number }[];

  // @OneToOne(() => Account, (account) => account.wallet)
  // account: Account;
 @OneToOne(() => Account, (account) => account.wallet)
  @JoinColumn({ name: 'account_id' })
  account: Account;

  @OneToMany(() => Transaction, (transaction) => transaction.wallet)
  transactions: Transaction[];
}