/* eslint-disable prettier/prettier */
import { Repository, } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';


@Injectable()
// export class UserRepository extends Repository<User> {
//   constructor(dataSource: DataSource) {
//     super(User, dataSource.createEntityManager());
//   }

//   async findByEmail(email: string) {
//     return this.findOne({ where: { email }, relations: ['accounts', 'accounts.wallet'] });
//   }

//   async createUser(data: Partial<User>) {
//     const user = this.create(data);
//     return this.save(user);
//   }

//   async updateUser(id: string, updates: Partial<User>) {
//     return this.update({ id }, updates);
//   }
// }


export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email }, relations: ['accounts'] });
  }

  async findOne(query: { where: { id: string }; relations?: string[] }): Promise<User | null> {
    return this.userRepository.findOne(query);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    await this.userRepository.update(id, data);
  }
}