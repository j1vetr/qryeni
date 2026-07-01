import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";

export interface NutritionFacts {
  energy?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

export interface ProductData {
  id: number;
  slug: string;
  name: string;
  description?: string;
  ingredients?: string;
  allergenNote?: string;
  specialNote?: string;
  price: number;
  currency: string;
  imageUrl?: string;
  calories?: number;
  allergens?: string[];
  nutritionFacts?: NutritionFacts;
}

export interface CategoryData {
  id: number;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  products: ProductData[];
}

export interface RestaurantInfo {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  currency?: string;
  heroImageUrl?: string;
  openingHours?: string;
  instagram?: string;
  tagline?: string;
  qualityNote?: string;
  address?: string;
  description?: string;
}

export interface MenuData {
  restaurant: RestaurantInfo;
  languages: { code: string; name: string }[];
  currentLanguage: string;
  categories: CategoryData[];
}

export function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${price.toFixed(2)}`;
}

export const LANG_FLAGS: Record<string, string> = {
  tr: "🇹🇷",
  en: "🇬🇧",
  ru: "🇷🇺",
  ar: "🇸🇦",
};

export const RTL_LANGS = ["ar", "he", "fa"];

const STORAGE_KEY = "luna_lang";

export function getStoredLang(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "tr";
  } catch {
    return "tr";
  }
}

export function setStoredLang(lang: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export function useMenuData() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [lang, setLangState] = useState<string>(getStoredLang);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadMenu = useCallback(async (language: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MenuData>(`/menu?lang=${language}`);
      setMenu(data);
      document.title = data.restaurant.name ? `${data.restaurant.name} — Menü` : "Menü";
    } catch {
      setError("Menü yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMenu(lang);
  }, [lang, loadMenu]);

  const setLang = useCallback((l: string) => {
    setStoredLang(l);
    setLangState(l);
  }, []);

  const accent = menu?.restaurant.primaryColor ?? "#C9A84C";

  return { menu, lang, setLang, loading, error, reload: () => loadMenu(lang), accent };
}
