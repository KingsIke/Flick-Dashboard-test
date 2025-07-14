/* eslint-disable prettier/prettier */
import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaymentPage } from '../../domain/entities/payment.entity';

@Injectable()
export class PaymentPageRepository extends Repository<PaymentPage> {
  constructor(
    @InjectRepository(PaymentPage)
    private paymentPageRepository: Repository<PaymentPage>,
  ) {
    super(paymentPageRepository.target, paymentPageRepository.manager, paymentPageRepository.queryRunner);
  }

  async findByAccountId(accountId: string): Promise<PaymentPage[]> {
    return this.find({ where: { account: { id: accountId } } });
  }
}