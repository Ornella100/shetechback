-- AlterTable
ALTER TABLE "livrables" ADD COLUMN     "lien" VARCHAR(500),
ALTER COLUMN "nom_fichier" DROP NOT NULL,
ALTER COLUMN "chemin_fichier" DROP NOT NULL,
ALTER COLUMN "type_fichier" DROP NOT NULL,
ALTER COLUMN "taille_fichier" DROP NOT NULL;

-- CreateTable
CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "expediteur_id" INTEGER NOT NULL,
    "destinataire_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "lu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "messages_expediteur_id_destinataire_id_idx" ON "messages"("expediteur_id", "destinataire_id");

-- CreateIndex
CREATE INDEX "messages_destinataire_id_expediteur_id_idx" ON "messages"("destinataire_id", "expediteur_id");

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_expediteur_id_fkey" FOREIGN KEY ("expediteur_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_destinataire_id_fkey" FOREIGN KEY ("destinataire_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
