import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Plans de cours de départ. Ce seed est additif : il ne supprime et ne remplace
// aucun parcours, formation, module, cours ou leçon déjà saisi.
const CATALOGUE = [
  {
    parcours: 'Développement Web',
    formations: [
      {
        titre: 'Fondamentaux du Web',
        modules: [
          { titre: 'HTML & CSS Fondamentaux', couleurs: '#FF6B9D', icone: 'book-open', outils: ['Un ordinateur partagé ou personnel', 'Un navigateur récent', 'Un éditeur de code gratuit', 'Connexion légère ou supports téléchargeables'], competences: ['Structurer une page accessible', 'Créer une mise en page responsive'], livrables: ['Page de présentation responsive', 'Mini-portfolio'], cours: [
            ['Comprendre la structure HTML', 'Balises, titres, liens, images et formulaires', 'Créer une page HTML sémantique'],
            ['Mettre en forme avec CSS', 'Sélecteurs, couleurs, typographie et espacements', 'Appliquer une feuille de style claire'],
            ['Construire une page responsive', 'Flexbox, grille et adaptation aux petits écrans', 'Publier une page qui fonctionne sur téléphone'],
          ] },
          { titre: 'JavaScript Essentiels', couleurs: '#FFD93D', icone: 'code', outils: ['Ordinateur ou salle équipée', 'Navigateur avec outils de développement', 'Éditeur de code gratuit'], competences: ['Écrire des scripts lisibles', 'Manipuler le DOM', 'Réagir aux actions de la personne'], livrables: ['Page interactive', 'Mini-projet JavaScript'], cours: [
            ['Découvrir les bases de JavaScript', 'Variables, types, conditions et boucles', 'Écrire un petit programme guidé'],
            ['Organiser les données et fonctions', 'Tableaux, objets, fonctions et portée', 'Créer des fonctions réutilisables'],
            ['Rendre une page interactive', 'Événements, DOM, formulaires et validation', 'Ajouter une interaction utile à sa page'],
          ] },
        ],
      },
      {
        titre: 'React Avancé',
        modules: [
          { titre: 'React et composants', couleurs: '#61DAFB', icone: 'code', outils: ['Ordinateur avec Node.js', 'Éditeur de code', 'Connexion pour installer les dépendances'], competences: ['Structurer une interface en composants', 'Partager un état', 'Gérer les formulaires'], livrables: ['Interface React organisée', 'Formulaire validé'], cours: [
            ['Concevoir des composants réutilisables', 'Props, composition et conventions', 'Découper une interface en composants'],
            ['Gérer les états et formulaires', 'État local, contrôles et validation', 'Construire un formulaire accessible'],
            ['Organiser les pages', 'Navigation, routes et états de chargement', 'Créer une petite application multipage'],
          ] },
          { titre: 'Données et mise en production', couleurs: '#8B7CF6', icone: 'cloud', outils: ['Ordinateur', 'API de démonstration ou backend de formation', 'Compte gratuit de déploiement facultatif'], competences: ['Consommer une API', 'Gérer erreurs et chargements', 'Préparer une publication'], livrables: ['Application connectée à une API', 'Version publiée'], cours: [
            ['Charger et afficher des données', 'Requêtes, chargement et erreurs', 'Présenter une liste issue d’une API'],
            ['Tester et fiabiliser une interface', 'Cas limites, retours utilisateur et vérifications', 'Corriger un parcours utilisateur'],
            ['Publier une application', 'Variables de configuration et déploiement', 'Mettre en ligne un projet de démonstration'],
          ] },
        ],
      },
    ],
  },
  {
    parcours: 'Intelligence Artificielle & Data',
    formations: [
      { titre: 'Intelligence Artificielle & Data - Fondamentaux et Bases', modules: [
        { titre: 'Python et données', couleurs: '#3776AB', icone: 'chart-line', outils: ['Ordinateur partagé possible', 'Google Colab ou notebook gratuit', 'Jeux de données publics et anonymisés'], competences: ['Écrire des scripts Python', 'Lire et nettoyer un tableau de données'], livrables: ['Notebook documenté', 'Jeu de données nettoyé'], cours: [
          ['Premiers pas en Python', 'Variables, conditions, boucles et fonctions', 'Résoudre un exercice guidé'], ['Manipuler des tableaux de données', 'Colonnes, valeurs manquantes et filtres', 'Nettoyer un petit jeu de données'], ['Présenter une analyse', 'Statistiques descriptives et graphiques lisibles', 'Rédiger trois constats appuyés par les données'],
        ] },
        { titre: 'Découvrir le machine learning', couleurs: '#5B8C5A', icone: 'brain', outils: ['Notebook gratuit', 'Données publiques sans informations personnelles', 'Pas de carte graphique dédiée nécessaire'], competences: ['Distinguer apprentissage supervisé et non supervisé', 'Évaluer un modèle simple'], livrables: ['Modèle de classification pédagogique', 'Note sur ses limites'], cours: [
          ['Comprendre les données et les modèles', 'Variables, cible, entraînement et test', 'Préparer un jeu de données pédagogique'], ['Entraîner un premier modèle', 'Régression et classification avec un outil guidé', 'Comparer deux modèles simples'], ['Évaluer sans surinterpréter', 'Précision, rappel, biais et limites', 'Présenter les limites d’un résultat'],
        ] },
      ] },
      { titre: 'Intelligence Artificielle & Data - Niveau Intermédiaire', modules: [
        { titre: 'Analyse et visualisation avancées', couleurs: '#4C78A8', icone: 'chart-line', outils: ['Python et notebooks gratuits', 'Jeux de données publics', 'Ordinateur standard'], competences: ['Construire un pipeline de préparation', 'Choisir une visualisation adaptée'], livrables: ['Analyse reproductible', 'Tableau de bord exploratoire'], cours: [
          ['Préparer une analyse reproductible', 'Nettoyage, transformations et documentation', 'Créer un pipeline clair'], ['Explorer des relations', 'Corrélation, segmentation et prudence causale', 'Formuler des hypothèses à vérifier'], ['Communiquer les résultats', 'Choix des graphiques et récit de données', 'Présenter une recommandation mesurée'],
        ] },
        { titre: 'Modèles et IA responsable', couleurs: '#7952B3', icone: 'scale-balanced', outils: ['Notebook gratuit ou environnement cloud pédagogique', 'Données autorisées et documentées', 'Calcul local modeste suffisant pour les exercices'], competences: ['Comparer des modèles', 'Documenter biais, confidentialité et limites'], livrables: ['Expérience comparée', 'Fiche de risques et limites'], cours: [
          ['Améliorer une expérience de modélisation', 'Validation croisée et réglages simples', 'Comparer des résultats sans fuite de données'], ['Découvrir le traitement du langage', 'Représentations de texte et classification', 'Classer un petit corpus public'], ['Évaluer les impacts', 'Biais, consentement, explicabilité et sécurité', 'Rédiger une fiche d’usage responsable'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'Marketing Digital',
    formations: [
      { titre: 'Marketing Digital - Fondamentaux et Bases', modules: [
        { titre: 'Stratégie et contenus numériques', couleurs: '#E76F51', icone: 'bullhorn', outils: ['Smartphone ou ordinateur', 'Compte de réseau social de démonstration', 'Outils gratuits de création'], competences: ['Définir une audience', 'Créer un calendrier éditorial'], livrables: ['Profil client cible', 'Calendrier de contenus'], cours: [
          ['Définir son audience et son objectif', 'Besoins, proposition de valeur et objectifs mesurables', 'Rédiger une fiche audience non stéréotypée'], ['Créer des contenus utiles', 'Formats, rédaction et identité de marque', 'Préparer trois publications accessibles'], ['Planifier ses publications', 'Calendrier, cohérence et modération', 'Construire un calendrier sur deux semaines'],
        ] },
        { titre: 'Réseaux sociaux et référencement', couleurs: '#2A9D8F', icone: 'magnifying-glass', outils: ['Smartphone', 'Outils gratuits de statistiques', 'Connexion ponctuelle'], competences: ['Optimiser une page sociale', 'Comprendre les bases du SEO'], livrables: ['Page optimisée', 'Liste de mots-clés'], cours: [
          ['Animer une communauté', 'Formats, échanges, modération et sécurité', 'Répondre à des commentaires de façon professionnelle'], ['Découvrir le référencement naturel', 'Intention de recherche, titres et contenu utile', 'Améliorer une page fictive'], ['Mesurer les premiers résultats', 'Portée, clics et conversions', 'Lire un tableau de statistiques simple'],
        ] },
      ] },
      { titre: 'Marketing Digital - Niveau Intermédiaire', modules: [
        { titre: 'Campagnes et publicité numérique', couleurs: '#F4A261', icone: 'bullseye', outils: ['Ordinateur ou smartphone', 'Outils de simulation ou comptes de démonstration', 'Aucun budget publicitaire requis pour apprendre'], competences: ['Concevoir une campagne mesurable', 'Répartir un budget avec prudence'], livrables: ['Plan de campagne', 'Budget prévisionnel'], cours: [
          ['Construire un parcours de campagne', 'Objectif, audience, message et appel à l’action', 'Dessiner un parcours de conversion'], ['Préparer une campagne publicitaire', 'Formats, ciblage responsable et budget test', 'Simuler une campagne sans achat média'], ['Optimiser une campagne', 'Indicateurs et tests comparatifs', 'Proposer une amélioration argumentée'],
        ] },
        { titre: 'Fidélisation et stratégie de contenu', couleurs: '#6A4C93', icone: 'envelope', outils: ['Outils gratuits de planification', 'Liste de contacts fictive pour les exercices', 'Respect du consentement et des règles locales'], competences: ['Construire une relation durable', 'Évaluer la performance éditoriale'], livrables: ['Séquence de fidélisation', 'Bilan éditorial'], cours: [
          ['Fidéliser sans harceler', 'Consentement, fréquence et valeur apportée', 'Rédiger une séquence de messages fictive'], ['Organiser une stratégie éditoriale', 'Piliers, formats et réutilisation de contenus', 'Créer un plan éditorial mensuel'], ['Présenter un bilan', 'Indicateurs, apprentissages et prochaines étapes', 'Rédiger un rapport concis'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'E-commerce',
    formations: [
      { titre: 'E-commerce - Fondamentaux et Bases', modules: [
        { titre: 'Créer une boutique en ligne', couleurs: '#F4A261', icone: 'store', outils: ['Smartphone ou ordinateur', 'Plateforme de démonstration ou maquette', 'Photos de produits prises au téléphone'], competences: ['Présenter une offre clairement', 'Structurer une boutique simple'], livrables: ['Catalogue de démonstration', 'Fiche produit complète'], cours: [
          ['Valider son idée de boutique', 'Clientèle, besoin, offre et concurrence', 'Décrire une offre testable'], ['Créer des fiches produits', 'Photos, bénéfices, prix et informations fiables', 'Rédiger deux fiches produits'], ['Organiser le parcours d’achat', 'Navigation, panier et confiance', 'Dessiner le parcours de commande'],
        ] },
        { titre: 'Vente, paiement et logistique', couleurs: '#E9C46A', icone: 'truck', outils: ['Téléphone ou ordinateur', 'Exemples de moyens de paiement locaux', 'Simulation sans transaction réelle'], competences: ['Cartographier une commande', 'Prévoir livraison et service client'], livrables: ['Procédure de commande', 'Politique de livraison et retours'], cours: [
          ['Comprendre les paiements', 'Options locales, sécurité et frais', 'Comparer des solutions sans transmettre de données réelles'], ['Préparer la livraison', 'Stock, emballage, transport et délais', 'Établir un scénario de livraison'], ['Répondre aux clientes', 'Confirmation, retours et réclamations', 'Rédiger des réponses types respectueuses'],
        ] },
      ] },
      { titre: 'E-commerce - Niveau Intermédiaire', modules: [
        { titre: 'Acquisition et conversion', couleurs: '#2A9D8F', icone: 'cart-shopping', outils: ['Statistiques d’une boutique de démonstration', 'Outils gratuits de création de contenus', 'Budget publicitaire facultatif'], competences: ['Améliorer les conversions', 'Suivre les étapes de vente'], livrables: ['Plan d’acquisition', 'Proposition d’amélioration de boutique'], cours: [
          ['Attirer des clientes qualifiées', 'Contenu, référencement et partenariats', 'Construire un plan d’acquisition'], ['Réduire les freins à l’achat', 'Clarté, confiance, paiement et mobile', 'Auditer une fiche produit'], ['Analyser le tunnel de vente', 'Visites, panier et commandes', 'Repérer une étape à améliorer'],
        ] },
        { titre: 'Gestion et croissance durable', couleurs: '#577590', icone: 'chart-line', outils: ['Tableur gratuit', 'Données fictives ou anonymisées', 'Outil de gestion accessible sur mobile'], competences: ['Suivre marges et stocks', 'Planifier une croissance réaliste'], livrables: ['Tableau de suivi', 'Plan d’amélioration à 90 jours'], cours: [
          ['Calculer ses marges', 'Coûts, frais et prix de vente', 'Construire un calculateur simple'], ['Gérer les stocks et la trésorerie', 'Réapprovisionnement et prévisions prudentes', 'Simuler un mois d’activité'], ['Grandir sans perdre la qualité', 'Fidélisation, indicateurs et risques', 'Prioriser trois actions de croissance'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'Leadership & Business',
    formations: [
      { titre: 'Leadership & Business - Fondamentaux et Bases', modules: [
        { titre: 'Leadership et communication', couleurs: '#9B5DE5', icone: 'people-group', outils: ['Carnet ou téléphone', 'Études de cas imprimables ou téléchargeables', 'Travail en binôme facultatif'], competences: ['Clarifier ses objectifs', 'Communiquer avec assertivité'], livrables: ['Plan de progression personnel', 'Présentation courte'], cours: [
          ['Identifier ses forces et priorités', 'Valeurs, objectifs et confiance professionnelle', 'Formuler un objectif réaliste'], ['Communiquer avec clarté', 'Écoute, assertivité et feedback', 'S’entraîner à une conversation professionnelle'], ['Prendre la parole', 'Structure d’un message et gestion du trac', 'Préparer une présentation de deux minutes'],
        ] },
        { titre: 'Gestion de projet et organisation', couleurs: '#00AFB9', icone: 'list-check', outils: ['Carnet ou tableau blanc', 'Outil gratuit de tâches', 'Téléphone suffisant pour les exercices'], competences: ['Découper un objectif en étapes', 'Suivre tâches et échéances'], livrables: ['Plan de projet simple', 'Tableau de suivi'], cours: [
          ['Définir un projet', 'Problème, objectif, périmètre et bénéficiaires', 'Rédiger une fiche projet'], ['Planifier les étapes', 'Tâches, dépendances et priorités', 'Construire un calendrier réaliste'], ['Suivre et apprendre', 'Risques, points de suivi et bilan', 'Préparer une revue de projet'],
        ] },
      ] },
      { titre: 'Leadership & Business - Niveau Intermédiaire', modules: [
        { titre: 'Pilotage d’activité', couleurs: '#F15BB5', icone: 'chart-pie', outils: ['Tableur gratuit', 'Données d’entreprise fictives', 'Calculatrice de téléphone'], competences: ['Lire des indicateurs simples', 'Décider à partir de faits'], livrables: ['Tableau de bord', 'Plan d’action trimestriel'], cours: [
          ['Comprendre les finances de base', 'Recettes, dépenses, marge et trésorerie', 'Construire un budget prévisionnel'], ['Suivre la performance', 'Indicateurs utiles et qualité des données', 'Choisir cinq indicateurs pertinents'], ['Décider et ajuster', 'Scénarios, risques et priorités', 'Présenter une décision argumentée'],
        ] },
        { titre: 'Équipe et négociation', couleurs: '#577590', icone: 'handshake', outils: ['Études de cas', 'Carnet de préparation', 'Simulations en groupe facultatives'], competences: ['Animer une équipe inclusive', 'Préparer une négociation'], livrables: ['Rituel d’équipe', 'Plan de négociation'], cours: [
          ['Créer un cadre d’équipe sain', 'Rôles, inclusion et prévention des conflits', 'Rédiger des règles de collaboration'], ['Déléguer et donner du feedback', 'Attentes, autonomie et suivi', 'Préparer un entretien de feedback'], ['Négocier une solution', 'Intérêts, options et accord clair', 'Simuler une négociation professionnelle'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'Freelance & Entrepreneuriat',
    formations: [
      { titre: 'Freelance & Entrepreneuriat - Fondamentaux et Bases', modules: [
        { titre: 'Lancer son activité freelance', couleurs: '#F9844A', icone: 'briefcase', outils: ['Smartphone ou ordinateur', 'Tableur et outils gratuits', 'Modèles de devis de démonstration'], competences: ['Définir une offre', 'Présenter ses services à une clientèle'], livrables: ['Offre de service', 'Présentation professionnelle'], cours: [
          ['Choisir un problème à résoudre', 'Compétences, besoins et validation terrain', 'Mener trois entretiens exploratoires'], ['Définir son offre', 'Périmètre, bénéfices et limites', 'Rédiger une offre claire'], ['Trouver ses premières clientes', 'Réseau, portfolio et prise de contact', 'Préparer un message de prospection respectueux'],
        ] },
        { titre: 'Prix, contrats et organisation', couleurs: '#90BE6D', icone: 'file-contract', outils: ['Calculatrice ou tableur', 'Exemples de devis et factures', 'Accès à des informations administratives locales'], competences: ['Estimer un tarif', 'Organiser le suivi client'], livrables: ['Grille tarifaire', 'Modèle de devis et processus client'], cours: [
          ['Fixer un prix viable', 'Temps, coûts, valeur et marge de sécurité', 'Calculer un tarif indicatif'], ['Sécuriser une mission', 'Périmètre, délais, paiement et accord écrit', 'Préparer une liste de points à confirmer'], ['Gérer son activité au quotidien', 'Suivi du temps, facturation et relation client', 'Créer un tableau de suivi'],
        ] },
      ] },
      { titre: 'Freelance & Entrepreneuriat - Niveau Intermédiaire', modules: [
        { titre: 'Modèle économique et développement', couleurs: '#43AA8B', icone: 'chart-line', outils: ['Tableur gratuit', 'Entretiens clients ou retours anonymisés', 'Canaux gratuits de visibilité'], competences: ['Tester un modèle économique', 'Améliorer l’acquisition client'], livrables: ['Modèle économique résumé', 'Plan de développement'], cours: [
          ['Construire un modèle économique', 'Clients, revenus, coûts et partenaires', 'Compléter une toile de modèle simple'], ['Tester ses hypothèses', 'Entretiens, prototypes et signaux de demande', 'Préparer une expérience à faible coût'], ['Développer une clientèle durable', 'Recommandations, partenariats et fidélisation', 'Concevoir un plan de prospection mensuel'],
        ] },
        { titre: 'Gestion, financement et résilience', couleurs: '#277DA1', icone: 'shield-heart', outils: ['Tableur ou carnet', 'Ressources d’accompagnement locales', 'Aucun financement obligatoire pour les exercices'], competences: ['Prévoir trésorerie et risques', 'Présenter un projet clairement'], livrables: ['Prévisionnel simplifié', 'Présentation de projet'], cours: [
          ['Prévoir sa trésorerie', 'Encaissements, dépenses et scénarios', 'Construire une prévision sur trois mois'], ['Explorer les financements avec prudence', 'Besoins, conditions et coût d’un financement', 'Comparer des options sans s’endetter pour le cours'], ['Présenter et faire évoluer son activité', 'Récit, indicateurs et plan de continuité', 'Présenter son projet en cinq minutes'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'Design UI/UX',
    formations: [
      { titre: 'Design UI/UX - Fondamentaux et Bases', modules: [
        { titre: 'Recherche utilisateur et UX', couleurs: '#F15BB5', icone: 'users', outils: ['Papier et téléphone suffisent', 'Outil gratuit de questionnaire', 'Consentement explicite pour toute collecte'], competences: ['Comprendre un besoin utilisateur', 'Dessiner un parcours simple'], livrables: ['Synthèse d’entretiens', 'Parcours utilisateur'], cours: [
          ['Découvrir la recherche utilisateur', 'Questions ouvertes, écoute et consentement', 'Préparer un guide d’entretien'], ['Structurer un parcours', 'Besoins, étapes et points de friction', 'Cartographier un parcours de service'], ['Imaginer des solutions', 'Idéation, priorisation et test rapide', 'Comparer trois idées avec des critères'],
        ] },
        { titre: 'Interface et prototypage', couleurs: '#00BBF9', icone: 'pen-ruler', outils: ['Téléphone ou ordinateur', 'Figma gratuit ou papier', 'Accès internet ponctuel'], competences: ['Construire une interface lisible', 'Créer un prototype testable'], livrables: ['Maquette mobile', 'Prototype cliquable'], cours: [
          ['Comprendre les bases visuelles', 'Hiérarchie, contraste, typographie et cohérence', 'Créer un écran lisible'], ['Dessiner une interface mobile', 'Grilles, composants et états', 'Maquetter un parcours de trois écrans'], ['Prototyper et recueillir des retours', 'Interactions simples et test modéré', 'Corriger une maquette après un test'],
        ] },
      ] },
      { titre: 'Design UI/UX - Niveau Intermédiaire', modules: [
        { titre: 'Systèmes de design et accessibilité', couleurs: '#9B5DE5', icone: 'universal-access', outils: ['Ordinateur recommandé mais travail papier possible', 'Figma ou outil libre équivalent', 'Lecteur d’écran facultatif pour les essais'], competences: ['Créer des composants cohérents', 'Vérifier les bases d’accessibilité'], livrables: ['Mini système de design', 'Liste de corrections d’accessibilité'], cours: [
          ['Créer des composants réutilisables', 'Variantes, états et nomenclature', 'Assembler une petite bibliothèque UI'], ['Concevoir pour plusieurs usages', 'Contraste, clavier, texte et retour d’erreur', 'Auditer une interface sur téléphone'], ['Documenter un système de design', 'Règles, exemples et maintenance', 'Rédiger une fiche de composants'],
        ] },
        { titre: 'Recherche et mesure UX', couleurs: '#577590', icone: 'magnifying-glass-chart', outils: ['Outils gratuits de sondage et de prototype', 'Participants volontaires et consentants', 'Données anonymisées'], competences: ['Planifier un test utilisateur', 'Transformer les retours en priorités'], livrables: ['Rapport de test', 'Feuille de route UX'], cours: [
          ['Évaluer une expérience', 'Scénarios, tâches et observation', 'Animer un test sans orienter la participante'], ['Analyser les retours', 'Motifs, sévérité et preuves', 'Classer les problèmes observés'], ['Mesurer les améliorations', 'Indicateurs qualitatifs et quantitatifs', 'Proposer une prochaine itération'],
        ] },
      ] },
    ],
  },
  {
    parcours: 'Cybersécurité',
    formations: [
      { titre: 'Cybersécurité - Fondamentaux et Bases', modules: [
        { titre: 'Sécurité numérique personnelle et professionnelle', couleurs: '#577590', icone: 'shield-halved', outils: ['Smartphone ou ordinateur à jour', 'Gestionnaire de mots de passe gratuit facultatif', 'Exercices uniquement sur des comptes de démonstration'], competences: ['Renforcer ses comptes', 'Reconnaître les tentatives d’hameçonnage'], livrables: ['Plan de protection des comptes', 'Guide de réaction à un message suspect'], cours: [
          ['Protéger ses comptes', 'Mots de passe uniques, authentification et récupération', 'Établir un plan de sécurisation'], ['Reconnaître les arnaques', 'Hameçonnage, usurpation et vérification', 'Analyser des exemples fictifs'], ['Sécuriser ses appareils', 'Mises à jour, sauvegardes et confidentialité', 'Créer une routine de vérification'],
        ] },
        { titre: 'Réseaux et bases de la sécurité', couleurs: '#43AA8B', icone: 'network-wired', outils: ['Ordinateur de formation partagé', 'Laboratoire local isolé préparé par la formatrice', 'Aucune cible publique ni attaque réelle'], competences: ['Comprendre les bases réseau', 'Appliquer une démarche défensive'], livrables: ['Schéma réseau simplifié', 'Liste de mesures de protection'], cours: [
          ['Comprendre comment circule une donnée', 'Adresse IP, DNS, navigateur et chiffrement', 'Dessiner le trajet d’une connexion'], ['Découvrir les vulnérabilités courantes', 'Mises à jour, permissions et erreurs de configuration', 'Examiner une application volontairement vulnérable hors ligne'], ['Documenter un incident', 'Observation, priorité et escalade', 'Rédiger une fiche d’incident fictive'],
        ] },
      ] },
      { titre: 'Cybersécurité - Niveau Intermédiaire', modules: [
        { titre: 'Sécurité applicative et tests encadrés', couleurs: '#277DA1', icone: 'bug-slash', outils: ['Ordinateur et environnement de laboratoire local', 'Applications volontairement vulnérables', 'Autorisation écrite obligatoire pour tout test réel'], competences: ['Repérer des défauts de sécurité en laboratoire', 'Proposer des corrections'], livrables: ['Rapport de laboratoire', 'Plan de correction'], cours: [
          ['Lire une application sous l’angle sécurité', 'Sessions, entrées et contrôles d’accès', 'Repérer des risques dans un cas pédagogique'], ['Tester dans un cadre autorisé', 'Périmètre, journalisation et règles d’engagement', 'Compléter une fiche de test sur laboratoire isolé'], ['Rédiger des recommandations', 'Preuve minimale, gravité et correction', 'Présenter un rapport défensif'],
        ] },
        { titre: 'Gestion des risques et réponse aux incidents', couleurs: '#6A4C93', icone: 'triangle-exclamation', outils: ['Modèles de registre et de procédure', 'Données de simulation sans informations personnelles', 'Équipe de jeu de rôle facultative'], competences: ['Prioriser des risques', 'Organiser une réponse coordonnée'], livrables: ['Registre des risques', 'Plan de réponse à incident'], cours: [
          ['Évaluer les risques', 'Actifs, menaces, impacts et mesures', 'Prioriser des scénarios fictifs'], ['Réagir à un incident', 'Détection, confinement, communication et reprise', 'Jouer une simulation sur table'], ['Améliorer la résilience', 'Sauvegardes, exercices et retour d’expérience', 'Proposer un plan d’amélioration'],
        ] },
      ] },
    ],
  },
];

function lessonContent({ titre, objectif, activite, outils, competences, livrables, pratique }) {
  const safe = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  const liste = (items) => items.map((item) => `<li>${safe(item)}</li>`).join('');
  const notions = objectif.split(/[,;] /).map((item) => item.trim()).filter(Boolean);
  const sections = pratique
    ? [
      `<h2>Défi pratique</h2><p>${safe(activite)}</p>`,
      '<h2>Étapes de réalisation</h2><ol><li>Reformule le besoin et définis le résultat attendu.</li><li>Prépare ton espace de travail et rassemble les informations nécessaires.</li><li>Réalise une première version en avançant par petites étapes.</li><li>Teste le résultat avec un exemple concret et corrige ce qui ne fonctionne pas.</li><li>Présente ton travail et explique un choix que tu as fait.</li></ol>',
      `<h2>Critères de réussite</h2><ul>${liste(competences.map((item) => `Le résultat montre que tu sais : ${item.toLowerCase()}.`))}<li>Le livrable est compréhensible, utilisable et sans donnée personnelle réelle.</li><li>Tu peux décrire une amélioration à apporter dans une prochaine version.</li></ul>`,
      `<h2>À remettre</h2><ul>${liste(livrables)}</ul>`,
    ]
    : [
      `<h2>Notions de la leçon</h2><p>${safe(objectif)}. Cette leçon présente les notions et les relie à une réalisation concrète.</p>`,
      `<h2>Repères essentiels</h2><ul>${liste(notions.map((item) => `${item} : définis cette notion avec tes propres mots, repère à quoi elle sert et donne un exemple.`))}</ul>`,
      '<h2>Méthode</h2><ol><li>Observe le besoin ou le problème auquel la notion répond.</li><li>Repère les informations, outils et contraintes utiles.</li><li>Étudie un exemple simple, puis explique chaque étape.</li><li>Vérifie ta compréhension en donnant un contre-exemple ou une limite.</li></ol>',
      `<h2>Vérifie ta compréhension</h2><ol><li>Quel problème cette notion aide-t-elle à résoudre ?</li><li>Dans quel cas l’utiliserais-tu pour « ${safe(titre)} » ?</li><li>Quel point dois-tu encore vérifier avant de passer à la pratique ?</li></ol>`,
    ];

  return [
    `<h2>Objectif pédagogique</h2><p>À la fin de cette leçon, tu pourras expliquer et appliquer : <strong>${safe(pratique ? activite : objectif)}</strong>.</p>`,
    ...sections,
    `<h2>Matériel conseillé</h2><ul>${liste(outils)}</ul>`,
    '<p><strong>Pour apprendre à ton rythme :</strong> les consignes peuvent être suivies sur un appareil partagé. Télécharge-les si la connexion est limitée. Pour les exercices, utilise des exemples fictifs ou anonymisés et ne partage pas de données personnelles.</p>',
  ].join('\n');
}

async function main() {
  let modulesCrees = 0;
  let coursCrees = 0;
  let leconsCreees = 0;

  for (const parcoursData of CATALOGUE) {
    const parcours = await prisma.parcours.findFirst({ where: { titre: parcoursData.parcours } });
    if (!parcours) throw new Error(`Parcours introuvable : ${parcoursData.parcours}. Lance d’abord le seed catalogue.`);

    for (let fi = 0; fi < parcoursData.formations.length; fi += 1) {
      const formationData = parcoursData.formations[fi];
      const formation = await prisma.formation.findFirst({ where: { parcoursId: parcours.id, titre: formationData.titre } });
      if (!formation) throw new Error(`Formation introuvable : ${formationData.titre}. Lance d’abord le seed catalogue.`);

      for (let mi = 0; mi < formationData.modules.length; mi += 1) {
        const moduleData = formationData.modules[mi];
        let module = await prisma.module.findFirst({ where: { formationId: formation.id, titre: moduleData.titre } });
        if (!module) {
          module = await prisma.module.create({
            data: {
              formationId: formation.id,
              numero: mi + 1,
              titre: moduleData.titre,
              description: `Parcours guidé. Matériel conseillé : ${moduleData.outils.join('; ')}. Les outils payants ne sont pas requis.`,
              duree: 12,
              heuresParSemaine: 3,
              langages: moduleData.outils.filter((outil) => /Python|JavaScript|HTML|CSS|React|Figma|Google Colab|notebook/i.test(outil)),
              competences: moduleData.competences,
              livrables: moduleData.livrables,
              couleur: moduleData.couleurs,
              icone: moduleData.icone,
            },
          });
          modulesCrees += 1;
        }

        for (let ci = 0; ci < moduleData.cours.length; ci += 1) {
          const [titre, description, projet] = moduleData.cours[ci];
          let cours = await prisma.cours.findFirst({ where: { moduleId: module.id, titre } });
          if (!cours) {
            cours = await prisma.cours.create({ data: { moduleId: module.id, titre, description, ordre: ci + 1 } });
            coursCrees += 1;
          }

          const lessonSpecs = [
            { titre: `Comprendre : ${titre}`, description, type: 'théorie', ordre: 1, dureeMinutes: 25, contenuTexte: lessonContent({ titre, objectif: description, activite: projet, outils: moduleData.outils, competences: moduleData.competences, livrables: moduleData.livrables, pratique: false }) },
            { titre: `Mettre en pratique : ${titre}`, description: projet, type: 'pratique', ordre: 2, dureeMinutes: 40, contenuTexte: lessonContent({ titre, objectif: description, activite: projet, outils: moduleData.outils, competences: moduleData.competences, livrables: moduleData.livrables, pratique: true }) },
          ];
          for (let li = 0; li < lessonSpecs.length; li += 1) {
            const lesson = lessonSpecs[li];
            const exists = await prisma.lecon.findFirst({ where: { coursId: cours.id, titre: lesson.titre } });
            if (!exists) {
              await prisma.lecon.create({ data: { coursId: cours.id, ...lesson } });
              leconsCreees += 1;
            } else if (/Repère les notions principales|Réalise «/.test(exists.contenuTexte || '')) {
              // Met à niveau les textes génériques créés par la première version
              // du seed, sans toucher aux leçons rédigées manuellement.
              await prisma.lecon.update({ where: { id: exists.id }, data: lesson });
              leconsCreees += 1;
            }
          }
        }
      }
    }
  }

  console.log(`Modèles de cours prêts : ${CATALOGUE.length} parcours, ${modulesCrees} modules, ${coursCrees} cours et ${leconsCreees} leçons ajoutés.`);
  console.log('Les contenus déjà présents ont été conservés.');
}

main()
  .catch((error) => {
    console.error('Erreur pendant la création des modèles de cours :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
