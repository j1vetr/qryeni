import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { useMenu, LANG_FLAGS } from "@/contexts/menu-context";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";

export default function LanguagePage() {
  const { menu, lang, setLang, accent } = useMenu();
  const [, navigate] = useLocation();

  const languages = menu?.languages ?? [
    { code: "tr", name: "Türkçe" },
    { code: "en", name: "English" },
    { code: "ru", name: "Русский" },
    { code: "ar", name: "العربية" },
  ];

  function handleSelect(code: string) {
    setLang(code);
    navigate("/");
  }

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24 relative overflow-hidden">
      {/* Logo header */}
      <div className="flex flex-col items-center pt-12 pb-8 px-4">
        {menu?.restaurant.logoUrl ? (
          <img src={menu.restaurant.logoUrl} alt={menu.restaurant.name} className="h-12 object-contain mb-2" />
        ) : (
          <div className="mb-2">
            <div className="text-2xl font-bold text-white tracking-widest uppercase">
              {menu?.restaurant.name ?? "LUNA"}
            </div>
            <div className="text-[9px] tracking-[0.3em] text-white/30 uppercase text-center">
              Kitchen &amp; Bar
            </div>
          </div>
        )}
      </div>

      <div className="max-w-xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-white tracking-tight mb-3 text-center">
          Dil Seçimi
        </h1>
        <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
          Lütfen menüyü görüntülemek istediğiniz dili seçin.
        </p>

        <div className="space-y-3">
          {languages.map((l) => {
            const active = lang === l.code;
            return (
              <button
                key={l.code}
                onClick={() => handleSelect(l.code)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl border transition-all text-left"
                style={
                  active
                    ? { borderColor: accent, background: `${accent}11` }
                    : { borderColor: "rgba(255,255,255,0.08)", background: "transparent" }
                }
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-2xl flex-shrink-0 bg-white/5">
                  {LANG_FLAGS[l.code] ?? l.code.toUpperCase()}
                </div>
                <span className="flex-1 font-bold text-white text-base">{l.name}</span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                  style={
                    active
                      ? { background: accent }
                      : { border: "2px solid rgba(255,255,255,0.15)" }
                  }
                >
                  {active && <Check className="w-4 h-4 text-[#0A0A0A]" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Botanical decoration */}
      <div className="absolute bottom-24 right-0 w-48 h-48 pointer-events-none select-none opacity-20">
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M180 180 Q140 120 80 80 Q40 50 10 10" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
          <path d="M120 180 Q110 140 90 100 Q70 60 50 20" stroke="#C9A84C" strokeWidth="1" strokeLinecap="round" fill="none"/>
          <path d="M80 80 Q100 90 110 70 Q120 50 100 40" stroke="#C9A84C" strokeWidth="1" fill="none"/>
          <path d="M80 80 Q60 100 70 120 Q80 130 100 110" stroke="#C9A84C" strokeWidth="1" fill="none"/>
          <path d="M120 130 Q140 120 150 100 Q160 80 140 70" stroke="#C9A84C" strokeWidth="1" fill="none"/>
          <circle cx="175" cy="155" r="8" stroke="#C9A84C" strokeWidth="1.5" fill="none"/>
          <circle cx="160" cy="170" r="5" stroke="#C9A84C" strokeWidth="1" fill="none"/>
          <path d="M160 30 Q150 20 155 10 Q165 5 170 15 Q175 5 185 10 Q190 20 180 30 Q170 35 160 30Z" stroke="#C9A84C" strokeWidth="1" fill="none"/>
        </svg>
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
