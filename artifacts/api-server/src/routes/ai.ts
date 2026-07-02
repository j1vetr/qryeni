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

/* ─── Turkish food serving hints ─────────────────────────────────
 * ORDER MATTERS: first match wins. Put the most specific / category-
 * defining keywords BEFORE structural modifiers (e.g. "tost" before
 * "yarım ekmek" so "Yarım Ekmek Kaşarlı Tost" gets the tost hint).
 * Short keywords (≤4 chars) use word-boundary matching via kwMatches()
 * to prevent substring false-positives (e.g. "su" ≠ "susam").
 * ──────────────────────────────────────────────────────────────── */
const PLATING_HINTS: { keywords: string[]; hint: string }[] = [
  // ── Toasted sandwiches (BEFORE "yarım ekmek" to avoid mismatch) ──
  {
    keywords: ["tost", "kaşarlı tost", "karışık tost", "şarküteri tost"],
    hint: "a toasted sandwich (tost) cut diagonally showing melted cheese inside, served on a simple plate — exactly like a Turkish büfe tost, no garnish",
  },
  // ── Burgers / sandwiches ──
  {
    keywords: ["burger"],
    hint: "burger in a toasted bun, generous filling visible from the side, served on a simple plate as in a Turkish fast-food spot",
  },
  {
    keywords: ["sandviç", "sandwich"],
    hint: "sandwich on a simple plate as served in a Turkish büfe — generous filling, straightforward presentation",
  },
  // ── Sosisli (BEFORE "ekmek" entries so sosisli ekmek still works) ──
  {
    keywords: ["sosisli", "sosis ekmek"],
    hint: "one long hot dog sausage (NOT small cocktail sausages) nestled inside a long bread roll, generous zigzag lines of ketchup and mayonnaise on top, served on a simple white plate — exactly like a Turkish sosisli sandviç from a büfe",
  },
  // ── Lahmacun ──
  {
    keywords: ["lahmacun"],
    hint: "thin round lahmacun flatbread with minced meat topping, on a simple plate, optionally rolled with parsley and a lemon wedge alongside — exactly as served in a Turkish restaurant",
  },
  // ── Pide ──
  {
    keywords: ["pide"],
    hint: "boat-shaped Turkish pide fresh from the stone oven, golden-brown crust, filling clearly visible on top, on a simple plate or parchment paper — traditional Turkish pide",
  },
  // ── Pizza ──
  {
    keywords: ["pizza"],
    hint: "pizza as served in Turkey — full top-down or slight angle showing toppings, simple plate",
  },
  // ── Ekmek döner variants (after tost/burger so they don't steal those) ──
  {
    keywords: ["yarım ekmek döner", "tam ekmek döner", "ekmek döner", "ekmek arası döner", "yarım ekmek et", "yarım ekmek tavuk"],
    hint: "half a crusty white Turkish somun bread (NOT a fancy artisan loaf) sliced open and generously packed with shaved döner meat, a few fresh tomato slices and thin onion rings inside, loosely wrapped in paper on a simple plate — EXACTLY as served at a Turkish dönerci or lokanta, zero fancy styling",
  },
  // Yarım / tam ekmek without döner context (e.g. "Yarım Ekmek Kaşarlı")
  // This comes AFTER tost so "Yarım Ekmek Kaşarlı Tost" hits tost first
  {
    keywords: ["yarım ekmek", "tam ekmek", "ekmek arası"],
    hint: "Turkish somun bread sliced open and filled, served on a simple plate as in a Turkish büfe — honest presentation, no garnish",
  },
  // ── Dürüm ──
  {
    keywords: ["dürüm", "lavaş"],
    hint: "döner meat tightly wrapped in thin Turkish lavaş flatbread, sliced slightly to show the filling, on a simple plate with a wedge of lemon — classic Turkish dürüm, no garnish",
  },
  // ── Generic döner ──
  {
    keywords: ["döner"],
    hint: "döner kebab meat served exactly as in Turkey — in bread or on a plate with simple tomato and onion alongside, no microgreens or artistic plating",
  },
  // ── Köfte ──
  {
    keywords: ["köfte", "köftesi"],
    hint: "grilled flattened köfte patties on a simple oval plate alongside a mound of rice pilaf or bulgur, a few tomato and green pepper slices on the side — classic Turkish lokanta plate, no decoration",
  },
  // ── Izgara / grilled (word-boundary for short ones like "şiş") ──
  {
    keywords: ["izgara", "tavuk kanat", "tavuk but", "pirzola", "biftek", "şiş kebap", "şiş tavuk", "adana", "urfa"],
    hint: "grilled meat on a simple oval plate with rice or bulgur pilaf and grilled tomato and green pepper alongside — exactly how it's plated in a Turkish restaurant, no fancy decoration",
  },
  // ── Soups ──
  {
    keywords: ["çorba", "soup", "mercimek", "işkembe", "kremalı", "tarhana", "ezogelin"],
    hint: "soup in a simple ceramic bowl with steam rising gently, a small lemon wedge on the side, a pinch of dried mint or red pepper flakes on top — classic Turkish çorba service",
  },
  // ── Salads ──
  {
    keywords: ["salata", "çoban salata", "mevsim salata"],
    hint: "fresh Turkish salad with diced tomato, cucumber, onion and parsley in a simple bowl, olive oil and lemon dressing — as served in Turkey, no fancy microgreens",
  },
  // ── Turkish desserts ──
  {
    keywords: ["baklava", "künefe", "sütlaç", "kazandibi", "revani", "helva", "lokum", "şekerpare"],
    hint: "traditional Turkish dessert on a simple plate as served in a Turkish restaurant — no over-styled garnish, authentic portion",
  },
  {
    keywords: ["dondurma"],
    hint: "Turkish ice cream in a cone or cup, served simply as in a Turkish dondurma shop",
  },
  {
    keywords: ["tatlı", "pasta", "kek", "brownie", "cheesecake", "tiramisu", "waffle"],
    hint: "dessert portion on a simple plate as served in a Turkish café, no excessive garnish",
  },
  // ── Specific drinks (word-boundary matching handles short keywords) ──
  {
    keywords: ["ayran"],
    hint: "frothy cold ayran in a tall glass or traditional copper cup, simple presentation as served in Turkey",
  },
  {
    keywords: ["türk kahvesi", "türk kahve"],
    hint: "small Turkish coffee cup (fincan) on a saucer, a small glass of water alongside and a piece of Turkish delight — classic Turkish coffee service",
  },
  {
    keywords: ["çay"],
    hint: "Turkish tea in a classic tulip-shaped çay bardağı glass on a small saucer with two sugar cubes — the iconic Turkish tea glass, nothing else",
  },
  // ── Water — word-boundary required so "su" ≠ "susam" ──
  {
    keywords: ["su"],
    hint: "a simple glass of water on a plain surface — clear water in a tall glass, nothing else, minimalist",
  },
  // ── Generic drinks ──
  {
    keywords: ["limonata", "şalgam", "şerbet", "meyve suyu"],
    hint: "cold drink in an appropriate glass, simple presentation as served in a Turkish restaurant",
  },
  {
    keywords: ["kahve", "coffee", "espresso", "latte", "cappuccino", "americano"],
    hint: "coffee in an appropriate cup, simple presentation as served in a Turkish café",
  },
  {
    keywords: ["çay", "bira", "şarap", "kokteyl", "cocktail", "içecek", "drink"],
    hint: "drink in an appropriate glass, simple presentation as served in a Turkish restaurant",
  },
];

