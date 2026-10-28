import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Catalogue initial du projet. Ce script est réexécutable : il ne supprime
// aucune donnée et ne modifie pas les formations déjà créées par l'admin.
const PARCOURS = [
  { titre: 'Développement Web', description: 'HTML, CSS, JavaScript, React, Python — construis des sites et applications web de A à Z.' },
  { titre: 'Intelligence Artificielle & Data', description: 'Machine Learning, Deep Learning, data science — maîtrise les technologies du futur.' },
  { titre: 'Marketing Digital', description: 'Réseaux sociaux, SEO, publicité en ligne — développe ta présence digitale.' },
  { titre: 'E-commerce', description: 'Crée ta boutique en ligne, gère tes ventes et développe ton business.' },
  { titre: 'Leadership & Business', description: 'Management, gestion de projet, communication — deviens une leader accomplie.' },
  { titre: 'Freelance & Entrepreneuriat', description: 'Lance ton activité, trouve tes clients, fixe tes tarifs — travaille à ton compte.' },
  { titre: 'Design UI/UX', description: 'Figma, Canva, design thinking — crée des interfaces belles et intuitives.' },
  { titre: 'Cybersécurité', description: 'Protège les données, comprends les menaces — un secteur qui recrute massivement.' },
];

const FORMATIONS = [
  [
    { titre: 'Fondamentaux du Web', description: 'HTML, CSS et JavaScript essentiels pour débuter en développement web', niveau: 'débutant' },
    { titre: 'React Avancé', description: 'Maîtriser React et ses patterns avancés pour construire des SPAs modernes', niveau: 'intermédiaire' },
  ],
  ...PARCOURS.slice(1).map((parcours) => [
    { titre: `${parcours.titre} - Fondamentaux et Bases`, description: `Apprenez les fondamentaux de ${parcours.titre.toLowerCase()}`, niveau: 'débutant' },
    { titre: `${parcours.titre} - Niveau Intermédiaire`, description: `Approfondissez vos compétences en ${parcours.titre.toLowerCase()}`, niveau: 'intermédiaire' },
  ]),
];

async function ensureFormation(parcours, data, ordre) {
  const existing = await prisma.formation.findFirst({ where: { titre: data.titre } });
  if (existing) {
    // Relie au parcours initial uniquement si la formation n'est pas déjà liée.
    if (!existing.parcoursId) {
      await prisma.formation.update({ where: { id: existing.id }, data: { parcoursId: parcours.id } });
    }
    return existing;
  }

  return prisma.formation.create({
    data: {
      ...data,
      parcoursId: parcours.id,
      domaine: parcours.titre,
      prix: 0,
      ordre,
    },
  });
}

async function ensureCourseContent(formation) {
  // Le contenu détaillé déjà présent dans le seed historique concerne ce cours.
  // On le restaure sans la vidéo de démonstration ni les fichiers fictifs.
  const moduleData = [
    {
      numero: 1,
      titre: 'HTML & CSS Fondamentaux',
      description: 'Les bases du HTML5 et du CSS3 modernes',
      duree: 40,
      heuresParSemaine: 8,
      langages: ['HTML', 'CSS'],
      competences: ['Structurer une page web', 'Styliser avec CSS', 'Responsive Design'],
      livrables: ['Page web responsive', 'Portfolio personnel'],
      couleur: '#FF6B9D',
      icone: '📚',
      cours: [
        {
          titre: 'Introduction au HTML', description: 'Les premières bases du HTML5', ordre: 1,
          lecons: [
            { titre: 'Les balises HTML essentielles', description: 'Découvrir les balises HTML principales', type: 'théorie', ordre: 1, dureeMinutes: 15, contenuTexte: "Les balises HTML structurent le contenu d'une page web. Les balises principales incluent h1 à h6, p, div, span, etc." },
            { titre: 'Créer ma première page', description: 'Pratiquer avec HTML', type: 'pratique', ordre: 2, dureeMinutes: 30, contenuTexte: 'Créez une page web simple en utilisant les balises HTML que vous avez apprises.' },
          ],
        },
        {
          titre: 'Styliser avec CSS', description: 'Flexbox, Grid et animations CSS', ordre: 2,
          lecons: [
            { titre: 'Flexbox en profondeur', description: 'Maîtriser Flexbox pour les layouts', type: 'théorie', ordre: 1, dureeMinutes: 20, contenuTexte: 'Flexbox permet de créer des layouts flexibles et responsives facilement.' },
          ],
        },
      ],
    },
    {
      numero: 2,
      titre: 'JavaScript Essentiels',
      description: "Programmation JavaScript pour l'interactivité web",
      duree: 60,
      heuresParSemaine: 10,
      langages: ['JavaScript'],
      competences: ['Programmer en JS', 'Manipuler le DOM', 'Async/Await'],
      livrables: ['Script interactif', 'Mini-projet JS'],
      couleur: '#FFD93D',
      icone: '💻',
      cours: [],
    },
  ];

  for (const item of moduleData) {
    let module = await prisma.module.findFirst({
      where: { formationId: formation.id, titre: item.titre },
    });
    if (!module) {
      module = await prisma.module.create({
        data: {
          formationId: formation.id,
          numero: item.numero,
          titre: item.titre,
          description: item.description,
          duree: item.duree,
          heuresParSemaine: item.heuresParSemaine,
          langages: item.langages,
          competences: item.competences,
          livrables: item.livrables,
          couleur: item.couleur,
          icone: item.icone,
        },
      });
    }

    for (const coursData of item.cours) {
      let cours = await prisma.cours.findFirst({ where: { moduleId: module.id, titre: coursData.titre } });
      if (!cours) {
        cours = await prisma.cours.create({
          data: {
            moduleId: module.id,
            titre: coursData.titre,
            description: coursData.description,
            ordre: coursData.ordre,
          },
        });
      }
      for (const leconData of coursData.lecons) {
        const lecon = await prisma.lecon.findFirst({ where: { coursId: cours.id, titre: leconData.titre } });
        if (!lecon) await prisma.lecon.create({ data: { coursId: cours.id, ...leconData } });
      }
    }
  }
}

async function main() {
  console.log('Initialisation non destructive du catalogue SheTech...');
  let parcoursCrees = 0;
  let formationsCreees = 0;

  for (let index = 0; index < PARCOURS.length; index += 1) {
    const data = PARCOURS[index];
    let parcours = await prisma.parcours.findFirst({ where: { titre: data.titre } });
    if (!parcours) {
      parcours = await prisma.parcours.create({ data: { ...data, ordre: index + 1 } });
      parcoursCrees += 1;
    }

    const definitions = FORMATIONS[index];
    for (let courseIndex = 0; courseIndex < definitions.length; courseIndex += 1) {
      const before = await prisma.formation.findFirst({ where: { titre: definitions[courseIndex].titre } });
      const formation = await ensureFormation(parcours, definitions[courseIndex], courseIndex + 1);
      if (!before) formationsCreees += 1;
      if (data.titre === 'Développement Web' && definitions[courseIndex].titre === 'Fondamentaux du Web') {
        await ensureCourseContent(formation);
      }
    }
  }

  console.log(`Catalogue prêt : ${parcoursCrees} parcours et ${formationsCreees} formations ajoutés.`);
}

main()
  .catch((error) => {
    console.error('Erreur pendant le chargement du catalogue :', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
