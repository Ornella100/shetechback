// Appel à l'API Google Gemini native (utilise le quota gratuit via GEMINI_API_KEY)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.6-flash';
const ERREURS_TEMPORAIRES = new Set([408, 429, 500, 503]);

const attendre = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function messageErreurGeminiPourAdmin(error) {
  if (error?.status === 503 || error?.status === 500 || error?.status === 408)
    return 'Le service de génération est momentanément très sollicité. Réessayez dans quelques minutes.';
  if (error?.status === 429)
    return 'La limite de demandes Gemini est momentanément atteinte. Veuillez réessayer plus tard.';
  if (error?.status === 401 || error?.status === 403)
    return 'La connexion au service Gemini a échoué. Vérifiez la clé API configurée sur Render.';
  if (error?.status === 404)
    return 'Le modèle Gemini configuré est indisponible. Vérifiez GEMINI_MODEL dans Render.';
  return 'Le quiz n’a pas pu être généré pour le moment. Vérifiez la configuration Gemini puis réessayez.';
}

async function appelerModele(model, apiKey, prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  for (let tentative = 0; tentative < 2; tentative++) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, responseMimeType: 'application/json' },
        }),
      });
      const raw = await response.text();
      if (response.ok) return JSON.parse(raw);

      const error = new Error(`Erreur Gemini API (${response.status}): ${raw.substring(0, 300)}`);
      error.status = response.status;
      if (!ERREURS_TEMPORAIRES.has(response.status) || tentative === 1) throw error;
    } catch (error) {
      if (!ERREURS_TEMPORAIRES.has(error.status) || tentative === 1) throw error;
    }
    await attendre(900 + tentative * 900 + Math.floor(Math.random() * 300));
  }
}

/**
 * Génère un QCM en français à partir d'un contenu pédagogique.
 * @returns {Promise<Array>} tableau de questions { question, option_a..d, reponse_correcte, explication }
 */
export async function genererQuestionsQuiz({ titre, contenu, nbQuestions = 5 }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY manquante dans le .env');

  const prompt = `Tu es un expert pédagogique. Génère exactement ${nbQuestions} questions QCM en français qui évaluent la maîtrise globale de la formation intitulée "${titre}".

CONTENU DE LA FORMATION :
${contenu}

RÈGLES :
- Chaque question a exactement 4 options (A, B, C, D)
- Une seule bonne réponse par question, indiquée en minuscule ("a", "b", "c" ou "d")
- Les questions doivent couvrir l'ensemble des modules, pas un seul
- Réponds UNIQUEMENT avec un tableau JSON valide (aucun markdown, aucun texte autour)

FORMAT JSON attendu :
[
  {
    "question": "Texte de la question ?",
    "option_a": "Option A",
    "option_b": "Option B",
    "option_c": "Option C",
    "option_d": "Option D",
    "reponse_correcte": "a",
    "explication": "Pourquoi cette réponse est correcte"
  }
]`;

  let data;
  try {
    data = await appelerModele(GEMINI_MODEL, apiKey, prompt);
  } catch (error) {
    if (!ERREURS_TEMPORAIRES.has(error.status) || GEMINI_FALLBACK_MODEL === GEMINI_MODEL) throw error;
    data = await appelerModele(GEMINI_FALLBACK_MODEL, apiKey, prompt);
  }
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) {
    const reason = data.candidates?.[0]?.finishReason || data.promptFeedback?.blockReason;
    throw new Error(`Gemini n'a retourné aucun contenu${reason ? ` (${reason})` : ''}.`);
  }

  const clean = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const questions = JSON.parse(clean);
  if (!Array.isArray(questions) || questions.length === 0) {
    throw new Error("Format de réponse invalide de l'IA.");
  }
  return questions;
}
