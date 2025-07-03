/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('banks')
export class Bank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  logo: string;

  @Column()
  slug: string;

  @Column()
  bank_code: string;

  @Column()
  country: string;

  @Column()
  active: boolean;

  @Column()
  bank_name: string;
}