/* eslint-disable prettier/prettier */
import { Injectable } from "@nestjs/common";
import { Beneficiary } from "src/domain/entities/beneficiary.entity";
import { DataSource, Repository } from "typeorm";

@Injectable()
export class BeneficiaryRepository extends Repository<Beneficiary> {
  constructor(dataSource: DataSource) {
    super(Beneficiary, dataSource.createEntityManager());
  }
}
