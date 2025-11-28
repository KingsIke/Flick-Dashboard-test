import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1764344200077 implements MigrationInterface {
    name = 'Migrations1764344200077'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "FK_b280f1f137807763a73d6d3dee1"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "paymentPageAccessCode"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT "UQ_b280f1f137807763a73d6d3dee1"`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP COLUMN "wallet_id"`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "balance_before" TYPE numeric(30,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "balance_after" TYPE numeric(30,2)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "balance_after" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "balance_before" TYPE numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD "wallet_id" uuid`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "UQ_b280f1f137807763a73d6d3dee1" UNIQUE ("wallet_id")`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "paymentPageAccessCode" character varying`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_b280f1f137807763a73d6d3dee1" FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
