ALTER TABLE "marketplace_commandes"
ADD COLUMN "fedapay_transaction_id" VARCHAR(100);

CREATE INDEX "marketplace_commandes_fedapay_transaction_id_idx"
ON "marketplace_commandes"("fedapay_transaction_id");
