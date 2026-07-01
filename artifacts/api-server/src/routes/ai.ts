import { Router } from "express";
import { requireAuth } from "../lib/auth";
import { db } from "../lib/db";
import { settingsTable, aiGenerationLogsTable } from "@workspace/db/schema";
import { randomUUID } from "crypto";

const router = Router();

/* ─── Image style definitions ──────────────────────────────────── */
type ImageStyle = "restaurant" | "professional" | "rustic" | "minimal" | "outdoor";

interface StyleDef {
  surface: string;
  light: string;
  mood: string;
  angle: string;
}

const STYLE_DEFS: Record<ImageStyle, StyleDef> = {
  restaurant: {
    surface: "casual restaurant table, slightly worn wooden surface, simple ceramic plate",
    light: "warm ambient restaurant lighting, soft overhead glow, natural and inviting shadows",
    mood: "authentic everyday restaurant feel, unpretentious, appetizing and real, like a candid photo taken at the table",
    angle: "slight 30-degree angle, relaxed composition",
  },
  professional: {
    surface: "dark polished slate or black marble surface, elegant matte plate",
    light: "dramatic directional side lighting with subtle rim highlight, shallow depth of field",
    mood: "fine dining presentation, artful plating with microgreens and sauce dots, upscale restaurant quality",
    angle: "classic 45-degree hero angle",
  },
  rustic: {
    surface: "aged oak wooden board, rough linen cloth, scattered fresh herbs and spices nearby",
    light: "warm golden natural window light from the side, soft organic shadows, cozy atmosphere",
    mood: "farmhouse and homemade warmth, slightly imperfect and charming, traditional Turkish home cooking feel",
    angle: "relaxed overhead or slight angle, organic composition",
  },
  minimal: {
    surface: "clean dark charcoal slate, completely uncluttered, single elegant plate",
    light: "soft even studio lighting from above, no harsh shadows, quiet and calm",
    mood: "zen simplicity, all focus on the food itself, modern minimalist aesthetic",
    angle: "centered overhead flat lay or straight-on",
  },
  outdoor: {
    surface: "outdoor garden or terrace table, natural stone or weathered wood, lush greenery softly blurred in background",
    light: "bright natural daylight, dappled sunlight through leaves, fresh open-air feel",
    mood: "al fresco dining in nature, relaxed and vibrant, Mediterranean or garden restaurant atmosphere",
    angle: "natural relaxed angle as if placed on a terrace table",
  },
};

/* Category-specific plating hints (style-agnostic, blended in) */
const PLATING_HINTS: { keywords: string[]; hint: string }[] = [
  { keywords: ["çorba", "soup", "mercimek", "domates", "kremalı"], hint: "served in a deep bowl, steam rising gently, herb garnish on top" },
  { keywords: ["tatlı", "dessert", "pasta", "kek", "brownie", "cheesecake", "dondurma", "baklava", "tiramisu"], hint: "small elegant portion, garnished with berry or caramel accent" },
  { keywords: ["içecek", "drink", "kokteyl", "cocktail", "kahve", "coffee", "çay", "ayran", "şarap", "bira"], hint: "in an appropriate glass or cup, garnish of citrus or fresh herb on rim" },
  { keywords: ["salata", "salad", "yeşillik", "roka", "marul"], hint: "colorful fresh vegetables, vibrant greens, light olive oil drizzle" },
  { keywords: ["pizza", "pide", "lahmacun"], hint: "full view showing toppings, fresh basil, slight cheese pull visible" },
  { keywords: ["burger", "sandviç", "sandwich", "wrap"], hint: "cross-section or slight tilt to show all layers" },
];

function buildImagePrompt(productName: string, style: ImageStyle, category?: string, notes?: string): string {
  const s = STYLE_DEFS[style];
  const combined = `${productName} ${category ?? ""} ${notes ?? ""}`.toLowerCase();

  let plating = "beautifully plated on the surface";
  for (const { keywords, hint } of PLATING_HINTS) {
    if (keywords.some((kw) => combined.includes(kw))) { plating = hint; break; }
  }

  return [
    `Food photo of "${productName}" for a restaurant menu`,
    `Plating: ${plating}`,
    `Surface: ${s.surface}`,
    `Lighting: ${s.light}`,
    `Mood: ${s.mood}`,
    `Angle: ${s.angle}`,
    "No text, no watermarks, no hands, food only",
    "Realistic natural colors, appetizing presentation",
  ].join(". ");
}

/**
 * POST /ai/generate-image
 * Returns { b64: string, prompt: string } — raw JPEG base64 from OpenAI.
 * The client is responsible for canvas-based compression and upload so that
 * the same optimization pipeline is applied for both manual and AI images.
 */
router.post("/ai/generate-image", requireAuth, async (req, res): Promise<void> => {
  const { productName, productId, category, notes, style } = req.body as {
    productName?: string;
    productId?: number;
    category?: string;
    notes?: string;
    style?: string;
  };

  if (!productName) { res.status(400).json({ error: "Ürün adı gerekli" }); return; }

  const validStyles: ImageStyle[] = ["restaurant", "professional", "rustic", "minimal", "outdoor"];
  const resolvedStyle: ImageStyle = validStyles.includes(style as ImageStyle) ? (style as ImageStyle) : "restaurant";

  const [settings] = await db.select().from(settingsTable).limit(1);
  const apiKey = settings?.openAiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(400).json({ error: "OpenAI API anahtarı ayarlarda yapılandırılmamış" }); return; }

  const prompt = buildImagePrompt(productName, resolvedStyle, category, notes);
  let success = false;

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        n: 1,
        size: "1536x1024",
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
