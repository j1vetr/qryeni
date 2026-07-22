import { useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Download, CheckCircle, AlertCircle, Loader2, Play } from "lucide-react";

interface LogEvent { type: "log"; msg: string }
interface ProgressEvent { type: "progress"; done: number; total: number; label: string }
interface DoneEvent { type: "done"; categories: number; products: number; errors: string[] }
interface ErrorEvent { type: "error"; msg: string }
type ImportEvent = LogEvent | ProgressEvent | DoneEvent | ErrorEvent;

type Status = "idle" | "running" | "done" | "error";

export default function ImportPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [result, setResult] = useState<DoneEvent | null>(null);
  const [fatal, setFatal] = useState<string | null>(null);
  const logBoxRef = useRef<HTMLDivElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);

  function addLog(msg: string) {
    setLogs((prev) => {
      const next = [...prev, msg];
      setTimeout(() => {
        if (logBoxRef.current) logBoxRef.current.scrollTop = logBoxRef.current.scrollHeight;
      }, 20);
      return next;
    });
  }

  function startImport() {
    if (status === "running") return;
    setStatus("running");
    setLogs([]);
    setProgress(null);
    setResult(null);
    setFatal(null);

    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("POST", `${base}/api/import/scrape`, true);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "text/event-stream");

    let buffer = "";

    xhr.onprogress = () => {
      const newChunk = xhr.responseText.slice(buffer.length);
      buffer = xhr.responseText;

      const lines = newChunk.split("\n");
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        try {
          const ev = JSON.parse(line.slice(6)) as ImportEvent;
          if (ev.type === "log") addLog(ev.msg);
          if (ev.type === "progress") setProgress({ done: ev.done, total: ev.total, label: ev.label });
          if (ev.type === "done") { setResult(ev); setStatus("done"); }
          if (ev.type === "error") { setFatal(ev.msg); setStatus("error"); }
        } catch { /* partial JSON — ignore */ }
      }
    };

    xhr.onerror = () => { setFatal("Ağ hatası"); setStatus("error"); };
    xhr.onload = () => { if (status === "running") setStatus("done"); };

    xhr.send();
  }

  const pct = progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white mb-1">Eski Menüden İçe Aktar</h1>
        <p className="text-sm text-neutral-400">
          <span className="font-mono text-neutral-300">yoros.dijita.com.tr</span> sitesindeki
          tüm kategoriler, ürünler ve görseller çekilerek sisteme aktarılır.
          Mevcut kayıtlara dokunulmaz — sadece yeni olanlar eklenir.
        </p>
      </div>

      {/* Info box */}
      <div className="bg-neutral-800 border border-neutral-700 rounded-lg p-4 text-sm text-neutral-300 space-y-1">
        <div className="font-medium text-white mb-2">İçe aktarılacaklar:</div>
        <div>• 17 kategori (Döner Çeşitleri, Et Çeşitleri, Salatalar…)</div>
        <div>• 216 ürün + her birinin Türkçe adı ve açıklaması</div>
        <div>• Tüm kategori ve ürün görselleri (indirilip optimize edilir)</div>
        <div className="pt-2 text-neutral-400 text-xs">
          Görseller sunucu tarafında indirilip 1200×1200 px sıkıştırılarak kaydedilir.
          İşlem 5–10 dakika sürebilir.
        </div>
      </div>

      {/* Start button */}
      {status === "idle" && (
        <button
          onClick={startImport}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] hover:bg-[#b8963e] text-black font-semibold rounded-lg transition-colors"
        >
          <Play className="w-4 h-4" />
          İçe Aktarmayı Başlat
        </button>
      )}

      {status === "running" && (
        <div className="flex items-center gap-3 text-sm text-neutral-300">
          <Loader2 className="w-4 h-4 animate-spin text-[#C9A84C]" />
          <span>Aktarılıyor… lütfen sayfayı kapatmayın.</span>
        </div>
      )}

      {/* Progress bar */}
      {progress && status === "running" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-neutral-400">
            <span className="truncate max-w-xs">{progress.label}</span>
            <span>{pct}%</span>
          </div>
          <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C9A84C] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      )}

      {/* Log box */}
      {logs.length > 0 && (
        <div
          ref={logBoxRef}
          className="bg-neutral-950 border border-neutral-800 rounded-lg p-3 h-64 overflow-y-auto font-mono text-xs text-neutral-300 space-y-0.5"
        >
          {logs.map((l, i) => (
            <div key={i} className={l.startsWith("  ❌") ? "text-red-400" : l.startsWith("  ✓") ? "text-green-400" : l.startsWith("✅") ? "text-green-300 font-bold" : ""}>{l}</div>
          ))}
        </div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="bg-green-950/40 border border-green-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <CheckCircle className="w-5 h-5" />
            Aktarım tamamlandı
          </div>
          <div className="text-sm text-green-300">
            {result.categories} kategori ve {result.products} ürün eklendi.
          </div>
          {result.errors.length > 0 && (
            <div className="text-xs text-yellow-400 mt-2">
              {result.errors.length} hata oluştu:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 10 && <li>…ve {result.errors.length - 10} tane daha</li>}
              </ul>
            </div>
          )}
          <button
            onClick={() => { setStatus("idle"); setLogs([]); setProgress(null); setResult(null); }}
            className="mt-2 px-4 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Tekrar Çalıştır
          </button>
        </div>
      )}

      {/* Fatal error */}
      {status === "error" && fatal && (
        <div className="bg-red-950/40 border border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-1">
            <AlertCircle className="w-5 h-5" />
            Hata oluştu
          </div>
          <div className="text-sm text-red-300 font-mono">{fatal}</div>
          <button
            onClick={() => setStatus("idle")}
            className="mt-3 px-4 py-1.5 text-sm bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors"
          >
            Tekrar Dene
          </button>
        </div>
      )}
    </div>
  );
}
