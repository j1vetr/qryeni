import { Router } from "express";
import { db } from "../lib/db";
import {
  categoriesTable,
  categoryTranslationsTable,
  productsTable,
  productTranslationsTable,
} from "@workspace/db/schema";
import { requireAuth } from "../lib/auth";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import sharp from "sharp";
import { saveLocalFile, ensureUploadsDir, isReplitEnv } from "../lib/localFileStorage";
import { ObjectStorageService } from "../lib/objectStorage";

const router = Router();
const SOURCE = "https://yoros.dijita.com.tr";

/* ── helpers ──────────────────────────────────────────────────── */

function slugify(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ş/g, "s")
    .replace(/ı/g, "i").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/â/g, "a").replace(/î/g, "i").replace(/û/g, "u")
    .replace(/&amp;/g, "and").replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&nbsp;/g, " ")
    .trim();
}

async function uniqueSlug(base: string, kind: "category" | "product"): Promise<string> {
  const tbl = kind === "category" ? categoriesTable : productsTable;
  let slug = base;
  let n = 0;
  while (true) {
    const rows = await db.select({ id: tbl.id }).from(tbl).where(eq(tbl.slug, slug)).limit(1);
    if (!rows.length) return slug;
    n++;
    slug = `${base}-${n}`;
  }
}

async function downloadAndStore(relUrl: string): Promise<string | null> {
  try {
    const url = relUrl.startsWith("http") ? relUrl : `${SOURCE}/${relUrl.replace(/^\//, "")}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(20000) });
    if (!resp.ok) return null;
    const raw = Buffer.from(await resp.arrayBuffer());
    const optimized = await sharp(raw)
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer();
    const uuid = randomUUID();

    if (!isReplitEnv()) {
      await ensureUploadsDir();
      await saveLocalFile(uuid, optimized);
      return `/api/storage/local/${uuid}`;
    }

    // Replit: upload via object storage presigned URL
    const svc = new ObjectStorageService();
    const uploadUrl = await svc.getObjectEntityUploadURL();
    const put = await fetch(uploadUrl, {
      method: "PUT",
      body: optimized,
      headers: { "Content-Type": "image/jpeg" },
    });
    if (!put.ok) return null;
    const objectPath = await svc.trySetObjectEntityAclPolicy(uploadUrl, { visibility: "public" });
    return objectPath ?? null;
  } catch {
    return null;
  }
}

/* ── scrape helpers ───────────────────────────────────────────── */

interface RawCategory { id: number; name: string; imgUrl: string }
interface RawProduct {
  id: number; menu_name: string; menu_desc: string; menu_price: string;
  menu_images: string; menu_cat: number; cat_name: string;
}

async function fetchHtml(path: string): Promise<string> {
  const resp = await fetch(`${SOURCE}${path}`, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; QRMenuImporter/1.0)" },
    signal: AbortSignal.timeout(20000),
  });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${path}`);
  return resp.text();
}

function parseCategories(html: string): RawCategory[] {
  const re = /href="\/categories\?category=(\d+)"[^>]*>\s*<div[^>]*>\s*<img[^>]*src="([^"]+)"[^>]*alt="([^"]+)"/g;
  const results: RawCategory[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    results.push({ id: parseInt(m[1]), imgUrl: m[2], name: decodeEntities(m[3]) });
  }
  return results;
}

function parseProducts(html: string): RawProduct[] {
  const re = /openProductModal\((\{[^)]+\})\)/g;
  const results: RawProduct[] = [];
  const seen = new Set<number>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    try {
      const raw = m[1]
        .replace(/&quot;/g, '"').replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&");
      const p = JSON.parse(raw) as RawProduct;
      if (!seen.has(p.id)) { seen.add(p.id); results.push(p); }
    } catch { /* malformed — skip */ }
  }
  return results;
}

/* ── SSE import endpoint ──────────────────────────────────────── */

