/* eslint-disable prettier/prettier */
import { Repository, DataSource } from 'typeorm';
import { Bank } from '../../domain/entities/bank.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class BankRepository extends Repository<Bank> {
  constructor(dataSource: DataSource) {
    super(Bank, dataSource.createEntityManager());
  }
}