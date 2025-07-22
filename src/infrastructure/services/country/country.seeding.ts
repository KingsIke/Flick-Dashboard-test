/* eslint-disable prettier/prettier */
import { DataSource } from 'typeorm';
import { Country } from '../../../domain/entities/country.entity';
import { countrySeedData } from './country.list';
import { AppDataSource } from '../../../config/db/dataSource';

const seedCountries = async () => {
  try {
    const dataSource: DataSource = await AppDataSource.initialize();
    const countryRepo = dataSource.getRepository(Country);

    for (const country of countrySeedData) {
      const exists = await countryRepo.findOne({ where: { iso2: country.iso2 } });
      if (!exists) {
        await countryRepo.save(country);
        console.log(`Inserted ${country.name}`);
      } else {
        console.log(`${country.name} already exists`);
      }
    }

    console.log('Country seeding complete');
    await dataSource.destroy();
  } catch (error) {
    console.error('Error seeding countries:', error);
  }
};

seedCountries();