/* Word-boundary-aware keyword matcher.
 * For keywords ≤4 chars we require the match to be surrounded by
 * non-alphanumeric / non-Turkish-letter characters (or start/end of string)
 * to prevent false substring matches (e.g. "su" matching "susam"). */
const TR_ALPHA = "a-zğüşıöçA-ZĞÜŞİÖÇ";
function kwMatches(text: string, kw: string): boolean {
  if (kw.length <= 4) {
    const re = new RegExp(`(?<![${TR_ALPHA}0-9])${kw}(?![${TR_ALPHA}0-9])`);
    return re.test(text);
  }
  return text.includes(kw);
}

function buildImagePrompt(productName: string, style: ImageStyle, category?: string, notes?: string): string {
  const s = STYLE_DEFS[style];
  const combined = `${productName} ${category ?? ""} ${notes ?? ""}`.toLowerCase();

  // Default: served simply as in a Turkish restaurant — no fancy styling
  let plating = "served simply on a plate exactly as it would be in an authentic Turkish restaurant, no microgreens, no sauce dots, no artistic food styling";
  for (const { keywords, hint } of PLATING_HINTS) {
    if (keywords.some((kw) => kwMatches(combined, kw))) { plating = hint; break; }
  }

  return [
    `Authentic Turkish restaurant food photo of "${productName}"`,
    `How it is served: ${plating}`,
    `Surface: ${s.surface}`,
    `Lighting: ${s.light}`,
    `Mood: ${s.mood} — this is REAL Turkish street food or lokanta food, NOT fine dining, zero food-styling tricks`,
    `Angle: ${s.angle}`,
    "CRITICAL: No microgreens, no sauce dots, no edible flowers, no artistic garnishes — only what actually comes with this dish in Turkey",
    "IMPORTANT: absolutely no text, no letters, no words, no labels, no numbers, no watermarks anywhere in the image",
    "No hands, food only",
    "Natural colors, appetizing and honest presentation",
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

  const prompt = `You are a menu copywriter for an authentic everyday Turkish restaurant (lokanta/büfe/kebapçı). Your job is to write honest, appetizing descriptions that match how the dish ACTUALLY looks and tastes in Turkey — not fine dining language.

Generate complete menu content for:
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
- allergens: array using ONLY these exact Turkish lowercase names when applicable: gluten, süt, yumurta, balık, kabuklu, fındık, yer fıstığı, soya, kereviz, hardal, susam, lupin, yumuşakça, sülfitler
- nutritionFacts: per serving — energy in kcal, protein/carbs/fat in grams (realistic for a restaurant portion)
- calories: total kcal (same as nutritionFacts.energy)
- translations["tr"].name: keep the original Turkish name exactly as given — do NOT translate or modify it
- translations["tr"].description: describe how it actually looks and tastes in Turkey, max 60 words, warm and appetizing tone, no fine-dining language
- translations["en"].name: use the internationally recognised English name — examples: "Doner Kebab" (NOT "Meat Döner"), "Meatball Plate" (NOT "Köfte"), "Turkish Flatbread" for pide, "Lentil Soup" for mercimek çorbası; keep Turkish loanwords that are globally known (döner, kebab, baklava, ayran, lahmacun, börek)
- translations["en"].description: describe it as British/American diners would expect — honest, no over-promising, max 60 words
- translations["ru"].name: use the standard Russian name for Turkish food if one exists; otherwise transliterate naturally (e.g. Донер-кебаб, Кофте, Пиде)
- translations["ar"].name: use the Arabic name commonly used in Arab countries for this dish if known; otherwise transliterate
- All descriptions: max 60 words, start with uppercase, NO words like "artisanal", "gourmet", "exquisite", "decadent" — write for a real restaurant, not a food magazine
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

router.post("/ai/translate-category", requireAuth, async (req, res): Promise<void> => {
  const { categoryName, languages } = req.body as {
    categoryName: string;
    languages?: string[];
  };

  if (!categoryName) { res.status(400).json({ error: "Kategori adı gerekli" }); return; }

  const [settings] = await db.select().from(settingsTable).limit(1);
  const apiKey = settings?.openAiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) { res.status(400).json({ error: "OpenAI API anahtarı ayarlarda yapılandırılmamış" }); return; }

  const targetLangs = languages?.length ? languages : ["en", "ru", "ar"];
  const langNames: Record<string, string> = { tr: "Turkish", en: "English", ru: "Russian", ar: "Arabic" };

  const prompt = `You are a professional restaurant menu translator.
Translate the following Turkish restaurant category name into the requested languages.
Category name (Turkish): "${categoryName}"

Respond ONLY with a valid JSON object matching this exact shape:
{
  "translations": {
    ${targetLangs.map((l) => `"${l}": { "name": "...", "description": "..." }`).join(",\n    ")}
  }
}

Rules:
- name: concise, natural-sounding category name in that language (do not just transliterate, use natural local phrasing)
- description: optional short appetizing subtitle for the category, max 10 words, in that language (can be empty string "")
- Languages to generate: ${targetLangs.map((l) => `${l} (${langNames[l] ?? l})`).join(", ")}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.4,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      res.status(502).json({ error: "OpenAI error", detail: err });
      return;
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(content);
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ error: "Çeviri başarısız oldu", detail: String(err) });
  }
});

export default router;
