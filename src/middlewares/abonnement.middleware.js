import { getStatutAcces } from '../lib/abonnement.js';

// À placer APRÈS verifierToken. Bloque le contenu des formations (leçons, quiz)
// quand aucun achat du pack de trois parcours n'est enregistré.
// La navigation (listes, détails) reste ouverte : le front affiche une invitation à s'abonner.
export const verifierAbonnement = async (req, res, next) => {
  try {
    const statut = await getStatutAcces(req.user.id);
    if (!statut.acces) {
      return res.status(402).json({
        code: 'ACHAT_REQUIS',
        message: 'Achetez le pack SheTech à 150 000 FCFA pour suivre jusqu’à trois parcours.',
      });
    }
    req.acces = statut;
    next();
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
