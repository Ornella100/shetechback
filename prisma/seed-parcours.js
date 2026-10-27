import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Parcours de référence (repris de l'ancienne liste DOMAINES du frontend).
// `match` sert à rattacher automatiquement les formations existantes (par domaine/titre).
const PARCOURS = [
  { titre: 'Développement Web', ordre: 1, match: ['developpement', 'web', 'html', 'javascript', 'react'],
    description: 'HTML, CSS, JavaScript, React, Python — construis des sites et applications web de A à Z.' },
  { titre: 'Intelligence Artificielle & Data', ordre: 2, match: ['intelligence', 'ia', 'data', 'python', 'machine'],
    description: 'Machine Learning, Deep Learning, data science — maîtrise les technologies du futur.' },
  { titre: 'Marketing Digital', ordre: 3, match: ['marketing', 'seo', 'reseaux'],
    description: 'Réseaux sociaux, SEO, publicité en ligne — développe ta présence digitale.' },
  { titre: 'E-commerce', ordre: 4, match: ['ecommerce', 'commerce', 'boutique', 'vente'],
    description: 'Crée ta boutique en ligne, gère tes ventes et développe ton business.' },
  { titre: 'Leadership & Business', ordre: 5, match: ['leadership', 'business', 'management', 'gestion'],
    description: 'Management, gestion de projet, communication — deviens une leader accomplie.' },
  { titre: 'Freelance & Entrepreneuriat', ordre: 6, match: ['freelance', 'entrepreneur', 'entrepreneuriat'],
    description: 'Lance ton activité, trouve tes clients, fixe tes tarifs — travaille à ton compte.' },
  { titre: 'Design UI/UX', ordre: 7, match: ['design', 'figma', 'ux', 'ui'],
    description: 'Figma, Canva, design thinking — crée des interfaces belles et intuitives.' },
  { titre: 'Cybersécurité', ordre: 8, match: ['cyber', 'securite', 'sécurité'],
    description: 'Protège les données, comprends les menaces — un secteur qui recrute massivement.' },
];

async function main() {
  console.log('🌱 Seed parcours (idempotent)...');
  const matchers = [];

  for (const p of PARCOURS) {
    let existing = await prisma.parcours.findFirst({ where: { titre: p.titre } });
    if (!existing) {
      existing = await prisma.parcours.create({
        data: { titre: p.titre, description: p.description, ordre: p.ordre },
      });
      console.log(`  + créé : ${p.titre}`);
    } else {
      await prisma.parcours.update({
        where: { id: existing.id },
        data: { description: p.description, ordre: p.ordre },
      });
      console.log(`  ~ existant : ${p.titre}`);
    }
    matchers.push({ id: existing.id, match: p.match });
  }

  // Rattache chaque formation encore sans parcours au premier parcours correspondant.
  const formations = await prisma.formation.findMany();
  let liees = 0;
  for (const f of formations) {
    if (f.parcoursId) continue;
    const hay = `${f.domaine} ${f.titre}`.toLowerCase();
    const cible = matchers.find((m) => m.match.some((k) => hay.includes(k)));
    if (cible) {
      await prisma.formation.update({ where: { id: f.id }, data: { parcoursId: cible.id } });
      liees++;
    }
  }
  console.log(`✅ ${PARCOURS.length} parcours prêts, ${liees} formation(s) rattachée(s).`);
}

main()
  .catch((e) => { console.error('❌ Erreur seed parcours:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
