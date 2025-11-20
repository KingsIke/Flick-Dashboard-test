import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1763567603723 implements MigrationInterface {
    name = 'Migrations1763567603723'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "url" character varying`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "exchange_rate" numeric`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "settled_amount" numeric`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "amountPayable" numeric`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "payableAmountString" character varying`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "payableFxAmountString" character varying`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "rate" numeric`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "pageName" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "status" SET DEFAULT 'active'`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "source" SET DEFAULT 'api'`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "isFixedAmount" SET DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "dated" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "amount" numeric`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "description" text`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "productType"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "productType" jsonb`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "productType"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "productType" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "description"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "description" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "amount"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "amount" character varying`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "dated" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "isFixedAmount" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "source" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ALTER COLUMN "pageName" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "rate"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "payableFxAmountString"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "payableAmountString"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "amountPayable"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "settled_amount"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "exchange_rate"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "url"`);
    }

}
