-- CreateTable
CREATE TABLE "progressos_leitura" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "livro_id" TEXT NOT NULL,
    "formato" TEXT NOT NULL,
    "posicao" TEXT NOT NULL,
    "percentual" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "progressos_leitura_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "progressos_leitura_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "progressos_leitura_livro_id_idx" ON "progressos_leitura"("livro_id");

-- CreateIndex
CREATE UNIQUE INDEX "progressos_leitura_usuario_id_livro_id_formato_key" ON "progressos_leitura"("usuario_id", "livro_id", "formato");
