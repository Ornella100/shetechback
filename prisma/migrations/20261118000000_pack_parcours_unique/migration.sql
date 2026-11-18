-- Une date de fin NULL représente désormais l'accès permanent obtenu par achat unique.
ALTER TABLE "abonnements" ALTER COLUMN "date_fin" DROP NOT NULL;
