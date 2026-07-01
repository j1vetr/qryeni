import { Clock, MapPin, Instagram, Leaf } from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { MenuLoadingScreen, MenuErrorScreen } from "@/components/menu/menu-states";

export default function AboutPage() {
  const { menu, accent, loading, error, reload } = useMenu();

  if (loading) return <MenuLoadingScreen accent={accent} />;
  if (error) return <MenuErrorScreen error={error} reload={reload} accent={accent} />;
  if (!menu) return null;

  const r = menu.restaurant;

  const cards = [
    {
      icon: Clock,
      label: "Çalışma Saatleri",
      value: r.openingHours ?? "Pazartesi – Pazar: 12:00 – 23:30",
    },
    r.address ? { icon: MapPin, label: "Adres", value: r.address } : null,
    r.instagram ? { icon: Instagram, label: "Instagram", value: `@${r.instagram.replace(/^@/, "")}` } : null,
    {
      icon: Leaf,
      label: "Taze, Doğal ve Kaliteli",
      value:
        r.qualityNote ??
        "Tüm yemeklerimiz günlük ve taze malzemelerle hazırlanır. Alerjen içerikler menüde belirtilmiştir. Misafir memnuniyeti bizim için her şeyden önce gelir.",
    },
  ].filter(Boolean) as { icon: typeof Clock; label: string; value: string }[];

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader showBack />

      {/* Hero */}
      <div className="w-full" style={{ height: "52vw", maxHeight: "280px", minHeight: "160px" }}>
        {r.heroImageUrl ? (
          <img src={r.heroImageUrl} alt={r.name} className="w-full h-full object-cover" />
        ) : (
          <div
            className="w-full h-full"
            style={{ background: `linear-gradient(180deg, ${accent}22 0%, #0A0A0A 100%)` }}
          />
        )}
      </div>

      <div className="max-w-xl mx-auto px-4 pt-6 space-y-5">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Hakkımızda</h1>
          <p className="text-sm font-semibold mb-3" style={{ color: accent }}>
            {r.tagline ?? "Lezzet, Tutku ve Kaliteli Deneyim"}
          </p>
          {r.description && (
            <p className="text-sm text-white/50 leading-relaxed">{r.description}</p>
          )}
          {!r.description && (
            <p className="text-sm text-white/50 leading-relaxed">
              {r.name
                ? `${r.name}'da misafirlerimize yalnızca yemek değil, unutulmaz bir deneyim sunuyoruz. Modern dokunuşlarla hazırladığımız tariflerimizde en taze malzemeleri kullanıyor, her detayı sizin için özenle düşünüyoruz.`
                : "Misafirlerimize yalnızca yemek değil, unutulmaz bir deneyim sunuyoruz."}
            </p>
          )}
        </div>

        <div className="space-y-3">
          {cards.map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-start gap-4 p-4 bg-[#1C1C1C] rounded-2xl border border-white/5"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: `${accent}18` }}
              >
                <Icon className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold mb-1" style={{ color: accent }}>{label}</div>
                <div className="text-sm text-white/60 leading-relaxed whitespace-pre-line">{value}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center pt-4 pb-2">
          <p className="text-sm text-white/40 italic mb-2">Keyifli ve lezzet dolu anlar dileriz.</p>
          <p className="text-sm font-semibold" style={{ color: accent }}>
            {r.name ? `${r.name} Ekibi` : "Ekibimiz"}
          </p>
        </div>
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
