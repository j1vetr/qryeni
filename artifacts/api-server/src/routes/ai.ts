import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { db } from "../lib/db";
import { settingsTable, aiGenerationLogsTable } from "@workspace/db/schema";
import { randomUUID } from "crypto";

const router = Router();

const PRODUCT_PROMPTS: { keywords: string[]; style: string }[] = [
  {
    keywords: ["çorba", "soup", "mercimek", "domates", "kremalı", "bulyon"],
    style: "steam rising naturally from a ceramic bowl, rustic wooden surface, fresh herb garnish floating on top, natural side lighting with soft bokeh",
  },
  {
    keywords: ["tatlı", "dessert", "pasta", "kek", "brownie", "cheesecake", "dondurma", "baklava", "pudding", "mousse", "tiramisu"],
    style: "elegant plating on a dark matte plate, caramel drizzle and berry accent, warm golden rim lighting, shallow depth of field",
  },
  {
    keywords: ["içecek", "drink", "kokteyl", "cocktail", "kahve", "coffee", "çay", "tea", "ayran", "şarap", "wine", "bira", "beer", "juice", "meyve suyu"],
    style: "in an elegant crystal or ceramic vessel, condensation droplets catching the light, garnish of citrus or fresh herbs, moody dark bar background with bokeh",
  },
  {
    keywords: ["salata", "salad", "yeşillik", "roka", "marul"],
    style: "overhead shot on a white linen surface, vibrant colorful fresh vegetables, drops of olive oil glistening, bright airy natural lighting",
  },
  {
    keywords: ["pizza", "pide", "lahmacun"],
    style: "overhead flat lay on dark wooden board, pulled cheese stretch visible, fresh basil on top, Italian restaurant atmosphere lighting",
  },
  {
    keywords: ["burger", "sandviç", "sandwich", "wrap"],
    style: "45-degree angle hero shot, perfectly layered cross-section visible, sesame seeds catching the light, dark background with dramatic spotlight",
  },
];

const VARIATIONS = [
  "natural window light from the left",
  "soft diffused natural light from above",
  "warm golden hour side lighting",
  "cool studio lighting with subtle rim light",
  "candlelit warm atmospheric light",
];

const BACKGROUNDS = [
  "dark slate stone surface",
  "aged oak wooden board",
  "brushed concrete countertop",
  "black marble with subtle veining",
  "charcoal linen tablecloth",
];

function buildImagePrompt(productName: string, category?: string, notes?: string): string {
  const combined = `${productName} ${category ?? ""} ${notes ?? ""}`.toLowerCase();
  let style = "overhead shot on dark slate plate, perfectly plated with microgreens garnish, shallow depth of field, restaurant quality presentation";
  for (const { keywords, style: s } of PRODUCT_PROMPTS) {
    if (keywords.some((kw) => combined.includes(kw))) { style = s; break; }
  }
  const variation = VARIATIONS[Math.floor(Math.random() * VARIATIONS.length)];
  const bg = BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)];
  return `Professional food photography of "${productName}", ${style}, ${variation}, ${bg}, ultra realistic, 8K quality, Turkish cuisine aesthetics, no text, no watermark, food only`;
}

/**
 * POST /ai/generate-image
 * Returns { b64: string, prompt: string } — raw JPEG base64 from OpenAI.
 * The client is responsible for canvas-based compression and upload so that
 * the same optimization pipeline is applied for both manual and AI images.
 */
