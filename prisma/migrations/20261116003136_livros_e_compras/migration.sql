-- CreateTable
CREATE TABLE "autores" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "generos" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "livros" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "sinopse" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "preco_centavos" INTEGER NOT NULL,
    "formato" TEXT NOT NULL,
    "disponivel" BOOLEAN NOT NULL DEFAULT true,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "capa_cor_inicio" TEXT NOT NULL,
    "capa_cor_fim" TEXT NOT NULL,
    "capa_cor_texto" TEXT NOT NULL,
    "avaliacao" REAL NOT NULL DEFAULT 0,
    "total_avaliacoes" INTEGER NOT NULL DEFAULT 0,
    "autor_id" TEXT NOT NULL,
    "genero_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "livros_autor_id_fkey" FOREIGN KEY ("autor_id") REFERENCES "autores" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "livros_genero_id_fkey" FOREIGN KEY ("genero_id") REFERENCES "generos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "compras" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario_id" TEXT NOT NULL,
    "livro_id" TEXT NOT NULL,
    "valor_centavos" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmada',
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "compras_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "compras_livro_id_fkey" FOREIGN KEY ("livro_id") REFERENCES "livros" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "autores_nome_key" ON "autores"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "generos_nome_key" ON "generos"("nome");

-- CreateIndex
CREATE INDEX "livros_autor_id_idx" ON "livros"("autor_id");

-- CreateIndex
CREATE INDEX "livros_genero_id_idx" ON "livros"("genero_id");

-- CreateIndex
CREATE INDEX "compras_livro_id_idx" ON "compras"("livro_id");

-- CreateIndex
CREATE UNIQUE INDEX "compras_usuario_id_livro_id_key" ON "compras"("usuario_id", "livro_id");
