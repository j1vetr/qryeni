import { useLocation } from "wouter";
import { ChevronRight } from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";

const CATEGORY_ICONS: Record<string, string> = {
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
  ozel: "⭐",
};

function getCategoryIcon(slug: string): string {
  const lower = slug.toLowerCase();
  for (const [key, icon] of Object.entries(CATEGORY_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return "🍽️";
}

export default function CategoriesPage() {
  const { menu, accent, loading, error, reload } = useMenu();
  const [, navigate] = useLocation();

  if (loading) return <MenuLoadingScreen accent={accent} />;
  if (error) return <MenuErrorScreen error={error} reload={reload} accent={accent} />;
  if (!menu) return null;

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader showBack />

      <div className="max-w-xl mx-auto px-4 pt-6">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Kategoriler</h1>
        <div className="w-12 h-0.5 mb-4 rounded-full" style={{ background: accent }} />
        <p className="text-sm text-white/50 mb-6 leading-relaxed">
          Menümüzü keşfedin. Her tabak, özenle seçilmiş malzemelerle hazırlandı.
        </p>

        <div className="space-y-3">
          {menu.categories.map((cat) => {
            const firstProduct = cat.products[0];
            return (
              <button
                key={cat.slug}
                onClick={() => navigate(`/categories/${cat.slug}`)}
                className="w-full flex items-center gap-4 p-4 bg-[#141414] rounded-2xl border border-white/5 hover:bg-[#1a1a1a] transition-colors text-left"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                  style={{
                    border: `1.5px solid ${accent}`,
                    background: `${accent}11`,
                    color: accent,
                  }}
                >
                  {getCategoryIcon(cat.slug)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white text-base">{cat.name}</div>
                  <div className="text-xs text-white/40 mt-0.5">
                    {cat.products.length} seçenek
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {firstProduct?.imageUrl ? (
                    <img
                      src={firstProduct.imageUrl}
                      alt={firstProduct.name}
                      className="w-14 h-14 rounded-xl object-cover"
                    />
                  ) : (
                    <div
                      className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                      style={{ background: `${accent}11` }}
                    >
                      🍽️
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-white/30" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