router.post("/import/scrape", requireAuth, async (req, res): Promise<void> => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  type EventPayload =
    | { type: "log"; msg: string }
    | { type: "progress"; done: number; total: number; label: string }
    | { type: "done"; categories: number; products: number; errors: string[] }
    | { type: "error"; msg: string };

  const send = (payload: EventPayload) => {
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  const errors: string[] = [];
  let catCount = 0;
  let prodCount = 0;

  try {
    /* 1. Fetch & parse categories */
    send({ type: "log", msg: "Kategoriler çekiliyor…" });
    const catHtml = await fetchHtml("/categories");
    const rawCats = parseCategories(catHtml);
    send({ type: "log", msg: `${rawCats.length} kategori bulundu.` });

    /* 2. Fetch all category product pages */
    send({ type: "log", msg: "Her kategorinin ürünleri çekiliyor…" });
    const allProducts = new Map<number, RawProduct>();
    const catProductIds = new Map<number, Set<number>>();

    for (let i = 0; i < rawCats.length; i++) {
      const cat = rawCats[i];
      send({ type: "progress", done: i, total: rawCats.length, label: `Kategori: ${cat.name}` });
      try {
        const html = await fetchHtml(`/categories?category=${cat.id}`);
        const prods = parseProducts(html);
        const ids = new Set<number>();
        for (const p of prods) {
          allProducts.set(p.id, p);
          ids.add(p.id);
        }
        catProductIds.set(cat.id, ids);
        send({ type: "log", msg: `  ${cat.name}: ${prods.length} ürün` });
      } catch (e) {
        errors.push(`Kategori ${cat.id} çekilemedi: ${String(e)}`);
        send({ type: "log", msg: `  ❌ ${cat.name}: çekilemedi` });
      }
    }
    send({ type: "progress", done: rawCats.length, total: rawCats.length, label: "Ürünler çekildi" });
    send({ type: "log", msg: `Toplam ${allProducts.size} ürün bulundu.` });

    /* 3. Download & store images — categories */
    send({ type: "log", msg: "Kategori görselleri indiriliyor…" });
    const catImageMap = new Map<number, string>();
    for (let i = 0; i < rawCats.length; i++) {
      const cat = rawCats[i];
      send({ type: "progress", done: i, total: rawCats.length, label: `Görsel: ${cat.name}` });
      const url = await downloadAndStore(cat.imgUrl);
      if (url) catImageMap.set(cat.id, url);
      else errors.push(`Kategori görseli indirilemedi: ${cat.name}`);
    }

    /* 4. Download & store images — products */
    send({ type: "log", msg: "Ürün görselleri indiriliyor…" });
    const prodList = [...allProducts.values()];
    const prodImageMap = new Map<number, string>();
    for (let i = 0; i < prodList.length; i++) {
      const p = prodList[i];
      send({ type: "progress", done: i, total: prodList.length, label: `Görsel: ${p.menu_name}` });
      if (p.menu_images) {
        const url = await downloadAndStore(p.menu_images);
        if (url) prodImageMap.set(p.id, url);
      }
    }
    send({ type: "progress", done: prodList.length, total: prodList.length, label: "Görseller tamamlandı" });

    /* 5. Insert categories */
    send({ type: "log", msg: "Kategoriler veritabanına yazılıyor…" });
    const catIdMap = new Map<number, number>(); // oldId → newId

    for (let i = 0; i < rawCats.length; i++) {
      const cat = rawCats[i];
      const baseSlug = slugify(cat.name) || `kategori-${cat.id}`;

      try {
        const existingBySlug = await db
          .select({ id: categoriesTable.id })
          .from(categoriesTable)
          .where(eq(categoriesTable.slug, baseSlug))
          .limit(1);

        if (existingBySlug.length) {
          send({ type: "log", msg: `  ⏭ Atlıyor (mevcut): ${cat.name}` });
          catIdMap.set(cat.id, existingBySlug[0].id);
          continue;
        }

        const slug = await uniqueSlug(baseSlug, "category");
        const [created] = await db
          .insert(categoriesTable)
          .values({ slug, imageUrl: catImageMap.get(cat.id) ?? null, sortOrder: i, isActive: true })
          .returning();

        await db.insert(categoryTranslationsTable).values({
          categoryId: created.id,
          languageCode: "tr",
          name: cat.name,
        });

        catIdMap.set(cat.id, created.id);
        catCount++;
        send({ type: "log", msg: `  ✓ ${cat.name}` });
      } catch (e) {
        errors.push(`Kategori eklenemedi (${cat.name}): ${String(e)}`);
        send({ type: "log", msg: `  ❌ ${cat.name}: ${String(e)}` });
      }
    }

    /* 6. Insert products */
    send({ type: "log", msg: "Ürünler veritabanına yazılıyor…" });
    let pi = 0;
    for (const p of prodList) {
      const newCatId = catIdMap.get(p.menu_cat);
      if (!newCatId) {
        errors.push(`Ürün kategorisi bulunamadı (${p.menu_name})`);
        continue;
      }

      const baseSlug = slugify(p.menu_name) || `urun-${p.id}`;
      const price = parseFloat(p.menu_price) || 0;

      try {
        const existingBySlug = await db
          .select({ id: productsTable.id })
          .from(productsTable)
          .where(eq(productsTable.slug, baseSlug))
          .limit(1);

        if (existingBySlug.length) {
          send({ type: "log", msg: `  ⏭ Atlıyor (mevcut): ${p.menu_name}` });
          continue;
        }

        const slug = await uniqueSlug(baseSlug, "product");
        const [created] = await db
          .insert(productsTable)
          .values({
            categoryId: newCatId,
            slug,
            price,
            currency: "TRY",
            isActive: true,
            sortOrder: pi,
            imageUrl: prodImageMap.get(p.id) ?? null,
          })
          .returning();

        const desc = decodeEntities(p.menu_desc || "");
        await db.insert(productTranslationsTable).values({
          productId: created.id,
          languageCode: "tr",
          name: decodeEntities(p.menu_name),
          description: desc || null,
        });

        prodCount++;
        pi++;
        send({ type: "progress", done: pi, total: prodList.length, label: p.menu_name });
      } catch (e) {
        errors.push(`Ürün eklenemedi (${p.menu_name}): ${String(e)}`);
        send({ type: "log", msg: `  ❌ ${p.menu_name}: ${String(e)}` });
      }
    }

    send({ type: "log", msg: `\n✅ Tamamlandı: ${catCount} kategori, ${prodCount} ürün eklendi.` });
    send({ type: "done", categories: catCount, products: prodCount, errors });
  } catch (e) {
    send({ type: "error", msg: String(e) });
  }

  res.end();
});

export default router;
