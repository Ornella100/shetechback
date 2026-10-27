import { getStatutAcces } from '../lib/abonnement.js';

// À placer APRÈS verifierToken. Bloque le contenu des formations (leçons, quiz)
// quand l'essai gratuit est terminé et qu'aucun abonnement actif n'existe.
// La navigation (listes, détails) reste ouverte : le front affiche une invitation à s'abonner.
export const verifierAbonnement = async (req, res, next) => {
  try {
    const statut = await getStatutAcces(req.user.id);
    if (!statut.acces) {
      return res.status(402).json({
        code: 'ABONNEMENT_REQUIS',
        message: 'Votre période d\'essai gratuite est terminée. Abonnez-vous pour continuer à suivre les formations.',
      });
    }
    req.acces = statut;
    next();
  } catch {
    res.status(500).json({ message: 'Erreur serveur' });
  }
};
