/* eslint-disable prettier/prettier */


import { DataSource } from 'typeorm';
import { Bank } from '../../../domain/entities/bank.entity'; 
import { bankSeedData } from './bank.list';
import { AppDataSource } from '../../../config/db/dataSource';

const seedBanks = async () => {
  try {
    const dataSource: DataSource = await AppDataSource.initialize();
    const bankRepo = dataSource.getRepository(Bank);

    for (const bank of bankSeedData) {
      const exists = await bankRepo.findOne({ where: { bank_code: bank.bank_code } });
      if (!exists) {
        await bankRepo.save(bank);
        console.log(`Inserted ${bank.bank_name}`);
      } else {
        console.log(`${bank.bank_name} already exists`);
      }
    }

    console.log('Bank seeding complete');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding banks:', error);
  }
};

seedBanks();
