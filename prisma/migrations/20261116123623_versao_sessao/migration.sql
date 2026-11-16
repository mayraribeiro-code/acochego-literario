-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_contas" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "versao_sessao" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);
INSERT INTO "new_contas" ("ativo", "created_at", "email", "id", "senha_hash", "updated_at") SELECT "ativo", "created_at", "email", "id", "senha_hash", "updated_at" FROM "contas";
DROP TABLE "contas";
ALTER TABLE "new_contas" RENAME TO "contas";
CREATE UNIQUE INDEX "contas_email_key" ON "contas"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
