/* eslint-disable prettier/prettier */
import { Repository } from 'typeorm';
import { Bank } from '../../domain/entities/bank.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Beneficiary } from '../../domain/entities/beneficiary.entity';

@Injectable()
export class BankRepository {
  constructor(
    @InjectRepository(Bank)
    private readonly bankRepository: Repository<Bank>,
    @InjectRepository(Beneficiary)
    private readonly beneficiaryRepository: Repository<Beneficiary>,
  ) {}

  async findOne(query: { where: { bank_code: string; bank_name?: string } | { id: string } }): Promise<Bank | Beneficiary | null> {
    if ('bank_code' in query.where) {
      return this.bankRepository.findOne(query);
    }
    return this.beneficiaryRepository.findOne(query);
  }

  async saveBeneficiary(data: Partial<Beneficiary>): Promise<Beneficiary> {
    const beneficiary = this.beneficiaryRepository.create(data);
    return this.beneficiaryRepository.save(beneficiary);
  }
}