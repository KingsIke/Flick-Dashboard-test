/* eslint-disable prettier/prettier */
import { Repository, } from 'typeorm';
import { User } from '../../domain/entities/user.entity';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';


@Injectable()

export class UserRepository {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
   const normalizedEmail = email.trim().toLowerCase();
    return this.userRepository.findOne({ where: { email: normalizedEmail }, relations: ['accounts'] });
  }

  async findOne(query: { where: { id: string }; relations?: string[] }): Promise<User | null> {
    return this.userRepository.findOne(query);
  }

  async createUser(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return await this.userRepository.save(user);
  }

  async updateUser(id: string, data: Partial<User>): Promise<void> {
    await this.userRepository.update(id, data);
  }

  async save(user: User): Promise<User> {
    return await this.userRepository.save(user);
  }
}