/*
  Warnings:

  - You are about to drop the column `contatoEmergenciaNome` on the `fichas_medicas` table. All the data in the column will be lost.
  - You are about to drop the column `contatoEmergenciaTelefone` on the `fichas_medicas` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "fichas_medicas" DROP COLUMN "contatoEmergenciaNome",
DROP COLUMN "contatoEmergenciaTelefone";
