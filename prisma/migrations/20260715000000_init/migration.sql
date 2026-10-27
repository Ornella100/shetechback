-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "nom" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mot_de_passe" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'apprenante',
    "niveau" TEXT DEFAULT 'débutante',
    "bio" VARCHAR(500),
    "avatar" TEXT,
    "telephone" VARCHAR(30),
    "formation_principale" VARCHAR(100),
    "trial_ends_at" TIMESTAMP(3),
    "date_creation" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcours" (
    "id" SERIAL NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "image_url" VARCHAR(500),
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formations" (
    "id" SERIAL NOT NULL,
    "parcours_id" INTEGER,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "niveau" TEXT NOT NULL,
    "prix" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "domaine" TEXT NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "formations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modules" (
    "id" SERIAL NOT NULL,
    "formation_id" INTEGER NOT NULL,
    "numero" INTEGER,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "duree" INTEGER NOT NULL DEFAULT 0,
    "heures_par_semaine" INTEGER NOT NULL DEFAULT 0,
    "langages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "competences" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "livrables" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "couleur" TEXT NOT NULL DEFAULT '#C45C7A',
    "icone" TEXT NOT NULL DEFAULT '📚',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours" (
    "id" SERIAL NOT NULL,
    "module_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lecons" (
    "id" SERIAL NOT NULL,
    "cours_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'pratique',
    "ordre" INTEGER NOT NULL DEFAULT 1,
    "duree_minutes" INTEGER NOT NULL DEFAULT 0,
    "contenu_texte" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lecons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" SERIAL NOT NULL,
    "lecon_id" INTEGER NOT NULL,
    "titre" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'embed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audios" (
    "id" SERIAL NOT NULL,
    "lecon_id" INTEGER NOT NULL,
    "titre" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'embed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pieces_jointes" (
    "id" SERIAL NOT NULL,
    "lecon_id" INTEGER NOT NULL,
    "nom" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'upload',
    "type" TEXT NOT NULL DEFAULT 'autre',
    "taille" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pieces_jointes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours_quizzes" (
    "id" SERIAL NOT NULL,
    "cours_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cours_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours_quiz_questions" (
    "id" SERIAL NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "reponse" INTEGER NOT NULL,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "cours_quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cours_quiz_resultats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "quiz_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cours_quiz_resultats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "progression_lecons" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "lecon_id" INTEGER NOT NULL,
    "completee" BOOLEAN NOT NULL DEFAULT false,
    "date_completee" TIMESTAMP(3),
    "temps_passe_minutes" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "progression_lecons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_quizzes" (
    "id" SERIAL NOT NULL,
    "formation_id" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "reponse" INTEGER NOT NULL,
    "explication" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "formation_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formation_quiz_resultats" (
    "user_id" INTEGER NOT NULL,
    "formation_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "progression_formations" (
    "user_id" INTEGER NOT NULL,
    "formation_id" INTEGER NOT NULL,
    "pourcentage" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "projets_briefs" (
    "id" SERIAL NOT NULL,
    "formation_id" INTEGER,
    "titre" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "consignes" TEXT,
    "livrables" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projets_briefs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "brief_id" INTEGER,
    "mentor_id" INTEGER,
    "titre" TEXT NOT NULL DEFAULT 'Mon projet',
    "description" TEXT NOT NULL,
    "origine" TEXT NOT NULL DEFAULT 'proposition',
    "statut" TEXT NOT NULL DEFAULT 'en_cours',
    "statut_evaluation" TEXT NOT NULL DEFAULT 'en_attente',
    "commentaire_mentor" TEXT,
    "note" INTEGER,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "domaine" VARCHAR(100),
    "technologies" JSONB,
    "lien_github" VARCHAR(255),
    "lien_demo" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet_commentaires" (
    "id" SERIAL NOT NULL,
    "projet_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "note" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projet_commentaires_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projet_likes" (
    "id" SERIAL NOT NULL,
    "projet_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projet_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "livrables" (
    "id" SERIAL NOT NULL,
    "projet_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "nom_fichier" TEXT NOT NULL,
    "chemin_fichier" TEXT NOT NULL,
    "type_fichier" VARCHAR(100) NOT NULL,
    "taille_fichier" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "livrables_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions_mentorat" (
    "id" SERIAL NOT NULL,
    "mentor_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "date_session" TIMESTAMP(3) NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "statut" VARCHAR(50) NOT NULL DEFAULT 'réservé',
    "sujet" VARCHAR(255),
    "notes" TEXT,
    "lien_reunion" VARCHAR(255),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_mentorat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "contenu" TEXT NOT NULL,
    "tags" VARCHAR(255),
    "est_resolu" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_responses" (
    "id" SERIAL NOT NULL,
    "post_id" INTEGER NOT NULL,
    "user_id" INTEGER NOT NULL,
    "contenu" TEXT NOT NULL,
    "est_solution" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_votes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "target_type" VARCHAR(20) NOT NULL,
    "target_id" INTEGER NOT NULL,
    "valeur" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_follows" (
    "id" SERIAL NOT NULL,
    "follower_id" INTEGER NOT NULL,
    "following_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_follows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_achievements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "badge_name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(255),
    "earned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_achievements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_produits" (
    "id" SERIAL NOT NULL,
    "vendeur_id" INTEGER NOT NULL,
    "titre" TEXT NOT NULL,
    "description" TEXT,
    "categorie" VARCHAR(100) NOT NULL DEFAULT 'service',
    "prix" DECIMAL(10,2) NOT NULL,
    "image_url" VARCHAR(500),
    "duree_livraison" VARCHAR(50),
    "est_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_produits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_panier" (
    "id" SERIAL NOT NULL,
    "acheteur_id" INTEGER NOT NULL,
    "produit_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketplace_panier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_commandes" (
    "id" SERIAL NOT NULL,
    "acheteur_id" INTEGER NOT NULL,
    "vendeur_id" INTEGER,
    "produit_id" INTEGER NOT NULL,
    "quantite" INTEGER NOT NULL DEFAULT 1,
    "prix_unitaire" DECIMAL(10,2),
    "prix_total" DECIMAL(10,2) NOT NULL,
    "mode_paiement" VARCHAR(50) NOT NULL DEFAULT 'wave',
    "statut" VARCHAR(50) NOT NULL DEFAULT 'en_attente',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_commandes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actualites" (
    "id" SERIAL NOT NULL,
    "titre" VARCHAR(255) NOT NULL,
    "contenu" TEXT NOT NULL,
    "image_principale" VARCHAR(500),
    "auteur_id" INTEGER NOT NULL,
    "publie" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actualites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certificats" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'formation',
    "formation_id" INTEGER,
    "parcours_id" INTEGER,
    "nom_imprime" VARCHAR(150) NOT NULL DEFAULT '',
    "nom_fichier" TEXT NOT NULL,
    "code_verification" VARCHAR(100) NOT NULL,
    "date_obtention" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "certificats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcours_quizzes" (
    "id" SERIAL NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "reponse" INTEGER NOT NULL,
    "explication" TEXT,
    "ordre" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "parcours_quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcours_quiz_resultats" (
    "user_id" INTEGER NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "passed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "user_parcours" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "parcours_id" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'actif',
    "date_inscription" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_parcours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abonnements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "statut" TEXT NOT NULL DEFAULT 'active',
    "date_debut" TIMESTAMP(3) NOT NULL,
    "date_fin" TIMESTAMP(3) NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'fedapay',
    "paiement_id" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abonnements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paiements" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "fedapay_transaction_id" TEXT NOT NULL,
    "reference" VARCHAR(100),
    "montant" DECIMAL(10,2) NOT NULL,
    "devise" VARCHAR(10) NOT NULL DEFAULT 'XOF',
    "statut" TEXT NOT NULL DEFAULT 'pending',
    "methode" VARCHAR(50),
    "payload_webhook" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "paiements_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "modules_formation_id_idx" ON "modules"("formation_id");

-- CreateIndex
CREATE INDEX "cours_module_id_ordre_idx" ON "cours"("module_id", "ordre");

-- CreateIndex
CREATE INDEX "lecons_cours_id_ordre_idx" ON "lecons"("cours_id", "ordre");

-- CreateIndex
CREATE UNIQUE INDEX "cours_quizzes_cours_id_key" ON "cours_quizzes"("cours_id");

-- CreateIndex
CREATE UNIQUE INDEX "cours_quiz_resultats_user_id_quiz_id_key" ON "cours_quiz_resultats"("user_id", "quiz_id");

-- CreateIndex
CREATE UNIQUE INDEX "progression_lecons_user_id_lecon_id_key" ON "progression_lecons"("user_id", "lecon_id");

-- CreateIndex
CREATE UNIQUE INDEX "formation_quiz_resultats_user_id_formation_id_key" ON "formation_quiz_resultats"("user_id", "formation_id");

-- CreateIndex
CREATE UNIQUE INDEX "progression_formations_user_id_formation_id_key" ON "progression_formations"("user_id", "formation_id");

-- CreateIndex
CREATE UNIQUE INDEX "projet_likes_projet_id_user_id_key" ON "projet_likes"("projet_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "community_votes_user_id_target_type_target_id_key" ON "community_votes"("user_id", "target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_follows_follower_id_following_id_key" ON "user_follows"("follower_id", "following_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_achievements_user_id_badge_name_key" ON "user_achievements"("user_id", "badge_name");

-- CreateIndex
CREATE UNIQUE INDEX "marketplace_panier_acheteur_id_produit_id_key" ON "marketplace_panier"("acheteur_id", "produit_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificats_user_id_formation_id_key" ON "certificats"("user_id", "formation_id");

-- CreateIndex
CREATE UNIQUE INDEX "certificats_user_id_parcours_id_key" ON "certificats"("user_id", "parcours_id");

-- CreateIndex
CREATE UNIQUE INDEX "parcours_quiz_resultats_user_id_parcours_id_key" ON "parcours_quiz_resultats"("user_id", "parcours_id");

-- CreateIndex
CREATE INDEX "user_parcours_user_id_statut_idx" ON "user_parcours"("user_id", "statut");

-- CreateIndex
CREATE UNIQUE INDEX "user_parcours_user_id_parcours_id_key" ON "user_parcours"("user_id", "parcours_id");

-- CreateIndex
CREATE UNIQUE INDEX "abonnements_paiement_id_key" ON "abonnements"("paiement_id");

-- CreateIndex
CREATE INDEX "abonnements_user_id_date_fin_idx" ON "abonnements"("user_id", "date_fin");

-- CreateIndex
CREATE UNIQUE INDEX "paiements_fedapay_transaction_id_key" ON "paiements"("fedapay_transaction_id");

-- CreateIndex
CREATE INDEX "paiements_user_id_idx" ON "paiements"("user_id");

-- AddForeignKey
ALTER TABLE "formations" ADD CONSTRAINT "formations_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modules" ADD CONSTRAINT "modules_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours" ADD CONSTRAINT "cours_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lecons" ADD CONSTRAINT "lecons_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "videos" ADD CONSTRAINT "videos_lecon_id_fkey" FOREIGN KEY ("lecon_id") REFERENCES "lecons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audios" ADD CONSTRAINT "audios_lecon_id_fkey" FOREIGN KEY ("lecon_id") REFERENCES "lecons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pieces_jointes" ADD CONSTRAINT "pieces_jointes_lecon_id_fkey" FOREIGN KEY ("lecon_id") REFERENCES "lecons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_quizzes" ADD CONSTRAINT "cours_quizzes_cours_id_fkey" FOREIGN KEY ("cours_id") REFERENCES "cours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_quiz_questions" ADD CONSTRAINT "cours_quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "cours_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_quiz_resultats" ADD CONSTRAINT "cours_quiz_resultats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cours_quiz_resultats" ADD CONSTRAINT "cours_quiz_resultats_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "cours_quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_lecons" ADD CONSTRAINT "progression_lecons_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_lecons" ADD CONSTRAINT "progression_lecons_lecon_id_fkey" FOREIGN KEY ("lecon_id") REFERENCES "lecons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_quizzes" ADD CONSTRAINT "formation_quizzes_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_quiz_resultats" ADD CONSTRAINT "formation_quiz_resultats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formation_quiz_resultats" ADD CONSTRAINT "formation_quiz_resultats_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_formations" ADD CONSTRAINT "progression_formations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "progression_formations" ADD CONSTRAINT "progression_formations_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets_briefs" ADD CONSTRAINT "projets_briefs_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projets" ADD CONSTRAINT "projets_brief_id_fkey" FOREIGN KEY ("brief_id") REFERENCES "projets_briefs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_commentaires" ADD CONSTRAINT "projet_commentaires_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_commentaires" ADD CONSTRAINT "projet_commentaires_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_likes" ADD CONSTRAINT "projet_likes_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projet_likes" ADD CONSTRAINT "projet_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livrables" ADD CONSTRAINT "livrables_projet_id_fkey" FOREIGN KEY ("projet_id") REFERENCES "projets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "livrables" ADD CONSTRAINT "livrables_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions_mentorat" ADD CONSTRAINT "sessions_mentorat_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions_mentorat" ADD CONSTRAINT "sessions_mentorat_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_responses" ADD CONSTRAINT "community_responses_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_responses" ADD CONSTRAINT "community_responses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_votes" ADD CONSTRAINT "community_votes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_follower_id_fkey" FOREIGN KEY ("follower_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_follows" ADD CONSTRAINT "user_follows_following_id_fkey" FOREIGN KEY ("following_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_produits" ADD CONSTRAINT "marketplace_produits_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_panier" ADD CONSTRAINT "marketplace_panier_acheteur_id_fkey" FOREIGN KEY ("acheteur_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_panier" ADD CONSTRAINT "marketplace_panier_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "marketplace_produits"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_commandes" ADD CONSTRAINT "marketplace_commandes_acheteur_id_fkey" FOREIGN KEY ("acheteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_commandes" ADD CONSTRAINT "marketplace_commandes_vendeur_id_fkey" FOREIGN KEY ("vendeur_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_commandes" ADD CONSTRAINT "marketplace_commandes_produit_id_fkey" FOREIGN KEY ("produit_id") REFERENCES "marketplace_produits"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actualites" ADD CONSTRAINT "actualites_auteur_id_fkey" FOREIGN KEY ("auteur_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificats" ADD CONSTRAINT "certificats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificats" ADD CONSTRAINT "certificats_formation_id_fkey" FOREIGN KEY ("formation_id") REFERENCES "formations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "certificats" ADD CONSTRAINT "certificats_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours_quizzes" ADD CONSTRAINT "parcours_quizzes_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours_quiz_resultats" ADD CONSTRAINT "parcours_quiz_resultats_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcours_quiz_resultats" ADD CONSTRAINT "parcours_quiz_resultats_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_parcours" ADD CONSTRAINT "user_parcours_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_parcours" ADD CONSTRAINT "user_parcours_parcours_id_fkey" FOREIGN KEY ("parcours_id") REFERENCES "parcours"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abonnements" ADD CONSTRAINT "abonnements_paiement_id_fkey" FOREIGN KEY ("paiement_id") REFERENCES "paiements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paiements" ADD CONSTRAINT "paiements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

