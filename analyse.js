const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `Tu es un expert en electricite industrielle et batiment (armoires electriques, cablage, rails DIN).
On te donne une photo d'une armoire electrique, d'un cablage ou d'une installation.

Analyse l'image et identifie :
1. Les materiaux visibles (type de cable, isolant, borniers, disjoncteurs, contacteurs, etc.)
2. Les cables : type, section approximative (mm2), couleur si visible
3. Les rails DIN : largeur/dimension si identifiable (ex: 35mm)
4. Les reperes de bornier visibles sur les etiquettes (ex: X1-3, X2-1, etc.) et, si les numeros de fils amont/aval sont visibles ou inscrits (etiquettes de fils, dominos, reperes de cablage), indique-les.

Reponds UNIQUEMENT en JSON valide, sans texte autour, avec cette structure exacte :
{
  "materiaux": ["liste des materiaux/composants identifies"],
  "cables": [{"type": "...", "section_mm2": "...", "couleur": "..."}],
  "rails": [{"dimension_mm": "...", "description": "..."}],
  "reperages": [{"repere": "X1-3", "fil_amont": "23", "fil_aval": "23"}],
  "notes": "remarques generales, incertitudes, ou elements pas clairement visibles"
}

Si une information n'est pas visible ou incertaine, indique "non visible" ou laisse un champ vide plutot que d'inventer.`;

async function analyserPhoto(filePath, mimeType) {
  const imageBuffer = fs.readFileSync(filePath);
  const base64Image = imageBuffer.toString('base64');

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 2000,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: mimeType,
              data: base64Image,
            },
          },
          {
            type: 'text',
            text: 'Analyse cette photo d\'installation electrique selon les instructions.',
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((c) => c.type === 'text');
  let raw = textBlock ? textBlock.text : '{}';

  // Nettoyage au cas ou le modele ajoute des balises markdown
  raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error('Erreur de parsing JSON:', err, raw);
    return {
      materiaux: [],
      cables: [],
      rails: [],
      reperages: [],
      notes: 'Erreur lors de l\'analyse automatique. Merci de completer manuellement.',
    };
  }
}

module.exports = { analyserPhoto };
