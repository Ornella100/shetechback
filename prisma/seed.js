import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function seed() {
  console.log('🧹 Nettoyage de la base de données...');
  await prisma.progressionLecon.deleteMany();
  await prisma.coursQuizResultat.deleteMany();
  await prisma.formationQuizResultat.deleteMany();
  await prisma.parcoursQuizResultat.deleteMany();
  await prisma.parcoursQuiz.deleteMany();
  await prisma.abonnement.deleteMany();
  await prisma.paiement.deleteMany();
  await prisma.userParcours.deleteMany();
  await prisma.coursQuizQuestion.deleteMany();
  await prisma.formationQuiz.deleteMany();
  await prisma.coursQuiz.deleteMany();
  await prisma.pieceJointe.deleteMany();
  await prisma.audio.deleteMany();
  await prisma.video.deleteMany();
  await prisma.lecon.deleteMany();
  await prisma.cours.deleteMany();
  await prisma.module.deleteMany();
  await prisma.progressionFormation.deleteMany();
  await prisma.certificat.deleteMany();
  await prisma.formation.deleteMany();
  await prisma.parcours.deleteMany();
  await prisma.user.deleteMany();

  console.log(' Création des utilisateurs...');
  const dans30Jours = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const adminPassword = await bcrypt.hash('Admin123!', 10);
  const admin = await prisma.user.create({
    data: {
      nom: 'Admin SheTech',
      email: 'admin@shetech.com',
      motDePasse: adminPassword,
      role: 'admin',
    },
  });

  const userPassword = await bcrypt.hash('User123!', 10);
  const user = await prisma.user.create({
    data: {
      nom: 'Marie Diallo',
      email: 'marie@shetech.com',
      motDePasse: userPassword,
      role: 'apprenante',
      niveau: 'débutante',
      trialEndsAt: dans30Jours,
    },
  });

  const mentorPassword = await bcrypt.hash('Mentor123!', 10);
  await prisma.user.create({
    data: {
      nom: 'Fatou Mentorat',
      email: 'mentor@shetech.com',
      motDePasse: mentorPassword,
      role: 'mentor',
    },
  });

  console.log('📚 Création des 8 parcours...');

  const parcoursData = [
    { titre: 'Développement Web', description: 'Apprendre HTML, CSS, JavaScript et les frameworks modernes' },
    { titre: 'Design Graphique', description: 'Maîtriser les outils de design et les principes de création visuelle' },
    { titre: 'Data Science', description: 'Explorez Python, analyse de données et machine learning' },
    { titre: 'DevOps & Cloud', description: 'Docker, Kubernetes, AWS et déploiement continu' },
    { titre: 'Mobile Dev', description: 'Développement iOS et Android natif ou cross-platform' },
    { titre: 'Sécurité Informatique', description: 'Cybersécurité, ethical hacking et protection des données' },
    { titre: 'Entrepreneuriat Tech', description: 'De l\'idée au produit: créer votre startup tech' },
    { titre: 'AI & Machine Learning', description: 'Intelligence artificielle, deep learning et NLP' },
  ];

  const parcours = await Promise.all(
    parcoursData.map((p, i) =>
      prisma.parcours.create({
        data: { ...p, ordre: i + 1 },
      })
    )
  );

  console.log(' Création des formations...');

  // Pour le premier parcours (Développement Web) - détaillé
  const p1 = parcours[0];
  const f1 = await prisma.formation.create({
    data: {
      titre: 'Fondamentaux du Web',
      description: 'HTML, CSS et JavaScript essentiels pour débuter en développement web',
      niveau: 'débutant',
      prix: 0,
      domaine: 'Développement Web',
      ordre: 1,
      parcoursId: p1.id,
    },
  });

  const f2 = await prisma.formation.create({
    data: {
      titre: 'React Avancé',
      description: 'Maîtriser React et ses patterns avancés pour construire des SPAs modernes',
      niveau: 'intermédiaire',
      prix: 0,
      domaine: 'Développement Web',
      ordre: 2,
      parcoursId: p1.id,
    },
  });

  // Pour les autres parcours - créer au moins 1 formation par parcours
  for (let i = 1; i < parcours.length; i++) {
    const formationTitles = [
      'Fondamentaux et Bases',
      'Niveau Intermédiaire',
      'Niveau Avancé',
    ];

    for (let j = 0; j < 2; j++) {
      await prisma.formation.create({
        data: {
          titre: parcoursData[i].titre + ' - ' + formationTitles[j % formationTitles.length],
          description: 'Apprenez les fondamentaux de ' + parcoursData[i].titre.toLowerCase(),
          niveau: j === 0 ? 'débutant' : j === 1 ? 'intermédiaire' : 'avancé',
          prix: 0,
          domaine: parcoursData[i].titre,
          ordre: j + 1,
          parcoursId: parcours[i].id,
        },
      });
    }
  }

  console.log('📖 Création des modules pour la formation détaillée...');
  const m1 = await prisma.module.create({
    data: {
      formationId: f1.id,
      numero: 1,
      titre: 'HTML & CSS Fondamentaux',
      description: 'Les bases du HTML5 et du CSS3 modernes',
      duree: 40,
      heuresParSemaine: 8,
      langages: ['HTML', 'CSS'],
      competences: ['Structurer une page web', 'Styliser avec CSS', 'Responsive Design'],
      livrables: ['Page web responsive', 'Portfolio personnel'],
      couleur: '#FF6B9D',
      icone: '',
    },
  });

  const m2 = await prisma.module.create({
    data: {
      formationId: f1.id,
      numero: 2,
      titre: 'JavaScript Essentiels',
      description: 'Programmation JavaScript pour l\'interactivité web',
      duree: 60,
      heuresParSemaine: 10,
      langages: ['JavaScript'],
      competences: ['Programmer en JS', 'Manipuler le DOM', 'Async/Await'],
      livrables: ['Script interactif', 'Mini-projet JS'],
      couleur: '#FFD93D',
      icone: '',
    },
  });

  console.log('Création des cours et leçons...');
  const c1 = await prisma.cours.create({
    data: {
      moduleId: m1.id,
      titre: 'Introduction au HTML',
      description: 'Les premières bases du HTML5',
      ordre: 1,
    },
  });

  const c2 = await prisma.cours.create({
    data: {
      moduleId: m1.id,
      titre: 'Styliser avec CSS',
      description: 'Flexbox, Grid et animations CSS',
      ordre: 2,
    },
  });

  const l1 = await prisma.lecon.create({
    data: {
      coursId: c1.id,
      titre: 'Les balises HTML essentielles',
      description: 'Découvrir les balises HTML principales',
      type: 'théorie',
      ordre: 1,
      dureeMinutes: 15,
      contenuTexte: 'Les balises HTML structurent le contenu d\'une page web. Les balises principales incluent h1 à h6, p, div, span, etc.',
    },
  });

  await prisma.video.create({
    data: {
      leconId: l1.id,
      titre: 'Tutoriel HTML basique',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      type: 'embed',
    },
  });

  await prisma.pieceJointe.create({
    data: {
      leconId: l1.id,
      nom: 'Guide des balises HTML',
      url: '/uploads/lecons/html-guide.pdf',
      type: 'pdf',
      taille: 1024000,
    },
  });

  const l2 = await prisma.lecon.create({
    data: {
      coursId: c1.id,
      titre: 'Créer ma première page',
      description: 'Pratiquer avec HTML',
      type: 'pratique',
      ordre: 2,
      dureeMinutes: 30,
      contenuTexte: 'Créez une page web simple en utilisant les balises HTML que vous avez apprises.',
    },
  });

  const l3 = await prisma.lecon.create({
    data: {
      coursId: c2.id,
      titre: 'Flexbox en profondeur',
      description: 'Maîtriser Flexbox pour les layouts',
      type: 'théorie',
      ordre: 1,
      dureeMinutes: 20,
      contenuTexte: 'Flexbox permet de créer des layouts flexibles et responsives facilement.',
    },
  });

  console.log('❓ Création des quiz...');
  const q1 = await prisma.coursQuiz.create({
    data: {
      coursId: c1.id,
      titre: 'Quiz HTML Basique',
      description: 'Testez vos connaissances en HTML',
    },
  });

  await prisma.coursQuizQuestion.create({
    data: {
      quizId: q1.id,
      question: 'Quel est le rôle de la balise div?',
      options: ['Créer une division', 'Créer une vidéo', 'Créer une liste', 'Créer un lien'],
      reponse: 0,
      ordre: 1,
    },
  });

  await prisma.coursQuizQuestion.create({
    data: {
      quizId: q1.id,
      question: 'Quelle balise est correcte pour un titre principal?',
      options: ['title', 'h1', 'header', 'heading'],
      reponse: 1,
      ordre: 2,
    },
  });

  console.log('❓ Quiz final de la formation (seuil 85%)...');
  const questionsQuizFinal = [
    { question: 'Que signifie HTML ?', options: ['HyperText Markup Language', 'HighText Machine Language', 'Hyperlink Text Mode Language', 'Home Tool Markup Language'], reponse: 0 },
    { question: 'Quelle propriété CSS change la couleur du texte ?', options: ['background', 'color', 'font-style', 'text-fill'], reponse: 1 },
    { question: 'Quelle balise crée un lien hypertexte ?', options: ['<link>', '<href>', '<a>', '<url>'], reponse: 2 },
    { question: 'Comment déclare-t-on une variable en JavaScript moderne ?', options: ['variable x = 1', 'let x = 1', 'dim x = 1', 'x := 1'], reponse: 1 },
  ];
  for (let i = 0; i < questionsQuizFinal.length; i++) {
    await prisma.formationQuiz.create({
      data: { formationId: f1.id, ...questionsQuizFinal[i], ordre: i + 1 },
    });
  }

  console.log('🏆 Quiz final du parcours (100% requis)...');
  const questionsQuizParcours = [
    { question: 'Quel langage structure le contenu d\'une page web ?', options: ['CSS', 'HTML', 'Python', 'SQL'], reponse: 1 },
    { question: 'Quel outil permet de versionner son code ?', options: ['Git', 'Excel', 'Photoshop', 'Figma'], reponse: 0 },
    { question: 'React est...', options: ['Un langage', 'Une base de données', 'Une bibliothèque JavaScript', 'Un serveur web'], reponse: 2 },
  ];
  for (let i = 0; i < questionsQuizParcours.length; i++) {
    await prisma.parcoursQuiz.create({
      data: { parcoursId: p1.id, ...questionsQuizParcours[i], ordre: i + 1 },
    });
  }

  console.log('🎯 Inscription de Marie au parcours Développement Web...');
  await prisma.userParcours.create({
    data: { userId: user.id, parcoursId: p1.id },
  });

  console.log('📊 Enregistrement des progressions...');
  await prisma.progressionLecon.create({
    data: {
      userId: user.id,
      leconId: l1.id,
      completee: true,
      dateCompletee: new Date(),
      tempsPasseMinutes: 15,
    },
  });

  await prisma.progressionFormation.create({
    data: {
      userId: user.id,
      formationId: f1.id,
      pourcentage: 33,
    },
  });

  console.log('✅ Seeding complété!');
  console.log(`
  8 parcours créés ✓
  16 formations créées ✓
  Quiz et leçons prêts ✓
  `);
}

seed()
  .catch(e => {
    console.error('Erreur:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
