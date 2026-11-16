-- CreateTable
CREATE TABLE "arquivos_digitais" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "livro_id" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "nome_original" TEXT NOT NULL,
    "caminho" TEXT NOT NULL,
    "tamanho_bytes" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "arquivos_digitais_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "arquivos_digitais_caminho_key" ON "arquivos_digitais"("caminho");

-- CreateIndex
CREATE UNIQUE INDEX "arquivos_digitais_livro_id_formato_key" ON "arquivos_digitais"("livro_id", "formato");
