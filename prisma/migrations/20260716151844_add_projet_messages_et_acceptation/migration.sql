-- AlterTable
ALTER TABLE "projets" ADD COLUMN     "statut_acceptation" TEXT NOT NULL DEFAULT 'accepte';

-- CreateTable
CREATE TABLE "projet_messages" (
    "id" SERIAL NOT NULL,
    "projet_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projet_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "projet_messages" ADD CONSTRAINT "projet_messages_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_messages" ADD CONSTRAINT "projet_messages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