router.post("/ai/generate-image", requireAuth, async (req, res): Promise<void> => {
  const { productName, productId, category, notes } = req.body as {
    productName?: string;
    productId?: number;
    category?: string;
    notes?: string;
  };

  if (!productName) { res.status(400).json({ error: "Ürün adı gerekli" }); return; }

  const [settings] = await db.select().from(settingsTable).limit(1);
  const apiKey = settings?.openAiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(400).json({ error: "OpenAI API anahtarı ayarlarda yapılandırılmamış" }); return; }

  const prompt = buildImagePrompt(productName, category, notes);
  let success = false;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1024x1024",
        output_format: "jpeg",
        output_compression: 90,
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!response.ok) {
      const errText = await response.text();
      await db.insert(aiGenerationLogsTable).values({
        productId: productId ?? null, productName, model: "gpt-image-1",
        success: false, errorMessage: `OpenAI HTTP ${response.status}: ${errText.slice(0, 500)}`,
      });
      res.status(502).json({ error: "Görsel üretilemedi. OpenAI API hatası.", detail: errText.slice(0, 200) });
      return;
    }

    const data = await response.json() as { data?: Array<{ b64_json?: string }> };
    const b64 = data.data?.[0]?.b64_json;
    if (!b64) { res.status(502).json({ error: "OpenAI görsel verisi boş döndü" }); return; }

    success = true;
    const uuid = randomUUID();

    await db.insert(aiGenerationLogsTable).values({
      productId: productId ?? null, productName, model: "gpt-image-1", success: true,
    });

    res.json({ b64, prompt, uuid });
  } catch (err) {
    if (!success) {
      await db.insert(aiGenerationLogsTable).values({
        productId: productId ?? null, productName, model: "gpt-image-1",
        success: false, errorMessage: String(err).slice(0, 500),
      }).catch(() => {});
    }
    res.status(500).json({ error: "Görsel üretimi başarısız oldu", detail: String(err).slice(0, 200) });
  }
});

router.post("/ai/generate", requireAuth, async (req, res): Promise<void> => {
  const { productName, productId, category, languages } = req.body as {
    productName: string;
    productId?: number;
    category?: string;
    languages?: string[];
  };

  const [settings] = await db.select().from(settingsTable).limit(1);
  const apiKey = settings?.openAiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(400).json({ error: "OpenAI API key not configured in settings" }); return; }

  const targetLangs = languages?.length ? languages : ["tr", "en", "ru", "ar"];
  const langNames: Record<string, string> = { tr: "Turkish", en: "English", ru: "Russian", ar: "Arabic" };

  const prompt = `You are a professional restaurant menu copywriter and nutritionist for an upscale Turkish restaurant.
Generate complete menu content for the following dish:
Product: "${productName}"${category ? `\nCategory: "${category}"` : ""}

Respond ONLY with a valid JSON object matching this exact shape:
{
  "allergens": ["string"],
  "nutritionFacts": { "energy": number, "protein": number, "carbs": number, "fat": number },
  "calories": number,
  "translations": {
    ${targetLangs.map((l) => `"${l}": { "name": "...", "description": "...", "ingredients": "...", "allergenNote": "..." }`).join(",\n    ")}
  }
}

Rules:
- allergens: array using ONLY these exact Turkish lowercase names when applicable: gluten, süt, yumurta, balık, kabuklu, fındık, yer fıstığı, soya, kereviz, hardal, susam
- nutritionFacts: per serving — energy in kcal, protein/carbs/fat in grams (realistic for a restaurant portion)
- calories: total kcal (same as nutritionFacts.energy)
- translations[lang].name: dish name in that language, concise and appealing
- translations[lang].description: sensory and appetizing description, max 60 words, start with uppercase
- translations[lang].ingredients: comma-separated list of main ingredients in that language
- translations[lang].allergenNote: allergen warning sentence in that language (empty string if no allergens)
- Languages to generate: ${targetLangs.map((l) => `${l} (${langNames[l] ?? l})`).join(", ")}`;

  let tokensUsed: number | undefined;
  let success = false;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      await db.insert(aiGenerationLogsTable).values({
        productId: productId ?? null, productName, model: "gpt-4o-mini",
        success: false, errorMessage: `OpenAI HTTP ${response.status}: ${err.slice(0, 500)}`,
      });
      res.status(502).json({ error: "OpenAI error", detail: err });
      return;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; usage?: { total_tokens?: number } };
    tokensUsed = data.usage?.total_tokens;
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);
    success = true;

    await db.insert(aiGenerationLogsTable).values({
      productId: productId ?? null, productName, model: "gpt-4o-mini", tokensUsed, success: true,
    });

    res.json(parsed);
  } catch (err) {
    if (!success) {
      await db.insert(aiGenerationLogsTable).values({
        productId: productId ?? null, productName, model: "gpt-4o-mini",
        success: false, errorMessage: String(err).slice(0, 500),
      }).catch(() => {});
    }
    res.status(500).json({ error: "AI generation failed", detail: String(err) });
  }
});

export default router;
