import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  real,
  varchar,
  index,
  unique,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

// ─── Users (admin) ───────────────────────────────────────────────────────────
export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;

// ─── Settings ────────────────────────────────────────────────────────────────
export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  restaurantName: text("restaurant_name").notNull().default("Restaurant"),
  logoUrl: text("logo_url"),
  primaryColor: varchar("primary_color", { length: 16 }).default("#000000"),
  currency: varchar("currency", { length: 8 }).default("TRY"),
  defaultLanguage: varchar("default_language", { length: 8 }).default("tr"),
  openAiKey: text("openai_key"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });
export type Settings = typeof settingsTable.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;

// ─── Languages ────────────────────────────────────────────────────────────────
export const languagesTable = pgTable("languages", {
  id: serial("id").primaryKey(),
  code: varchar("code", { length: 8 }).notNull().unique(),
  name: varchar("name", { length: 64 }).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  sortOrder: integer("sort_order").default(0).notNull(),
});

export const insertLanguageSchema = createInsertSchema(languagesTable).omit({ id: true });
export type Language = typeof languagesTable.$inferSelect;
export type InsertLanguage = z.infer<typeof insertLanguageSchema>;

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  slug: varchar("slug", { length: 128 }).notNull().unique(),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order").default(0).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const categoryTranslationsTable = pgTable(
  "category_translations",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 8 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
  },
  (t) => [unique().on(t.categoryId, t.languageCode)]
);

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true, createdAt: true });
export const insertCategoryTranslationSchema = createInsertSchema(categoryTranslationsTable).omit({ id: true });
export type Category = typeof categoriesTable.$inferSelect;
export type CategoryTranslation = typeof categoryTranslationsTable.$inferSelect;

// ─── Products ─────────────────────────────────────────────────────────────────
export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    categoryId: integer("category_id")
      .notNull()
      .references(() => categoriesTable.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 128 }).notNull().unique(),
    imageUrl: text("image_url"),
    price: real("price").notNull().default(0),
    currency: varchar("currency", { length: 8 }).default("TRY"),
    isActive: boolean("is_active").default(true).notNull(),
    sortOrder: integer("sort_order").default(0).notNull(),
    calories: integer("calories"),
    allergens: jsonb("allergens").$type<string[]>().default([]),
    nutritionFacts: jsonb("nutrition_facts")
      .$type<{ energy?: number; protein?: number; carbs?: number; fat?: number }>()
      .default({}),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [index("products_category_idx").on(t.categoryId)]
);

export const productTranslationsTable = pgTable(
  "product_translations",
  {
    id: serial("id").primaryKey(),
    productId: integer("product_id")
      .notNull()
      .references(() => productsTable.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 8 }).notNull(),
    name: text("name").notNull(),
    description: text("description"),
    ingredients: text("ingredients"),
    allergenNote: text("allergen_note"),
    specialNote: text("special_note"),
  },
  (t) => [unique().on(t.productId, t.languageCode)]
);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true });
export const insertProductTranslationSchema = createInsertSchema(productTranslationsTable).omit({ id: true });
export type Product = typeof productsTable.$inferSelect;
export type ProductTranslation = typeof productTranslationsTable.$inferSelect;

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsEventsTable = pgTable(
  "analytics_events",
  {
    id: serial("id").primaryKey(),
    type: varchar("type", { length: 32 }).notNull(), // 'menu_view' | 'product_view'
    productId: integer("product_id").references(() => productsTable.id, { onDelete: "set null" }),
    languageCode: varchar("language_code", { length: 8 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("analytics_type_idx").on(t.type),
    index("analytics_created_idx").on(t.createdAt),
    index("analytics_product_idx").on(t.productId),
  ]
);

export type AnalyticsEvent = typeof analyticsEventsTable.$inferSelect;
