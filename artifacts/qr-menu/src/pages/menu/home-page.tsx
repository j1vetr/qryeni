import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Search, ArrowRight, Info } from "lucide-react";
import { useMenu, formatPrice } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";
import { apiFetch } from "@/lib/api";
import { t } from "@/lib/i18n";

const CATEGORY_ICONS: Record<string, string> = {
  default: "🍽️",
  baslangiclar: "🥗",
  salatalar: "🥙",
  corbalar: "🍲",
  "ana-yemekler": "🥩",
  tatlilar: "🍮",
  icecekler: "🥤",
  pizzalar: "🍕",
  burgerler: "🍔",
  makarnalar: "🍝",
  deniz: "🦞",
  vejetaryen: "🌱",
  vegan: "🌿",
};

function getCategoryIcon(slug: string): string {
  const lower = slug.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return CATEGORY_ICONS.default;
}

export default function HomePage() {
  const { menu, lang, accent, loading, error, reload } = useMenu();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [activeSlug, setActiveSlug] = useState<string>("all");
  const [viewCounts, setViewCounts] = useState<Record<number, number>>({});
  const trackedRef = { current: false };
  const tr = t(lang);

  useEffect(() => {
    apiFetch<Record<number, number>>("/analytics/product-views/public").then(setViewCounts).catch(() => {});
  }, []);

  useEffect(() => {
    if (menu && !trackedRef.current) {
      trackedRef.current = true;
      apiFetch("/menu/view", { method: "POST", body: JSON.stringify({ lang }) }).catch(() => {});
    }
  }, [menu]);

  if (loading) return <MenuLoadingScreen accent={accent} />;
  if (error) return <MenuErrorScreen error={error} reload={reload} accent={accent} />;
  if (!menu) return null;

  const r = menu.restaurant;

  const allProducts = menu.categories.flatMap((c) => c.products.map((p) => ({ ...p, categorySlug: c.slug })));
  const featuredProducts = allProducts.filter((p) => p.imageUrl).slice(0, 6);

  const searchResults = search.trim()
    ? allProducts.filter((p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.description?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader />

      {/* Hero */}
      <div className="relative px-4 pt-6 pb-4 max-w-xl mx-auto">
        <div className="flex gap-4 items-start">
          <div className="flex-1">
            <p className="text-sm font-medium mb-2" style={{ color: accent }}>
              {tr.welcome}
            </p>
            <h1 className="text-3xl font-bold text-white leading-tight tracking-tight mb-3">
              {r.name ? tr.welcomeTagline(r.name) : tr.welcomeSub}
            </h1>
            {r.description && (
              <p className="text-sm text-white/50 mb-4 leading-relaxed">{r.description}</p>
            )}
            {!r.description && (
              <p className="text-sm text-white/50 mb-4">
                {tr.welcomeSub}
              </p>
            )}
            <button
              onClick={() => navigate("/categories")}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full border text-sm font-semibold tracking-wide transition-colors hover:bg-white/5"
              style={{ borderColor: accent, color: accent }}
            >
              {tr.exploreMenu} <ArrowRight className="w-4 h-4" />
            </button>
          </div>
          {r.heroImageUrl && (
            <div className="w-36 h-36 flex-shrink-0 rounded-2xl overflow-hidden">
              <img src={r.heroImageUrl} alt={r.name} className="w-full h-full object-cover" />
            </div>
          )}
          {!r.heroImageUrl && (
            <div
              className="w-36 h-36 flex-shrink-0 rounded-2xl"
              style={{ background: `linear-gradient(135deg, ${accent}22 0%, #1C1C1C 100%)` }}
            />
          )}
        </div>
      </div>

      {/* Search */}
      <div className="px-4 mb-5 max-w-xl mx-auto">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tr.searchPlaceholder}
            className="w-full bg-white/5 border border-white/8 rounded-xl pl-9 pr-4 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-colors"
          />
        </div>
        {search && searchResults.length > 0 && (
          <div className="mt-2 bg-[#141414] rounded-xl border border-white/8 overflow-hidden">
            {searchResults.slice(0, 5).map((p) => (
              <button
                key={p.id}
                onClick={() => navigate(`/categories/${p.categorySlug}/${p.slug}`)}
                className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0"
              >
                {p.imageUrl && (
                  <img src={p.imageUrl} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-white truncate">{p.name}</div>
                  <div className="text-xs text-white/40 truncate">{p.description}</div>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: accent }}>
                  {formatPrice(p.price, p.currency)}
                </span>
              </button>
            ))}
          </div>
        )}
        {search && searchResults.length === 0 && (
          <p className="mt-3 text-center text-sm text-white/40">{tr.noResults}</p>
        )}
      </div>

      {/* Category Icon Bar */}
      <div className="mb-6 max-w-xl mx-auto">
        <div className="flex gap-3 overflow-x-auto px-4 scrollbar-hide pb-1">
          <button
            onClick={() => setActiveSlug("all")}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all"
              style={{
                background: activeSlug === "all" ? `${accent}22` : "rgba(255,255,255,0.05)",
                border: activeSlug === "all" ? `2px solid ${accent}` : "2px solid transparent",
              }}
            >
              🍽️
            </div>
            <span
              className="text-[10px] font-medium"
              style={{ color: activeSlug === "all" ? accent : "rgba(255,255,255,0.5)" }}
            >
              {tr.all}
            </span>
            {activeSlug === "all" && (
              <div className="w-4 h-0.5 rounded-full" style={{ background: accent }} />
            )}
          </button>
          {menu.categories.map((cat) => (
            <button
              key={cat.slug}
              onClick={() => {
                setActiveSlug(cat.slug);
                navigate(`/categories/${cat.slug}`);
              }}
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl transition-all"
                style={{
                  background: activeSlug === cat.slug ? `${accent}22` : "rgba(255,255,255,0.05)",
                  border: activeSlug === cat.slug ? `2px solid ${accent}` : "2px solid transparent",
                }}
              >
                {getCategoryIcon(cat.slug)}
              </div>
              <span
                className="text-[10px] font-medium text-center max-w-[56px] leading-tight"
                style={{ color: activeSlug === cat.slug ? accent : "rgba(255,255,255,0.5)" }}
              >
                {cat.name}
              </span>
              {activeSlug === cat.slug && (
                <div className="w-4 h-0.5 rounded-full" style={{ background: accent }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Featured */}
      <div className="px-4 max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">{tr.featured}</h2>
          <button
            onClick={() => navigate("/categories")}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: accent }}
          >
            {tr.seeAll} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {featuredProducts.length === 0 && allProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {allProducts.slice(0, 6).map((p, i) => (
              <ProductCard key={p.id} product={p} accent={accent} isFirst={i === 0} navigate={navigate} viewCount={viewCounts[p.id]} chefsSpecialLabel={tr.chefsSpecial} />
            ))}
          </div>
        )}
        {featuredProducts.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {featuredProducts.map((p, i) => (
              <ProductCard key={p.id} product={p} accent={accent} isFirst={i === 0} navigate={navigate} viewCount={viewCounts[p.id]} chefsSpecialLabel={tr.chefsSpecial} />
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
}

function ProductCard({
  product,
  accent,
  isFirst,
  navigate,
  chefsSpecialLabel,
}: {
  product: { id: number; slug: string; name: string; description?: string; price: number; currency: string; imageUrl?: string; categorySlug: string };
  accent: string;
  isFirst: boolean;
  navigate: (to: string) => void;
  viewCount?: number;
  chefsSpecialLabel: string;
}) {
  return (
    <button
      onClick={() => navigate(`/categories/${product.categorySlug}/${product.slug}`)}
      className="bg-[#141414] rounded-2xl overflow-hidden text-left relative hover:bg-[#1a1a1a] transition-colors"
    >
      {isFirst && (
        <div
          className="absolute top-2 left-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-semibold"
          style={{ background: `${accent}22`, color: accent, border: `1px solid ${accent}44` }}
        >
          {chefsSpecialLabel}
        </div>
      )}
      <div className="w-full aspect-[4/3] bg-[#1C1C1C] overflow-hidden flex items-center justify-center">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: `linear-gradient(135deg, ${accent}11 0%, #1C1C1C 100%)` }}
          >
            🍽️
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-semibold text-white leading-snug mb-1">{product.name}</h3>
        {product.description && (
          <p className="text-xs text-white/40 line-clamp-2 mb-2">{product.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm font-bold" style={{ color: accent }}>
            {formatPrice(product.price, product.currency)}
          </span>
          <div className="w-7 h-7 rounded-full border flex items-center justify-center" style={{ borderColor: `${accent}44`, color: accent }}>
            <Info className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </button>
  );
}
