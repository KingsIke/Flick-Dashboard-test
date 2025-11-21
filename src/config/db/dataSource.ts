/* eslint-disable prettier/prettier */
import { DataSource } from "typeorm";
import { config } from 'dotenv';

config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://Flick:Flick12345@postgresql-177046-0.cloudclusters.net:10031/Flick',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  logging: true,
});