/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bank } from '../../../domain/entities/bank.entity';
import { Beneficiary } from '../../../domain/entities/beneficiary.entity';

@Injectable()
export class BankService {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,

      @InjectRepository(Beneficiary)
    private readonly beneficiaryRepo: Repository<Beneficiary>,
  ) {}

  async getBanks() {
    return this.bankRepository.find({
        where: {active: true},
        order: {bank_name: 'ASC'}
    });
  }
}