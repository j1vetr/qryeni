import { useLocation } from "wouter";
import { Check } from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import { FlagImg } from "@/components/menu/flag-img";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";
import { t } from "@/lib/i18n";

export default function LanguagePage() {
  const { menu, lang, setLang, accent } = useMenu();
  const [, navigate] = useLocation();
  const tr = t(lang);

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
          {tr.languageTitle}
        </h1>
        <p className="text-sm text-white/50 text-center mb-8 leading-relaxed">
          {tr.languageSub}
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
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-white/5 overflow-hidden">
                  <FlagImg code={l.code} size={32} />
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

      <BottomNav />
    </div>
    </PageTransition>
  );
}
