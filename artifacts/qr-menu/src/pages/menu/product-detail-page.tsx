import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { ChevronDown } from "lucide-react";
import { useMenu, formatPrice } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";
import { apiFetch } from "@/lib/api";
import { t } from "@/lib/i18n";

import { getAllergenIcon, getAllergenLabel } from "@/lib/allergens";

export default function ProductDetailPage() {
  const { menu, lang, accent, loading, error, reload } = useMenu();
  const [, params] = useRoute("/categories/:categorySlug/:productSlug");
  const [, navigate] = useLocation();
  const [ingredientsOpen, setIngredientsOpen] = useState(false);
  const tracked = { current: false };
  const tr = t(lang);

  const categorySlug = params?.categorySlug;
  const productSlug = params?.productSlug;

  const category = menu?.categories.find((c) => c.slug === categorySlug);
  const product = category?.products.find((p) => p.slug === productSlug);

  useEffect(() => {
    if (product && !tracked.current) {
      tracked.current = true;
      apiFetch(`/products/${product.id}/view`, {
        method: "POST",
        body: JSON.stringify({ lang }),
      }).catch(() => {});
    }
  }, [product?.id]);

  if (loading) return <MenuLoadingScreen accent={accent} />;
  if (error) return <MenuErrorScreen error={error} reload={reload} accent={accent} />;

  if (!product || !category) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="text-center text-white/40">
          <div className="text-4xl mb-3">🍽️</div>
          <p>{tr.productNotFound}</p>
        </div>
      </div>
    );
  }

  const nf = product.nutritionFacts;
  const kcal = product.calories ?? nf?.energy;
  const kj = kcal ? Math.round(kcal * 4.184) : null;

  const maxMacro = Math.max(nf?.protein ?? 0, nf?.carbs ?? 0, nf?.fat ?? 0, 1);

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader showBack />

      {/* Hero Image */}
      {product.imageUrl ? (
        <div className="w-full bg-[#0A0A0A]">
          <img src={product.imageUrl} alt={product.name} className="w-full h-auto block" />
        </div>
      ) : (
        <div
          className="w-full"
          style={{ height: "52vw", maxHeight: "280px", minHeight: "180px", background: `linear-gradient(180deg, ${accent}22 0%, #0A0A0A 100%)` }}
        />
      )}

      <div className="max-w-xl mx-auto px-4 pt-4 space-y-5">

        {/* Title + Price */}
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">{product.name}</h1>
          {product.allergenNote && (
            <p className="text-sm font-medium mb-2" style={{ color: accent }}>
              {product.allergenNote}
            </p>
          )}
          {product.description && (
            <p className="text-sm text-white/50 leading-relaxed">{product.description}</p>
          )}
          <div className="flex items-center justify-between mt-3">
            <span className="text-2xl font-bold" style={{ color: accent }}>
              {formatPrice(product.price, product.currency)}
            </span>
          </div>
        </div>

        {/* Energy cards */}
        {(kcal || kj) && (
          <div className="grid grid-cols-2 gap-2.5">
            {kcal && (
              <div className="bg-[#141414] rounded-xl px-3 py-2.5 border border-white/8 flex items-center gap-2.5">
                <span className="text-xl flex-shrink-0 leading-none">🔥</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/35 tracking-widest uppercase leading-none mb-1.5 text-center">kcal · {tr.calories}</div>
                  <div className="text-xl font-bold text-white leading-none text-center">{kcal}</div>
                </div>
              </div>
            )}
            {kj && (
              <div className="bg-[#141414] rounded-xl px-3 py-2.5 border border-white/8 flex items-center gap-2.5">
                <span className="text-xl flex-shrink-0 leading-none">⚡</span>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] text-white/35 tracking-widest uppercase leading-none mb-1.5 text-center">kJ · {tr.energy}</div>
                  <div className="text-xl font-bold text-white leading-none text-center">{kj}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Allergens */}
        {product.allergens && product.allergens.length > 0 && (
          <div>
            <h2 className="text-base font-bold text-white mb-3">{tr.allergens}</h2>
            <div className="grid grid-cols-4 gap-3">
              {product.allergens.map((a) => (
                <div key={a} className="flex flex-col items-center gap-1">
                  <div
                    className="w-12 h-12 rounded-full bg-[#1C1C1C] flex items-center justify-center text-xl border border-white/5"
                  >
                    {getAllergenIcon(a)}
                  </div>
                  <span className="text-[10px] text-white/40 text-center leading-tight">{getAllergenLabel(a, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ingredients accordion */}
        {product.ingredients && (
          <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
            <button
              onClick={() => setIngredientsOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-4"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{tr.ingredients}</span>
              </div>
              <ChevronDown
                className="w-4 h-4 text-white/40 transition-transform"
                style={{ transform: ingredientsOpen ? "rotate(180deg)" : "none" }}
              />
            </button>
            {ingredientsOpen && (
              <div className="px-4 pb-4">
                <p className="text-sm text-white/50 leading-relaxed">{product.ingredients}</p>
              </div>
            )}
          </div>
        )}

        {/* Nutrition bars */}
        {nf && (nf.protein || nf.carbs || nf.fat) ? (
          <div className="bg-[#141414] rounded-2xl border border-white/5 overflow-hidden">
            <div className="px-5 pt-5 pb-1">
              <h2 className="text-sm font-bold text-white/60 tracking-widest">{tr.nutritionFacts}</h2>
            </div>
            <div className="px-5 pb-5 pt-4 space-y-4">
              {[
                { label: tr.protein, value: nf.protein },
                { label: tr.carbs, value: nf.carbs },
                { label: tr.fat, value: nf.fat },
              ].map(({ label, value }) =>
                value != null ? (
                  <div key={label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/60">{label}</span>
                      <span className="text-sm font-bold text-white">{value} g</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(value / maxMacro) * 100}%`, background: accent }}
                      />
                    </div>
                  </div>
                ) : null
              )}
            </div>
          </div>
        ) : null}


        {/* Back button */}
        <button
          onClick={() => navigate(`/categories/${categorySlug}`)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl border text-sm font-bold tracking-widest transition-colors hover:bg-white/5"
          style={{ borderColor: `${accent}44`, color: accent }}
        >
          {tr.backToMenu}
        </button>

      </div>
      <BottomNav />
    </div>
    </PageTransition>
  );
}
