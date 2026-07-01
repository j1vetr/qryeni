import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Eye, Package, TrendingUp, Globe, Layers } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";

interface Stats {
  totalMenuViews: number;
  totalProductViews: number;
  todayViews: number;
  weeklyMenuViews: number;
  totalProducts: number;
  totalCategories: number;
}

interface TimeseriesRow {
  date: string;
  menuViews: number;
  productViews: number;
}

interface TopProduct {
  productId: number;
  name: string;
  count: number;
}

interface LangBreakdown {
  languageCode: string | null;
  menuViews: number;
  productViews: number;
  total: number;
}

const LANG_NAMES: Record<string, string> = {
  tr: "🇹🇷 Türkçe",
  en: "🇬🇧 İngilizce",
  ru: "🇷🇺 Rusça",
  ar: "🇸🇦 Arapça",
};

function StatCard({ label, value, icon: Icon, sub }: { label: string; value: number; icon: typeof Eye; sub?: string }) {
  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-neutral-400 uppercase tracking-widest font-medium">{label}</span>
        <Icon className="w-4 h-4 text-neutral-500" />
      </div>
      <div className="text-3xl font-bold text-white">{value.toLocaleString("tr-TR")}</div>
      {sub && <div className="text-xs text-neutral-500 mt-1">{sub}</div>}
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesRow[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [langBreakdown, setLangBreakdown] = useState<LangBreakdown[]>([]);
  const [period, setPeriod] = useState<"7d" | "30d" | "90d">("7d");

  useEffect(() => {
    apiFetch<Stats>("/analytics/dashboard").then(setStats);
    apiFetch<TopProduct[]>("/analytics/top-products").then(setTopProducts);
    apiFetch<LangBreakdown[]>("/analytics/language-breakdown").then(setLangBreakdown);
  }, []);

  useEffect(() => {
    apiFetch<TimeseriesRow[]>(`/analytics/timeseries?period=${period}`).then(setTimeseries);
  }, [period]);

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Genel Bakış</h1>
        <p className="text-neutral-400 text-sm mt-1">Menü performans istatistikleri</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard label="Menü Görüntüleme" value={stats.totalMenuViews} icon={Eye} sub={`Bu hafta: ${stats.weeklyMenuViews}`} />
          <StatCard label="Ürün Görüntüleme" value={stats.totalProductViews} icon={Package} />
          <StatCard label="Bugün" value={stats.todayViews} icon={TrendingUp} />
          <StatCard label="Toplam Ürün" value={stats.totalProducts} icon={Layers} />
          <StatCard label="Kategori" value={stats.totalCategories} icon={Globe} />
        </div>
      )}

      {/* Timeseries chart */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-sm font-medium text-white uppercase tracking-widest">Görüntüleme Trendi</h2>
          <div className="flex gap-1">
            {(["7d", "30d", "90d"] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 text-xs rounded-full transition-colors ${
                  period === p ? "bg-white text-black font-semibold" : "text-neutral-400 hover:text-white"
                }`}
              >
                {p === "7d" ? "7 gün" : p === "30d" ? "30 gün" : "90 gün"}
              </button>
            ))}
          </div>
        </div>
        {timeseries.length > 0 ? (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={timeseries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#737373", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis tick={{ fill: "#737373", fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: "#171717", border: "1px solid #404040", borderRadius: "8px" }}
                labelStyle={{ color: "#e5e5e5", fontSize: 12 }}
                itemStyle={{ fontSize: 12 }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: "#737373" }}
                formatter={(value) => value === "menuViews" ? "Menü" : "Ürün"}
              />
              <Line type="monotone" dataKey="menuViews" stroke="#ffffff" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="productViews" stroke="#525252" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[220px] flex items-center justify-center text-neutral-600 text-sm">
            Henüz veri yok
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top products */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-white uppercase tracking-widest mb-4">En Çok Görüntülenen Ürünler</h2>
          {topProducts.length === 0 ? (
            <p className="text-neutral-600 text-sm">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={p.productId ?? i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-neutral-600 text-xs w-5">{i + 1}</span>
                    <span className="text-sm text-neutral-200">{p.name}</span>
                  </div>
                  <span className="text-sm text-neutral-400">{p.count} görüntüleme</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Language breakdown */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <h2 className="text-sm font-medium text-white uppercase tracking-widest mb-4">Dil Dağılımı</h2>
          {langBreakdown.length === 0 ? (
            <p className="text-neutral-600 text-sm">Henüz veri yok</p>
          ) : (
            <div className="space-y-3">
              {langBreakdown
                .filter((l) => l.languageCode)
                .map((l) => (
                  <div key={l.languageCode} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-neutral-200">
                        {LANG_NAMES[l.languageCode ?? ""] ?? l.languageCode ?? "Bilinmiyor"}
                      </span>
                      <span className="text-sm text-neutral-400">{l.total} toplam</span>
                    </div>
                    <div className="flex gap-2 text-xs text-neutral-500">
                      <span>Menü: {l.menuViews}</span>
                      <span>·</span>
                      <span>Ürün: {l.productViews}</span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
