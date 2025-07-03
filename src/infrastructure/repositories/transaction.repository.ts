/* eslint-disable prettier/prettier */
import { Repository, DataSource } from 'typeorm';
import { Transaction } from '../../domain/entities/transaction.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class TransactionRepository extends Repository<Transaction> {
  constructor(dataSource: DataSource) {
    super(Transaction, dataSource.createEntityManager());
  }
}