import { Router } from "express";
import { db } from "../lib/db";
import { settingsTable } from "@workspace/db/schema";
import { requireAuth } from "../lib/auth";
import { eq } from "drizzle-orm";

const router = Router();

async function getSettings() {
  const rows = await db.select().from(settingsTable).limit(1);
  return rows[0] ?? null;
}

router.get("/settings/public", async (_req, res): Promise<void> => {
  const settings = await getSettings();
  if (!settings) { res.status(404).json({ error: "Not found" }); return; }
  res.json({
    slug: settings.slug,
    restaurantName: settings.restaurantName,
    primaryColor: settings.primaryColor ?? "#C9A84C",
    logoUrl: settings.logoUrl ?? null,
    heroImageUrl: settings.heroImageUrl ?? null,
    openingHours: settings.openingHours ?? null,
    instagram: settings.instagram ?? null,
    tagline: settings.tagline ?? null,
    qualityNote: settings.qualityNote ?? null,
    address: settings.address ?? null,
    description: settings.description ?? null,
  });
});

router.get("/settings", requireAuth, async (_req, res): Promise<void> => {
  const settings = await getSettings();
  if (!settings) {
    res.status(404).json({ error: "Settings not found" });
    return;
  }
  res.json(settings);
});

router.patch("/settings", requireAuth, async (req, res): Promise<void> => {
  const existing = await getSettings();
  const body = req.body;
  if (existing) {
    const [updated] = await db
      .update(settingsTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(settingsTable.id, existing.id))
      .returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(settingsTable).values(body).returning();
    res.json(created);
  }
});

export default router;
