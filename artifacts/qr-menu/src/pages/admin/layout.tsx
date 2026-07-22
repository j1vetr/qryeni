import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { apiFetch } from "@/lib/api";
import {
  LayoutDashboard,
  FolderOpen,
  Package,
  Settings,
  LogOut,
  QrCode,
  Menu,
  X,
  Download,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, exact: true },
  { href: "/admin/categories", label: "Kategoriler", icon: FolderOpen },
  { href: "/admin/products", label: "Ürünler", icon: Package },
  { href: "/admin/settings", label: "Ayarlar", icon: Settings },
  { href: "/admin/import", label: "İçe Aktar", icon: Download },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [location, nav] = useLocation();
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    apiFetch<{ username: string }>("/auth/me")
      .then(setUser)
      .catch(() => nav("/admin/login"));
  }, [nav]);

  async function handleLogout() {
    await apiFetch("/auth/logout", { method: "POST" });
    nav("/admin/login");
  }

  const base = import.meta.env.BASE_URL.replace(/\/$/, "");

  const NavLinks = () => (
    <>
      {NAV_ITEMS.map((item) => {
        const href = `${base}${item.href}`;
        const active = item.exact
          ? location === item.href
          : location.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              active
                ? "bg-white text-black"
                : "text-neutral-400 hover:text-white hover:bg-neutral-800"
            }`}
          >
            <item.icon className="w-4 h-4 flex-shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400 text-sm">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-neutral-900 border-r border-neutral-800 fixed inset-y-0 left-0">
        <div className="flex items-center gap-2 px-4 py-5 border-b border-neutral-800">
          <QrCode className="w-5 h-5 text-white" />
          <span className="text-white font-bold text-sm">QR Menü</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <NavLinks />
        </nav>
        <div className="px-3 py-4 border-t border-neutral-800">
          <div className="text-xs text-neutral-500 px-3 mb-2">{user.username}</div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 bg-neutral-900 h-full flex flex-col">
            <div className="flex items-center justify-between px-4 py-5 border-b border-neutral-800">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">QR Menü</span>
              </div>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-5 h-5 text-neutral-400" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              <NavLinks />
            </nav>
            <div className="px-3 py-4 border-t border-neutral-800">
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-sm text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Çıkış Yap
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 md:ml-56 flex flex-col min-h-screen">
        {/* Mobile topbar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5 text-white" />
          </button>
          <span className="text-white font-bold text-sm">QR Menü</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
