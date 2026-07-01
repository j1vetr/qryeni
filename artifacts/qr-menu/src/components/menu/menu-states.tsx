interface MenuLoadingProps {
  accent: string;
}

export function MenuLoadingScreen({ accent }: MenuLoadingProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A]">
      <div
        className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin mb-4"
        style={{ borderColor: `${accent} transparent transparent transparent` }}
      />
      <p className="text-sm text-white/40">Menü yükleniyor...</p>
    </div>
  );
}

interface MenuErrorProps {
  error: string;
  reload: () => void;
  accent: string;
}

export function MenuErrorScreen({ error, reload, accent }: MenuErrorProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0A0A0A] px-8 text-center">
      <div className="text-4xl mb-4">😔</div>
      <h2 className="text-lg font-bold text-white mb-2">Bir sorun oluştu</h2>
      <p className="text-sm text-white/40 mb-6">{error}</p>
      <button
        onClick={reload}
        className="px-6 py-2.5 rounded-full text-sm font-semibold transition-opacity hover:opacity-80"
        style={{ background: accent, color: "#0A0A0A" }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}
