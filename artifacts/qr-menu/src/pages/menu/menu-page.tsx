import { useState, useEffect, useRef } from "react";
import { apiFetch } from "@/lib/api";
import { ChevronDown, X, Info, Flame, Beef, Wheat, Droplet } from "lucide-react";

interface NutritionFacts {
  energy?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface ProductData {
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

interface CategoryData {
  id: number;
  slug: string;
  name: string;
  description?: string;
  imageUrl?: string;
  products: ProductData[];
}

interface MenuData {
  restaurant: {
    name: string;
    logoUrl?: string;
    primaryColor?: string;
    currency?: string;
  };
  languages: { code: string; name: string }[];
  currentLanguage: string;
  categories: CategoryData[];
}

const LANG_FLAGS: Record<string, string> = { tr: "🇹🇷", en: "🇬🇧", ru: "🇷🇺", ar: "🇸🇦" };
const RTL_LANGS = ["ar", "he", "fa"];

function formatPrice(price: number, currency: string) {
  const symbols: Record<string, string> = { TRY: "₺", USD: "$", EUR: "€", GBP: "£" };
  const sym = symbols[currency] ?? currency;
  return `${sym}${price.toFixed(2)}`;
}

function withOpacity(hex: string, opacity: number): string {
  const clean = hex.startsWith("#") ? hex : `#${hex}`;
  const alpha = Math.round(opacity * 255)
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
  return `${clean}${alpha}`;
}

function NutritionRow({
  icon: Icon,
  label,
  value,
  unit,
}: {
  icon: typeof Flame;
  label: string;
  value?: number;
  unit: string;
}) {
  if (value == null) return null;
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
      <div className="flex items-center gap-1.5 text-neutral-500 text-xs">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <span className="text-xs font-medium text-neutral-800">
        {value} {unit}
      </span>
    </div>
  );
}

function ProductDetailModal({
  product,
  lang,
  primaryColor,
  onClose,
}: {
  product: ProductData;
  lang: string;
  primaryColor: string;
  onClose: () => void;
}) {
  const isRtl = RTL_LANGS.includes(lang);
  const nf = product.nutritionFacts;
  const hasNutrition = nf && Object.values(nf).some((v) => v != null && v > 0);

  useEffect(() => {
    apiFetch(`/products/${product.id}/view`, {
      method: "POST",
      body: JSON.stringify({ lang }),
    }).catch(() => {});

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [product.id]);

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {product.imageUrl && (
          <div className="relative bg-neutral-100 rounded-t-3xl sm:rounded-t-2xl overflow-hidden">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-auto block"
            />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow"
            >
              <X className="w-4 h-4 text-neutral-700" />
            </button>
          </div>
        )}

        <div className="p-5 space-y-4">
          {!product.imageUrl && (
            <div className="flex items-center justify-between">
              <div />
              <button onClick={onClose} className="text-neutral-400 hover:text-neutral-700">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-bold text-neutral-900 leading-tight">{product.name}</h2>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-bold" style={{ color: primaryColor }}>
                {formatPrice(product.price, product.currency)}
              </span>
              {product.calories != null && (
                <div className="text-xs text-neutral-400 mt-0.5">{product.calories} kcal</div>
              )}
            </div>
          </div>

          {product.description && (
            <p className="text-sm text-neutral-600 leading-relaxed">{product.description}</p>
          )}

          {product.ingredients && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-1">
                {lang === "tr"
                  ? "İçindekiler"
                  : lang === "ru"
                  ? "Ингредиенты"
                  : lang === "ar"
                  ? "المكونات"
                  : "Ingredients"}
              </h3>
              <p className="text-sm text-neutral-700">{product.ingredients}</p>
            </div>
          )}

          {hasNutrition && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">
                {lang === "tr"
                  ? "Besin Değerleri"
                  : lang === "ru"
                  ? "Пищевая ценность"
                  : lang === "ar"
                  ? "القيمة الغذائية"
                  : "Nutrition Facts"}
              </h3>
              <div className="bg-neutral-50 rounded-xl px-4 py-1">
                <NutritionRow
                  icon={Flame}
                  label={lang === "tr" ? "Enerji" : "Energy"}
                  value={nf?.energy}
                  unit="kcal"
                />
                <NutritionRow
                  icon={Beef}
                  label={lang === "tr" ? "Protein" : "Protein"}
                  value={nf?.protein}
                  unit="g"
                />
                <NutritionRow
                  icon={Wheat}
                  label={lang === "tr" ? "Karbonhidrat" : "Carbs"}
                  value={nf?.carbs}
                  unit="g"
                />
                <NutritionRow
                  icon={Droplet}
                  label={lang === "tr" ? "Yağ" : "Fat"}
                  value={nf?.fat}
                  unit="g"
                />
              </div>
            </div>
          )}

          {product.allergens && product.allergens.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-2">
                {lang === "tr"
                  ? "Alerjenler"
                  : lang === "ru"
                  ? "Аллергены"
                  : lang === "ar"
                  ? "مسببات الحساسية"
                  : "Allergens"}
              </h3>
              <div className="flex items-start gap-1.5 flex-wrap">
                <Info
                  className="w-3.5 h-3.5 mt-0.5 flex-shrink-0"
                  style={{ color: primaryColor }}
                />
                {product.allergens.map((a) => (
                  <span
                    key={a}
                    className="text-xs px-2 py-0.5 rounded-full border text-sm font-medium"
                    style={{
                      color: primaryColor,
                      backgroundColor: withOpacity(primaryColor, 0.08),
                      borderColor: withOpacity(primaryColor, 0.3),
                    }}
                  >
                    {a}
                  </span>
                ))}
              </div>
              {product.allergenNote && (
                <p className="text-xs mt-1.5" style={{ color: primaryColor }}>
                  {product.allergenNote}
                </p>
              )}
            </div>
          )}

          {product.specialNote && (
            <div
              className="rounded-xl p-3"
              style={{ backgroundColor: withOpacity(primaryColor, 0.06) }}
            >
              <p className="text-xs italic" style={{ color: withOpacity(primaryColor, 0.85) }}>
                ✦ {product.specialNote}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ProductCard({
  product,
  lang,
  primaryColor,
}: {
  product: ProductData;
  lang: string;
  primaryColor: string;
}) {
  const [showModal, setShowModal] = useState(false);

  const hasDetail =
    product.ingredients ||
    product.allergenNote ||
    product.specialNote ||
    (product.allergens && product.allergens.length > 0) ||
    (product.nutritionFacts &&
      Object.values(product.nutritionFacts).some((v) => v != null && v > 0));

  return (
    <>
      <div className="border-b border-neutral-100 last:border-0">
        <button
          className="w-full flex items-center gap-4 py-4 text-left hover:bg-neutral-50 transition-colors px-1 -mx-1 rounded-lg"
          onClick={() => setShowModal(true)}
        >
          {product.imageUrl && (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-16 h-16 rounded-xl object-contain bg-neutral-100 flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-neutral-900 text-sm leading-snug">
                {product.name}
              </h3>
              {product.calories != null && (
                <span className="text-xs text-neutral-400 flex-shrink-0">
                  {product.calories} kcal
                </span>
              )}
            </div>
            {product.description && (
              <p className="text-xs text-neutral-500 mt-0.5 line-clamp-2">
                {product.description}
              </p>
            )}
            <div className="mt-1.5 flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: primaryColor }}>
                {formatPrice(product.price, product.currency)}
              </span>
              {hasDetail && (
                <span className="text-xs text-neutral-400">
                  <ChevronDown className="w-3 h-3 inline" />
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {showModal && (
        <ProductDetailModal
          product={product}
          lang={lang}
          primaryColor={primaryColor}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default function MenuPage() {
  const [menu, setMenu] = useState<MenuData | null>(null);
  const [lang, setLang] = useState("tr");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const trackedView = useRef(false);
  const categoryRefs = useRef<Record<number, HTMLElement | null>>({});

  async function loadMenu(language: string) {
    try {
      const data = await apiFetch<MenuData>(`/menu?lang=${language}`);
      setMenu(data);
      if (data.categories[0]) setActiveCategory(data.categories[0].id);

      document.title = data.restaurant.name
        ? `${data.restaurant.name} — Menü`
        : "Menü";
      const metaDesc = document.querySelector<HTMLMetaElement>(
        'meta[name="description"]'
      );
      if (metaDesc) metaDesc.content = `${data.restaurant.name} dijital menüsü`;
    } catch {
      setError("Menü yüklenemedi");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadMenu(lang);
  }, [lang]);

  useEffect(() => {
    if (menu && !trackedView.current) {
      trackedView.current = true;
      apiFetch("/menu/view", {
        method: "POST",
        body: JSON.stringify({ lang }),
      }).catch(() => {});
    }
  }, [menu]);

  useEffect(() => {
    const handleScroll = () => {
      if (!menu) return;
      for (const cat of [...menu.categories].reverse()) {
        const el = categoryRefs.current[cat.id];
        if (el && el.getBoundingClientRect().top <= 120) {
          setActiveCategory(cat.id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [menu]);

  function scrollToCategory(id: number) {
    setActiveCategory(id);
    categoryRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const isRtl = RTL_LANGS.includes(lang);
  const primaryColor = menu?.restaurant.primaryColor ?? "#C9A84C";

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div
          className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
          style={{ borderColor: `#C9A84C #C9A84C #C9A84C transparent` }}
        />
      </div>
    );
  }

  if (error || !menu) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-4xl">🍽️</div>
          <h1 className="text-xl font-bold text-neutral-900">
            Menü şu an kullanılamıyor
          </h1>
          <p className="text-neutral-500 text-sm">
            Lütfen daha sonra tekrar deneyin
          </p>
          <button
            onClick={() => {
              setError(null);
              setLoading(true);
              loadMenu(lang);
            }}
            className="text-sm text-neutral-600 underline"
          >
            Yeniden dene
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-white ${isRtl ? "rtl" : "ltr"}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-100">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {menu.restaurant.logoUrl && (
              <img
                src={menu.restaurant.logoUrl}
                alt={menu.restaurant.name}
                className="w-7 h-7 rounded-lg object-cover flex-shrink-0"
              />
            )}
            <h1 className="font-bold text-neutral-900 text-sm truncate">
              {menu.restaurant.name}
            </h1>
          </div>
          {menu.languages.length > 1 && (
            <div className="flex items-center gap-1">
              {menu.languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    trackedView.current = false;
                    setLang(l.code);
                  }}
                  title={l.name}
                  className="w-8 h-8 rounded-full text-sm transition-all"
                  style={
                    lang === l.code
                      ? { backgroundColor: primaryColor, color: "#fff" }
                      : { color: "#737373" }
                  }
                >
                  {LANG_FLAGS[l.code] ?? l.code.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {menu.categories.length > 1 && (
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-1 px-4 pb-2 w-max">
              {menu.categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => scrollToCategory(cat.id)}
                  className="px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors"
                  style={
                    activeCategory === cat.id
                      ? { backgroundColor: primaryColor, color: "#fff" }
                      : { color: "#737373" }
                  }
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="max-w-xl mx-auto px-4 pb-16">
        {menu.categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => {
              categoryRefs.current[cat.id] = el;
            }}
            className="pt-8"
          >
            <div className="mb-4">
              <h2 className="text-xl font-bold text-neutral-900">{cat.name}</h2>
              {cat.description && (
                <p className="text-sm text-neutral-500 mt-1">{cat.description}</p>
              )}
            </div>
            {cat.imageUrl && (
              <img
                src={cat.imageUrl}
                alt={cat.name}
                className="w-full h-40 object-cover rounded-2xl mb-4"
              />
            )}
            <div>
              {cat.products.length === 0 ? (
                <p className="text-sm text-neutral-400 py-4">
                  Bu kategoride ürün bulunmuyor
                </p>
              ) : (
                cat.products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    lang={lang}
                    primaryColor={primaryColor}
                  />
                ))
              )}
            </div>
          </section>
        ))}
      </main>
    </div>
  );
}
