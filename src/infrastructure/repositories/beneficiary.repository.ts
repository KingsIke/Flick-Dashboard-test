/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOneOptions, Repository } from 'typeorm';
import { Beneficiary } from '../../domain/entities/beneficiary.entity';

// @Injectable()
// export class BeneficiaryRepository {
//   constructor(
//     @InjectRepository(Beneficiary)
//     private readonly repository: Repository<Beneficiary>,
//   ) {}

//   async save(beneficiary: Partial<Beneficiary>): Promise<Beneficiary> {
//     return this.repository.save(beneficiary);
//   }

//   async findByAccountId(accountId: string): Promise<Beneficiary[]> {
//     return this.repository.find({ where: { account_id: accountId } });
//   }
// }
@Injectable()
export class BeneficiaryRepository {
  constructor(
    @InjectRepository(Beneficiary)
    private readonly repository: Repository<Beneficiary>,
  ) {}

  create(data: Partial<Beneficiary>): Beneficiary {
    return this.repository.create(data);
  }

  async save(beneficiary: Partial<Beneficiary>): Promise<Beneficiary> {
    return this.repository.save(beneficiary);
  }

  async findByAccountId(accountId: string): Promise<Beneficiary[]> {
    return this.repository.find({ where: { account_id: accountId } });
  }

    async findOne(options: FindOneOptions<Beneficiary>): Promise<Beneficiary | null> {
    return this.repository.findOne(options);
  }
}
