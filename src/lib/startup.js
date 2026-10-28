import bcrypt from 'bcrypt';
import prisma from './prisma.js';

export async function createDefaultAdmin() {
  try {
    const email = (process.env.ADMIN_EMAIL || 'admin@shetech.com').trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || 'Admin123!';
    const existing = await prisma.user.findUnique({ where: { email } });
    const motDePasse = await bcrypt.hash(password, 10);
    if (existing) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'admin', motDePasse },
      });
      console.log(`Compte admin configuré : ${email}`);
      return;
    }
    await prisma.user.create({
      data: { nom: 'Admin SheTech', email, motDePasse, role: 'admin' },
    });
    console.log(`Compte admin créé : ${email}`);
  } catch (err) {
    console.error('Erreur création admin:', err);
  }
}
