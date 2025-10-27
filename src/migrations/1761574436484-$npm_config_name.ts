import { MigrationInterface, QueryRunner } from "typeorm";

export class  $npmConfigName1761574436484 implements MigrationInterface {
    name = ' $npmConfigName1761574436484'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" ADD COLUMN IF NOT EXISTS "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`ALTER TABLE "accounts" ADD CONSTRAINT "FK_3aa23c0a6d107393e8b40e3e2a6" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "FK_3aa23c0a6d107393e8b40e3e2a6"`);
        await queryRunner.query(`ALTER TABLE "accounts" ALTER COLUMN "userId" SET NOT NULL`);
        
    }

}



