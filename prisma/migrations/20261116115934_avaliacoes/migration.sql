-- CreateTable
CREATE TABLE "avaliacoes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "livro_id" TEXT NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "avaliacoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "avaliacoes_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "avaliacoes_livro_id_idx" ON "avaliacoes"("livro_id");

-- CreateIndex
CREATE UNIQUE INDEX "avaliacoes_usuario_id_livro_id_key" ON "avaliacoes"("usuario_id", "livro_id");

-- As notas que vinham do seed eram fictícias: a partir de agora a média e o
-- total saem só das avaliações reais.
UPDATE "livros" SET "avaliacao" = 0, "total_avaliacoes" = 0;
