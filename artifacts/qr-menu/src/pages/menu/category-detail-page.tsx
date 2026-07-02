import { useRoute, useLocation } from "wouter";
import { useMenu, formatPrice } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";
import { t } from "@/lib/i18n";

export default function CategoryDetailPage() {
  const { menu, lang, accent, loading, error, reload } = useMenu();
  const [, params] = useRoute("/categories/:categorySlug");
  const [, navigate] = useLocation();
  const tr = t(lang);

  const categorySlug = params?.categorySlug;
  const category = menu?.categories.find((c) => c.slug === categorySlug);

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

        <h1 className="text-3xl font-bold text-white tracking-tight mb-4">{category.name}</h1>

        {/* Product list */}
        {category.products.length === 0 && (
          <p className="mt-6 text-center text-sm text-white/40">{tr.noResults}</p>
        )}
        <div className="space-y-3">
          {category.products.map((product) => (
            <button
              key={product.id}
              onClick={() => navigate(`/categories/${categorySlug}/${product.slug}`)}
              className="w-full bg-[#141414] rounded-2xl overflow-hidden border border-white/5 hover:bg-[#1a1a1a] transition-colors text-left"
            >
              {/* Landscape image — 16:9 */}
              <div className="w-full aspect-video bg-[#1C1C1C]">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center text-4xl"
                    style={{ background: `${accent}11` }}
                  >
                    🍽️
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="px-4 py-3">
                <h3 className="font-bold text-white text-sm leading-snug mb-1">{product.name}</h3>
                {product.description && (
                  <p className="text-xs text-white/40 line-clamp-2 mb-2">{product.description}</p>
                )}
                <div className="flex items-center justify-between mt-1">
                  <span className="text-sm font-bold" style={{ color: accent }}>
                    {formatPrice(product.price, product.currency)}
                  </span>
                  <span className="text-xs font-medium" style={{ color: accent }}>
                    {tr.viewDetails}
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav />
    </div>
    </PageTransition>
  );
}
