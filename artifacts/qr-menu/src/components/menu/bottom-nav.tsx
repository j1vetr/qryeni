import { useLocation, Link } from "wouter";
import { Home, Grid2X2, Users, Globe, Info } from "lucide-react";

const tabs = [
  { href: "/", icon: Home, label: "Ana Sayfa" },
  { href: "/categories", icon: Grid2X2, label: "Kategoriler" },
  { href: "/about", icon: Users, label: "Hakkımızda" },
  { href: "/language", icon: Globe, label: "Dil" },
  { href: "/info", icon: Info, label: "Bilgi" },
];

export default function BottomNav() {
  const [location] = useLocation();

  function isActive(href: string) {
    if (href === "/") return location === "/";
    return location.startsWith(href);
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-t border-white/8 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-2 max-w-xl mx-auto">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-1 px-3 py-1 min-w-[52px]"
            >
              <Icon
                className="w-5 h-5 transition-colors"
                style={{ color: active ? "var(--luna-accent)" : "rgba(255,255,255,0.4)" }}
              />
              <span
                className="text-[10px] font-medium transition-colors"
                style={{ color: active ? "var(--luna-accent)" : "rgba(255,255,255,0.4)" }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
