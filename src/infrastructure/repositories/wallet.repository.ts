/* eslint-disable prettier/prettier */
import { Repository, DataSource } from 'typeorm';
import { Wallet } from '../../domain/entities/wallet.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class WalletRepository extends Repository<Wallet> {
  constructor(dataSource: DataSource) {
    super(Wallet, dataSource.createEntityManager());
  }
}