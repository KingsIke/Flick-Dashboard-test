/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Country } from '../../domain/entities/country.entity';

@Injectable()
export class CountryRepository {
  constructor(
    @InjectRepository(Country)
    private readonly repository: Repository<Country>,
  ) {}

  async findAll(): Promise<Country[]> {
    return this.repository.find();
  }
}


