import { useLocation } from "wouter";
import { ArrowLeft, Globe, ChevronDown } from "lucide-react";
import { useMenu, LANG_FLAGS } from "@/contexts/menu-context";
import { useState, useRef, useEffect } from "react";

interface MenuHeaderProps {
  showBack?: boolean;
}

export default function MenuHeader({ showBack }: MenuHeaderProps) {
  const { menu, lang, setLang } = useMenu();
  const [, navigate] = useLocation();
  const [langOpen, setLangOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 bg-[#0A0A0A]/90 backdrop-blur-md border-b border-white/8">
      <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
        <div className="w-8 flex-shrink-0">
          {showBack && (
            <button
              onClick={() => window.history.back()}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 text-white" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center">
          {menu?.restaurant.logoUrl ? (
            <img
              src={menu.restaurant.logoUrl}
              alt={menu.restaurant.name}
              className="h-8 object-contain"
            />
          ) : (
            <span className="font-bold text-white tracking-widest text-sm uppercase">
              {menu?.restaurant.name ?? "LUNA"}
            </span>
          )}
          <span className="text-[9px] tracking-[0.2em] text-white/30 uppercase">
            Kitchen &amp; Bar
          </span>
        </div>

        <div ref={dropRef} className="w-auto flex-shrink-0 relative">
          <button
            onClick={() => setLangOpen((v) => !v)}
            className="flex items-center gap-1 px-2 py-1.5 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors text-white text-xs font-medium"
          >
            <Globe className="w-3.5 h-3.5 opacity-60" />
            <span>{lang.toUpperCase()}</span>
            <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && menu && menu.languages.length > 1 && (
            <div className="absolute right-0 top-full mt-2 min-w-[120px] bg-[#1C1C1C] rounded-xl border border-white/10 shadow-xl overflow-hidden z-50">
              {menu.languages.map((l) => (
                <button
                  key={l.code}
                  onClick={() => {
                    setLang(l.code);
                    setLangOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
                  style={lang === l.code ? { color: "var(--luna-accent)" } : {}}
                >
                  <span>{LANG_FLAGS[l.code] ?? l.code}</span>
                  <span>{l.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
