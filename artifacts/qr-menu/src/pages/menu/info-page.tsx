import { Info, QrCode } from "lucide-react";
import { useMenu } from "@/contexts/menu-context";
import MenuHeader from "@/components/menu/menu-header";
import BottomNav from "@/components/menu/bottom-nav";
import PageTransition from "@/components/menu/page-transition";

export default function InfoPage() {
  const { accent } = useMenu();

  return (
    <PageTransition>
    <div className="luna-menu min-h-screen pb-24">
      <MenuHeader showBack />

      <div className="max-w-xl mx-auto px-4 pt-10 flex flex-col items-center text-center space-y-6">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: `${accent}18` }}
        >
          <QrCode className="w-10 h-10" style={{ color: accent }} />
        </div>

        <div>
          <h1 className="text-2xl font-bold text-white mb-3">Dijital Menü</h1>
          <p className="text-sm text-white/50 leading-relaxed">
            Bu menü yalnızca bilgi amaçlıdır. QR kod aracılığıyla sunulan dijital menümüzde
            ürünlerimizi, fiyatlarımızı ve içerik bilgilerini inceleyebilirsiniz.
          </p>
        </div>

        <div className="w-full bg-[#141414] rounded-2xl p-4 border border-white/5 text-left space-y-3">
          {[
            "Sipariş için lütfen servis personelimizle iletişime geçin.",
            "Fiyatlar KDV dahildir.",
            "Alerjen bilgileri ürün detaylarında mevcuttur.",
            "Görseller temsili olup sunumlar değişiklik gösterebilir.",
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: accent }} />
              <p className="text-sm text-white/50">{item}</p>
            </div>
          ))}
        </div>
      </div>

      <BottomNav />
    </div>
    </PageTransition>
  );
}
