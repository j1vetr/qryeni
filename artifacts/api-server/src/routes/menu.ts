import { Router } from "express";
import { db } from "../lib/db";
import {
  settingsTable,
  languagesTable,
  categoriesTable,
  categoryTranslationsTable,
  productsTable,
  productTranslationsTable,
  analyticsEventsTable,
} from "@workspace/db/schema";
import { eq, asc, and } from "drizzle-orm";

const router = Router();

async function buildMenuResponse(slug: string, lang: string) {
  const [settings] = await db.select().from(settingsTable).where(eq(settingsTable.slug, slug));
  if (!settings) return null;

  const languages = await db
    .select()
    .from(languagesTable)
    .where(eq(languagesTable.isActive, true))
    .orderBy(asc(languagesTable.sortOrder));

  const categories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.isActive, true))
    .orderBy(asc(categoriesTable.sortOrder));

  const result = await Promise.all(
    categories.map(async (cat) => {
      const [translation] = await db
        .select()
        .from(categoryTranslationsTable)
        .where(
          and(
            eq(categoryTranslationsTable.categoryId, cat.id),
            eq(categoryTranslationsTable.languageCode, lang)
          )
        )
        .limit(1);

      const fallbackTranslation = !translation
        ? await db
            .select()
            .from(categoryTranslationsTable)
            .where(eq(categoryTranslationsTable.categoryId, cat.id))
            .limit(1)
            .then((r) => r[0])
        : null;

      const catName = translation?.name ?? fallbackTranslation?.name ?? cat.slug;
      const catDesc = translation?.description ?? fallbackTranslation?.description ?? null;

      const products = await db
        .select()
        .from(productsTable)
        .where(
          and(eq(productsTable.categoryId, cat.id), eq(productsTable.isActive, true))
        )
        .orderBy(asc(productsTable.sortOrder));

      const productsWithTr = await Promise.all(
        products.map(async (p) => {
          const [tr] = await db
            .select()
            .from(productTranslationsTable)
            .where(
              and(
                eq(productTranslationsTable.productId, p.id),
                eq(productTranslationsTable.languageCode, lang)
              )
            )
            .limit(1);

          const fallbackTr = !tr
            ? await db
                .select()
                .from(productTranslationsTable)
                .where(eq(productTranslationsTable.productId, p.id))
                .limit(1)
                .then((r) => r[0])
            : null;

          const activeTr = tr ?? fallbackTr;

          return {
            id: p.id,
            slug: p.slug,
            name: activeTr?.name ?? p.slug,
            description: activeTr?.description ?? null,
            ingredients: activeTr?.ingredients ?? null,
            allergenNote: activeTr?.allergenNote ?? null,
            specialNote: activeTr?.specialNote ?? null,
            price: p.price,
            currency: p.currency ?? settings.currency ?? "TRY",
            imageUrl: p.imageUrl,
            calories: p.calories,
            allergens: p.allergens,
            nutritionFacts: p.nutritionFacts,
          };
        })
      );

      return {
        id: cat.id,
        slug: cat.slug,
        name: catName,
        description: catDesc,
        imageUrl: cat.imageUrl,
        products: productsWithTr,
      };
    })
  );

  return {
    restaurant: {
      name: settings.restaurantName,
      logoUrl: settings.logoUrl,
      primaryColor: settings.primaryColor,
      currency: settings.currency,
      heroImageUrl: settings.heroImageUrl ?? null,
      openingHours: settings.openingHours ?? null,
      instagram: settings.instagram ?? null,
      tagline: settings.tagline ?? null,
      qualityNote: settings.qualityNote ?? null,
      address: settings.address ?? null,
      description: settings.description ?? null,
    },
    languages: languages.map((l) => ({ code: l.code, name: l.name })),
    currentLanguage: lang,
    categories: result,
  };
}

router.get("/menu", async (req, res): Promise<void> => {
  const lang = (req.query.lang as string) || "tr";
  const [settings] = await db.select().from(settingsTable).limit(1);
  if (!settings) {
    res.status(404).json({ error: "Menü bulunamadı" });
    return;
  }
  const data = await buildMenuResponse(settings.slug, lang);
  if (!data) {
    res.status(404).json({ error: "Menü bulunamadı" });
    return;
  }
  res.json(data);
});

router.get("/menu/:slug", async (req, res): Promise<void> => {
  const { slug } = req.params;
  const lang = (req.query.lang as string) || "tr";
  const data = await buildMenuResponse(slug, lang);
  if (!data) {
    res.status(404).json({ error: "Menü bulunamadı" });
    return;
  }
  res.json(data);
});

router.post("/menu/view", async (req, res): Promise<void> => {
  const lang = req.body?.lang ?? req.query.lang ?? null;
  await db.insert(analyticsEventsTable).values({
    type: "menu_view",
    languageCode: lang as string | undefined,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
});

router.post("/menu/:slug/view", async (req, res): Promise<void> => {
  const lang = req.body?.lang ?? req.query.lang ?? null;
  await db.insert(analyticsEventsTable).values({
    type: "menu_view",
    languageCode: lang as string | undefined,
    userAgent: req.headers["user-agent"],
  });
  res.json({ ok: true });
});

export default router;
