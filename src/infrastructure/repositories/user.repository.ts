/* eslint-disable prettier/prettier */
import { Repository, DataSource } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class UserRepository extends Repository<User> {
  constructor(dataSource: DataSource) {
    super(User, dataSource.createEntityManager());
  }

  async findByEmail(email: string) {
    return this.findOne({ where: { email }, relations: ['accounts', 'accounts.wallet'] });
  }

  async createUser(data: Partial<User>) {
    const user = this.create(data);
    return this.save(user);
  }

  async updateUser(id: string, updates: Partial<User>) {
    return this.update({ id }, updates);
  }
}
