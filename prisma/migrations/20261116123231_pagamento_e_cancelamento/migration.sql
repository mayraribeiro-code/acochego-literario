-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_compras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "livro_id" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'iniciada',
    "transacao_id" TEXT,
    "cartao_final" TEXT,
    "motivo_falha" TEXT,
    "cancelada_em" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "compras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "compras_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_compras" ("created_at", "id", "livro_id", "status", "updated_at", "usuario_id", "valor_centavos") SELECT "created_at", "id", "livro_id", "status", "updated_at", "usuario_id", "valor_centavos" FROM "compras";
DROP TABLE "compras";
ALTER TABLE "new_compras" RENAME TO "compras";
CREATE INDEX "compras_livro_id_idx" ON "compras"("livro_id");
CREATE UNIQUE INDEX "compras_usuario_id_livro_id_key" ON "compras"("usuario_id", "livro_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
