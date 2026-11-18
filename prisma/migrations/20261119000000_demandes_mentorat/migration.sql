CREATE TABLE "demandes_mentorat" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "mentor_id" INTEGER,
    "statut" VARCHAR(30) NOT NULL DEFAULT 'en_attente',
    "message_suivi" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "demandes_mentorat_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "demandes_mentorat_user_id_parcours_id_key"
ON "demandes_mentorat"("user_id", "parcours_id");

CREATE INDEX "demandes_mentorat_mentor_id_statut_idx"
ON "demandes_mentorat"("mentor_id", "statut");

CREATE INDEX "demandes_mentorat_statut_created_at_idx"
ON "demandes_mentorat"("statut", "created_at");

ALTER TABLE "demandes_mentorat"
ADD CONSTRAINT "demandes_mentorat_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "demandes_mentorat"
ADD CONSTRAINT "demandes_mentorat_parcours_id_fkey"
FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "demandes_mentorat"
ADD CONSTRAINT "demandes_mentorat_mentor_id_fkey"
FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
