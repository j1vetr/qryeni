import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { Eye } from "lucide-react";
import { useMenu, formatPrice } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";
import { apiFetch } from "@/lib/api";
import { t } from "@/lib/i18n";

type TagSource = { allergens?: string[] | null; allergenNote?: string | null; specialNote?: string | null };

function deriveProductTags(p: TagSource): string[] {
  const tags = new Set<string>();
  for (const a of p.allergens ?? []) {
    const tg = a.trim();
    if (tg.length > 1 && tg.length < 30) tags.add(tg);
  }
  for (const field of [p.allergenNote, p.specialNote]) {
    if (!field) continue;
    for (const part of field.split(/[,;\/]/)) {
      const tg = part.trim();
      if (tg.length > 1 && tg.length < 30) tags.add(tg);
    }
  }
  return Array.from(tags);
}

export default function CategoryDetailPage() {
  const { menu, lang, accent, loading, error, reload } = useMenu();
  const [, params] = useRoute("/categories/:categorySlug");
  const [, navigate] = useLocation();
  const [activeFilter, setActiveFilter] = useState("all");
  const [viewCounts, setViewCounts] = useState<Record<number, number>>({});
  const tr = t(lang);

  const categorySlug = params?.categorySlug;
  const category = menu?.categories.find((c) => c.slug === categorySlug);

  useEffect(() => {
    apiFetch<Record<number, number>>("/analytics/product-views/public").then(setViewCounts).catch(() => {});
  }, []);

  if (loading) return <MenuLoadingScreen accent={accent} />;
  if (error) return <MenuErrorScreen error={error} reload={reload} accent={accent} />;

  if (!menu || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center text-white/40">
          <div className="text-4xl mb-3">🍽️</div>
          <p>{tr.categoryNotFound}</p>
        </div>
      </div>
    );
  }

  const allTags = Array.from(new Set(category.products.flatMap((p) => deriveProductTags(p))));
  const filters = allTags.length > 0 ? ["all", ...allTags] : [];
  const filtered =
    activeFilter === "all"
      ? category.products
      : category.products.filter((p) => deriveProductTags(p).includes(activeFilter));

  function formatCount(n: number): string {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
    return String(n);
  }

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader showBack />

      <div className="max-w-xl mx-auto px-4 pt-4">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-xs mb-3">
          <button onClick={() => navigate("/")} className="hover:opacity-80 transition-opacity" style={{ color: accent }}>
            {tr.home}
          </button>
          <span className="text-white/30">›</span>
          <span style={{ color: accent }}>{category.name}</span>
        </div>

        <h1 className="text-3xl font-bold text-white tracking-tight mb-1">{category.name}</h1>
        {category.description && (
          <p className="text-sm text-white/50 mb-4">{category.description}</p>
        )}

        {/* Filter chips */}
        {filters.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className="flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-medium border transition-all"
                style={
                  activeFilter === f
                    ? { background: accent, color: "#0A0A0A", borderColor: accent }
                    : { color: "rgba(255,255,255,0.5)", borderColor: "rgba(255,255,255,0.1)" }
                }
              >
                {f === "all" ? tr.all : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {/* Product list */}
        {filtered.length === 0 && (
          <p className="mt-6 text-center text-sm text-white/40">{tr.noResults}</p>
        )}
        <div className="space-y-3">
          {filtered.map((product) => {
            const vc = viewCounts[product.id] ?? 0;
            return (
              <button
                key={product.id}
                onClick={() => navigate(`/categories/${categorySlug}/${product.slug}`)}
                className="w-full flex gap-3 bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:bg-[#1a1a1a] transition-colors text-left"
              >
                <div className="w-24 h-full flex-shrink-0 bg-[#1C1C1C] self-stretch min-h-[96px] flex items-center justify-center">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-contain" />
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl"
                      style={{ background: `${accent}11` }}
                    >
                      🍽️
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 p-3">
                  <h3 className="font-bold text-white text-sm leading-snug mb-1">{product.name}</h3>
                  {product.description && (
                    <p className="text-xs text-white/40 line-clamp-2 mb-2">{product.description}</p>
                  )}
                  {vc > 0 && (
                    <div className="flex items-center gap-1 text-xs text-white/30 mb-2">
                      <Eye className="w-3 h-3" />
                      <span>{formatCount(vc)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: accent }}>
                      {formatPrice(product.price, product.currency)}
                    </span>
                    <span className="text-xs font-medium" style={{ color: accent }}>
                      {tr.viewDetails}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Disclaimer bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0A0A0A]/90 border-t border-white/5 pb-safe">
        <p className="text-center text-xs text-white/30 italic px-4 py-2">
          {tr.qrDisclaimer}
        </p>
      </div>
    </div>
    </PageTransition>
  );
}
