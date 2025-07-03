/* eslint-disable prettier/prettier */
import { Repository, DataSource } from 'typeorm';
import { Account } from '../../domain/entities/account.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AccountRepository extends Repository<Account> {
  constructor(dataSource: DataSource) {
    super(Account, dataSource.createEntityManager());
  }

  async findByBusinessId(businessId: number) {
    return this.findOne({ where: { businessId }, relations: ['wallet'] });
  }
}