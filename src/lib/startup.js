import bcrypt from 'bcrypt';
import prisma from './prisma.js';

export async function createDefaultAdmin() {
  try {
    const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
    if (!existing) {
      const hash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
      await prisma.user.create({
        data: {
          nom: 'Admin SheTech',
          email: process.env.ADMIN_EMAIL || 'admin@shetech.com',
          motDePasse: hash,
          role: 'admin',
        },
      });
      console.log(`Compte admin créé : ${process.env.ADMIN_EMAIL || 'admin@shetech.com'}`);
    } else {
      console.log('Compte admin existant trouvé.');
    }
  } catch (err) {
    console.error('Erreur création admin:', err);
  }
}
