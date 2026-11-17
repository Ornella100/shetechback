import bcrypt from 'bcrypt';
import prisma from './prisma.js';

export async function createDefaultAdmin() {
  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const email = (process.env.ADMIN_EMAIL || (isProduction ? '' : 'admin@shetech.com')).trim().toLowerCase();
    const password = process.env.ADMIN_PASSWORD || (isProduction ? '' : 'Admin123!');
    if (!email || !password) {
      throw new Error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être configurés avant le démarrage.');
    }
    if (isProduction && (password.length < 12 || password === 'Admin123!')) {
      throw new Error('ADMIN_PASSWORD doit contenir au moins 12 caractères en production.');
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role !== 'admin') {
        throw new Error(`L'adresse ADMIN_EMAIL (${email}) appartient à un compte qui n'est pas administrateur.`);
      }
      console.log(`Compte admin existant vérifié : ${email}`);
      return;
    }

    const motDePasse = await bcrypt.hash(password, 10);
    await prisma.user.create({
      data: { nom: 'Admin SheTech', email, motDePasse, role: 'admin', niveau: null },
    });
    console.log(`Compte admin créé : ${email}`);
  } catch (err) {
    console.error('Erreur création admin:', err);
  }
}
