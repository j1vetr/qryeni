import { Router } from "express";
import { db } from "../lib/db";
import {
  analyticsEventsTable,
  productsTable,
  categoriesTable,
  productTranslationsTable,
} from "@workspace/db/schema";
import { requireAuth } from "../lib/auth";
import { eq, count, gte, and, sql } from "drizzle-orm";

const router = Router();

router.get("/analytics/product-views/public", async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: analyticsEventsTable.productId,
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.type, "product_view"))
    .groupBy(analyticsEventsTable.productId);

  const result: Record<number, number> = {};
  for (const row of rows) {
    if (row.productId != null) {
      result[row.productId] = row.count;
    }
  }
  res.json(result);
});

router.get("/analytics/dashboard", requireAuth, async (_req, res): Promise<void> => {
  const [menuViews] = await db
    .select({ count: count() })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.type, "menu_view"));

  const [productViews] = await db
    .select({ count: count() })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.type, "product_view"));

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [todayViews] = await db
    .select({ count: count() })
    .from(analyticsEventsTable)
    .where(gte(analyticsEventsTable.createdAt, todayStart));

  const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [weeklyViews] = await db
    .select({ count: count() })
    .from(analyticsEventsTable)
    .where(
      and(
        gte(analyticsEventsTable.createdAt, weekStart),
        eq(analyticsEventsTable.type, "menu_view")
      )
    );

  const [totalProducts] = await db.select({ count: count() }).from(productsTable);
  const [totalCategories] = await db.select({ count: count() }).from(categoriesTable);

  res.json({
    totalMenuViews: menuViews.count,
    totalProductViews: productViews.count,
    todayViews: todayViews.count,
    weeklyMenuViews: weeklyViews.count,
    totalProducts: totalProducts.count,
    totalCategories: totalCategories.count,
  });
});

function parsePeriodDays(period: string | undefined): number {
  switch (period) {
    case "monthly":
    case "90d":
      return 90;
    case "weekly":
    case "30d":
      return 30;
    default:
      return 7;
  }
}

async function getTimeseries(period: string | undefined) {
  const days = parsePeriodDays(period);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const menuRows = await db
    .select({
      date: sql<string>`DATE(${analyticsEventsTable.createdAt})`.as("date"),
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(and(gte(analyticsEventsTable.createdAt, since), eq(analyticsEventsTable.type, "menu_view")))
    .groupBy(sql`DATE(${analyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${analyticsEventsTable.createdAt})`);

  const productRows = await db
    .select({
      date: sql<string>`DATE(${analyticsEventsTable.createdAt})`.as("date"),
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(and(gte(analyticsEventsTable.createdAt, since), eq(analyticsEventsTable.type, "product_view")))
    .groupBy(sql`DATE(${analyticsEventsTable.createdAt})`)
    .orderBy(sql`DATE(${analyticsEventsTable.createdAt})`);

  const dateSet = new Set([...menuRows.map((r) => r.date), ...productRows.map((r) => r.date)]);
  const menuMap = Object.fromEntries(menuRows.map((r) => [r.date, r.count]));
  const productMap = Object.fromEntries(productRows.map((r) => [r.date, r.count]));

  return Array.from(dateSet)
    .sort()
    .map((date) => ({
      date,
      menuViews: menuMap[date] ?? 0,
      productViews: productMap[date] ?? 0,
    }));
}

router.get("/analytics/views", requireAuth, async (req, res): Promise<void> => {
  const data = await getTimeseries(req.query.period as string | undefined);
  res.json(data);
});

router.get("/analytics/timeseries", requireAuth, async (req, res): Promise<void> => {
  const data = await getTimeseries(req.query.period as string | undefined);
  res.json(data);
});

router.get("/analytics/product-views", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: analyticsEventsTable.productId,
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.type, "product_view"))
    .groupBy(analyticsEventsTable.productId);

  const result: Record<number, number> = {};
  for (const row of rows) {
    if (row.productId != null) {
      result[row.productId] = row.count;
    }
  }
  res.json(result);
});

router.get("/analytics/top-products", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      productId: analyticsEventsTable.productId,
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(eq(analyticsEventsTable.type, "product_view"))
    .groupBy(analyticsEventsTable.productId)
    .orderBy(sql`count(*) DESC`)
    .limit(10);

  const enriched = await Promise.all(
    rows.map(async (row) => {
      if (!row.productId) return { ...row, name: "Unknown" };
      const [tr] = await db
        .select()
        .from(productTranslationsTable)
        .where(
          and(
            eq(productTranslationsTable.productId, row.productId),
            eq(productTranslationsTable.languageCode, "tr")
          )
        )
        .limit(1);
      return { ...row, name: tr?.name ?? `Ürün ${row.productId}` };
    })
  );

  res.json(enriched);
});

router.get("/analytics/language-breakdown", requireAuth, async (_req, res): Promise<void> => {
  const rows = await db
    .select({
      languageCode: analyticsEventsTable.languageCode,
      menuViews: sql<number>`count(*) filter (where ${analyticsEventsTable.type} = 'menu_view')`,
      productViews: sql<number>`count(*) filter (where ${analyticsEventsTable.type} = 'product_view')`,
      total: count(),
    })
    .from(analyticsEventsTable)
    .groupBy(analyticsEventsTable.languageCode)
    .orderBy(sql`count(*) DESC`);

  res.json(rows);
});

router.get("/analytics/lang-timeseries", requireAuth, async (req, res): Promise<void> => {
  const days = parsePeriodDays(req.query.period as string | undefined);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await db
    .select({
      date: sql<string>`DATE(${analyticsEventsTable.createdAt})`.as("date"),
      languageCode: analyticsEventsTable.languageCode,
      count: count(),
    })
    .from(analyticsEventsTable)
    .where(and(gte(analyticsEventsTable.createdAt, since), eq(analyticsEventsTable.type, "menu_view")))
    .groupBy(sql`DATE(${analyticsEventsTable.createdAt})`, analyticsEventsTable.languageCode)
    .orderBy(sql`DATE(${analyticsEventsTable.createdAt})`);

  const byDate: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    if (!byDate[row.date]) byDate[row.date] = {};
    if (row.languageCode) byDate[row.date][row.languageCode] = row.count;
  }

  const result = Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, langs]) => ({ date, tr: langs["tr"] ?? 0, en: langs["en"] ?? 0, ru: langs["ru"] ?? 0, ar: langs["ar"] ?? 0 }));

  res.json(result);
});

export default router;
