-- AlterTable
ALTER TABLE "compras" ADD COLUMN "expira_em" DATETIME;
ALTER TABLE "compras" ADD COLUMN "metodo" TEXT;
ALTER TABLE "compras" ADD COLUMN "pix_copia_e_cola" TEXT;

-- AlterTable
ALTER TABLE "livros" ADD COLUMN "capa_arquivo" TEXT;
