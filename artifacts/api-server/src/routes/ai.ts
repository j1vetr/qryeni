import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { db } from "../lib/db";
import { settingsTable } from "@workspace/db/schema";

const router = Router();

router.post("/ai/generate", requireAuth, async (req, res): Promise<void> => {
  const { productName, category, languages } = req.body as {
    productName: string;
    category?: string;
    languages?: string[];
  };

  const [settings] = await db.select().from(settingsTable).limit(1);
  const apiKey = settings?.openAiKey || process.env.OPENAI_API_KEY;

  if (!apiKey) {
    res.status(400).json({ error: "OpenAI API key not configured in settings" });
    return;
  }

  const targetLangs = languages?.length ? languages : ["tr", "en", "ru", "ar"];
  const langNames: Record<string, string> = {
    tr: "Turkish",
    en: "English",
    ru: "Russian",
    ar: "Arabic",
  };

  const prompt = `You are a professional restaurant menu copywriter and nutritionist.
Generate complete menu content for the following dish:
Product: "${productName}"${category ? `\nCategory: "${category}"` : ""}

Respond ONLY with a valid JSON object matching this exact shape:
{
  "allergens": ["string"],
  "nutritionFacts": { "energy": number, "protein": number, "carbs": number, "fat": number },
  "calories": number,
  "translations": {
    ${targetLangs.map((l) => `"${l}": { "name": "...", "description": "...", "ingredients": "...", "allergenNote": "...", "specialNote": "..." }`).join(",\n    ")}
  }
}

Rules:
- allergens: array of common allergen names present (e.g. ["gluten", "milk", "eggs"])
- nutritionFacts: per serving — energy in kcal, protein/carbs/fat in grams
- calories: total kcal (same as nutritionFacts.energy)
- translations[lang].name: dish name in that language, concise and appealing
- translations[lang].description: sensory description under 60 words
- translations[lang].ingredients: comma-separated list of main ingredients in that language
- translations[lang].allergenNote: allergen warning sentence in that language (empty string if none)
- translations[lang].specialNote: chef recommendation or serving suggestion in that language (can be empty string)
- Languages to generate: ${targetLangs.map((l) => `${l} (${langNames[l] ?? l})`).join(", ")}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: "OpenAI error", detail: err });
      return;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "AI generation failed", detail: String(err) });
  }
});

export default router;
