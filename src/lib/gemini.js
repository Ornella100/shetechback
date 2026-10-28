// Appel à l'API Google Gemini native (utilise le quota gratuit via GEMINI_API_KEY)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    }),
  });

  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`Erreur Gemini API (${response.status}): ${raw.substring(0, 300)}`);
  }

  const data = JSON.parse(raw);
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
