import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations1764077173451 implements MigrationInterface {
    name = 'Migrations1764077173451'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "otp" character varying`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "otpExpiresAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "otpAttempts" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "otpVerifiedAt" TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "payment_pages" ADD "isOtpLocked" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "isOtpLocked"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "otpVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "otpAttempts"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "otpExpiresAt"`);
        await queryRunner.query(`ALTER TABLE "payment_pages" DROP COLUMN "otp"`);
    }

}
