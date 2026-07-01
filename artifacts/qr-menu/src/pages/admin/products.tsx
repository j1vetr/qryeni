import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, X, GripVertical, Sparkles } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Translation {
  languageCode: string;
  name: string;
  description?: string;
  ingredients?: string;
  allergenNote?: string;
  specialNote?: string;
}

interface NutritionFacts {
  energy?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
}

interface Product {
  id: number;
  categoryId: number;
  slug: string;
  price: number;
  currency?: string;
  imageUrl?: string;
  isActive: boolean;
  sortOrder: number;
  calories?: number;
  allergens?: string[];
  nutritionFacts?: NutritionFacts;
  translations: Translation[];
}

interface Category {
  id: number;
  slug: string;
  translations: Translation[];
}

interface Language {
  id: number;
  code: string;
  name: string;
}

const LANG_FLAGS: Record<string, string> = { tr: "🇹🇷", en: "🇬🇧", ru: "🇷🇺", ar: "🇸🇦" };

function SortableProductRow({
  product,
  categories,
  onEdit,
  onDelete,
}: {
  product: Product;
  categories: Category[];
  onEdit: (p: Product) => void;
  onDelete: (id: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: product.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const trName = product.translations.find((t) => t.languageCode === "tr")?.name ?? product.slug;
  const catName = categories.find((c) => c.id === product.categoryId)?.translations.find((t) => t.languageCode === "tr")?.name ?? "—";

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-3 bg-neutral-900 border border-neutral-800 rounded-lg px-4 py-3">
      <button {...attributes} {...listeners} className="text-neutral-600 hover:text-neutral-400 cursor-grab">
        <GripVertical className="w-4 h-4" />
      </button>
      {product.imageUrl && (
        <img src={product.imageUrl} alt={trName} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-white truncate">{trName}</div>
        <div className="text-xs text-neutral-500">{catName}</div>
      </div>
      <div className="text-sm text-neutral-300 font-medium">
        {product.price > 0 ? `${product.price} ${product.currency ?? "TRY"}` : "—"}
      </div>
      <span className={`text-xs px-2 py-0.5 rounded-full ${product.isActive ? "bg-emerald-900/40 text-emerald-400" : "bg-neutral-800 text-neutral-500"}`}>
        {product.isActive ? "Aktif" : "Pasif"}
      </span>
      <button onClick={() => onEdit(product)} className="text-neutral-500 hover:text-white transition-colors p-1">
        <Pencil className="w-4 h-4" />
      </button>
      <button onClick={() => onDelete(product.id)} className="text-neutral-500 hover:text-red-400 transition-colors p-1">
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}

function ProductModal({
  product,
  categories,
  languages,
  onClose,
  onSave,
}: {
  product: Partial<Product> | null;
  categories: Category[];
  languages: Language[];
  onClose: () => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [categoryId, setCategoryId] = useState(product?.categoryId ?? categories[0]?.id ?? 0);
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [calories, setCalories] = useState(String(product?.calories ?? ""));
  const [allergens, setAllergens] = useState((product?.allergens ?? []).join(", "));
  const [nutrition, setNutrition] = useState<NutritionFacts>(product?.nutritionFacts ?? {});
  const [translations, setTranslations] = useState<Translation[]>(
    languages.map((l) => ({
      languageCode: l.code,
      name: product?.translations?.find((t) => t.languageCode === l.code)?.name ?? "",
      description: product?.translations?.find((t) => t.languageCode === l.code)?.description ?? "",
      ingredients: product?.translations?.find((t) => t.languageCode === l.code)?.ingredients ?? "",
      allergenNote: product?.translations?.find((t) => t.languageCode === l.code)?.allergenNote ?? "",
      specialNote: product?.translations?.find((t) => t.languageCode === l.code)?.specialNote ?? "",
    }))
  );
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  function updateTr(code: string, field: keyof Omit<Translation, "languageCode">, value: string) {
    setTranslations((prev) =>
      prev.map((t) => (t.languageCode === code ? { ...t, [field]: value } : t))
    );
  }

  function setNutrField(field: keyof NutritionFacts, value: string) {
    const num = parseFloat(value);
    setNutrition((prev) => ({ ...prev, [field]: isNaN(num) ? undefined : num }));
  }

  async function handleAiGenerate() {
    const trName = translations.find((t) => t.languageCode === "tr")?.name || slug;
    if (!trName) { toast({ title: "Önce ürün adını girin", variant: "destructive" }); return; }
    setAiLoading(true);
    try {
      const cat = categories.find((c) => c.id === categoryId);
      const catName = cat?.translations.find((t) => t.languageCode === "tr")?.name ?? undefined;
      const result = await apiFetch<{
        allergens?: string[];
        calories?: number;
        nutritionFacts?: NutritionFacts;
        translations: Record<string, { name: string; description: string; ingredients: string; allergenNote: string; specialNote: string }>;
      }>("/ai/generate", {
        method: "POST",
        body: JSON.stringify({ productName: trName, category: catName, languages: languages.map((l) => l.code) }),
      });

      if (result.allergens?.length) {
        setAllergens(result.allergens.join(", "));
      }
      if (result.calories) {
        setCalories(String(result.calories));
      }
      if (result.nutritionFacts) {
        setNutrition(result.nutritionFacts);
      }
      setTranslations((prev) =>
        prev.map((t) => {
          const gen = result.translations?.[t.languageCode];
          if (!gen) return t;
          return {
            ...t,
            name: gen.name || t.name,
            description: gen.description || t.description,
            ingredients: gen.ingredients || t.ingredients,
            allergenNote: gen.allergenNote || t.allergenNote,
            specialNote: gen.specialNote || t.specialNote,
          };
        })
      );
      toast({ title: "AI içerik üretildi" });
    } catch (err) {
      toast({ title: "AI hatası", description: String(err), variant: "destructive" });
    } finally {
      setAiLoading(false);
    }
  }

  async function handleSave() {
    if (!slug) { toast({ title: "Slug zorunlu", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const nutriFilled = Object.values(nutrition).some((v) => v != null && !isNaN(v as number));
      const payload = {
        slug,
        categoryId: Number(categoryId),
        price: parseFloat(price) || 0,
        isActive,
        imageUrl: imageUrl || undefined,
        calories: calories ? parseInt(calories) : undefined,
        allergens: allergens ? allergens.split(",").map((s) => s.trim()).filter(Boolean) : [],
        nutritionFacts: nutriFilled ? nutrition : {},
        translations: translations.filter((t) => t.name),
      };
      if (product?.id) {
        await apiFetch(`/products/${product.id}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await apiFetch("/products", { method: "POST", body: JSON.stringify(payload) });
      }
      onSave();
      onClose();
    } catch (err) {
      toast({ title: "Hata", description: String(err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "w-full bg-neutral-800 border border-neutral-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-white";
  const numInputCls = `${inputCls} [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-800">
          <h2 className="text-white font-semibold">{product?.id ? "Ürün Düzenle" : "Yeni Ürün"}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-neutral-400" /></button>
        </div>
        <div className="px-6 py-5 space-y-5">
          {/* Basic fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Slug</label>
              <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="margherita-pizza" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Kategori</label>
              <select value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))} className={inputCls}>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.translations.find((t) => t.languageCode === "tr")?.name ?? c.slug}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Fiyat</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" className={numInputCls} />
            </div>
            <div>
              <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Kalori (kcal)</label>
              <input type="number" value={calories} onChange={(e) => setCalories(e.target.value)} placeholder="—" className={numInputCls} />
            </div>
          </div>

          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Görsel URL</label>
            <input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." className={inputCls} />
          </div>

          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-2">Alerjenler (virgülle ayırın)</label>
            <input value={allergens} onChange={(e) => setAllergens(e.target.value)} placeholder="gluten, süt, yumurta" className={inputCls} />
          </div>

          {/* Nutrition facts */}
          <div>
            <label className="block text-xs text-neutral-400 uppercase tracking-widest mb-3">Besin Değerleri (porsiyon başına)</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Enerji (kcal)</label>
                <input type="number" value={nutrition.energy ?? ""} onChange={(e) => setNutrField("energy", e.target.value)} placeholder="—" className={numInputCls} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Protein (g)</label>
                <input type="number" value={nutrition.protein ?? ""} onChange={(e) => setNutrField("protein", e.target.value)} placeholder="—" className={numInputCls} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Karbonhidrat (g)</label>
                <input type="number" value={nutrition.carbs ?? ""} onChange={(e) => setNutrField("carbs", e.target.value)} placeholder="—" className={numInputCls} />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Yağ (g)</label>
                <input type="number" value={nutrition.fat ?? ""} onChange={(e) => setNutrField("fat", e.target.value)} placeholder="—" className={numInputCls} />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-neutral-300">Aktif</label>
            <button
              onClick={() => setIsActive(!isActive)}
              className={`w-10 h-5 rounded-full transition-colors relative ${isActive ? "bg-white" : "bg-neutral-700"}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 bg-neutral-900 rounded-full transition-transform ${isActive ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </div>

          {/* Translations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs text-neutral-400 uppercase tracking-widest">Çeviriler & İçerik</label>
              <button
                onClick={handleAiGenerate}
                disabled={aiLoading}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-neutral-800 border border-neutral-700 text-neutral-300 rounded-full hover:text-white hover:border-white transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3 h-3" />
                {aiLoading ? "Üretiliyor..." : "AI ile Doldur"}
              </button>
            </div>
            <div className="space-y-5">
              {languages.map((lang) => {
                const tr = translations.find((t) => t.languageCode === lang.code)!;
                return (
                  <div key={lang.code} className="space-y-2 pb-5 border-b border-neutral-800 last:border-0 last:pb-0">
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>{LANG_FLAGS[lang.code] ?? "🌐"}</span>
                      <span className="uppercase font-medium">{lang.name}</span>
                    </div>
                    <input
                      value={tr.name}
                      onChange={(e) => updateTr(lang.code, "name", e.target.value)}
                      placeholder="Ürün adı *"
                      className={inputCls}
                    />
                    <textarea
                      value={tr.description ?? ""}
                      onChange={(e) => updateTr(lang.code, "description", e.target.value)}
                      placeholder="Açıklama"
                      rows={2}
                      className={`${inputCls} resize-none`}
                    />
                    <input
                      value={tr.ingredients ?? ""}
                      onChange={(e) => updateTr(lang.code, "ingredients", e.target.value)}
                      placeholder="İçindekiler (virgülle)"
                      className={inputCls}
                    />
                    <input
                      value={tr.allergenNote ?? ""}
                      onChange={(e) => updateTr(lang.code, "allergenNote", e.target.value)}
                      placeholder="Alerjen notu"
                      className={inputCls}
                    />
                    <input
                      value={tr.specialNote ?? ""}
                      onChange={(e) => updateTr(lang.code, "specialNote", e.target.value)}
                      placeholder="Özel not / şef tavsiyesi"
                      className={inputCls}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 py-4 border-t border-neutral-800">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-neutral-700 text-neutral-300 text-sm hover:border-white transition-colors">İptal</button>
          <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-neutral-100 disabled:opacity-50 transition-colors">
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProducts() {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [languages, setLanguages] = useState<Language[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null | false>(false);
  const [filterCat, setFilterCat] = useState<number | "all">("all");

  const sensors = useSensors(useSensor(PointerSensor));

  async function load() {
    const [prods, cats, langs] = await Promise.all([
      apiFetch<Product[]>("/products"),
      apiFetch<Category[]>("/categories"),
      apiFetch<Language[]>("/languages"),
    ]);
    setProducts(prods.sort((a, b) => a.sortOrder - b.sortOrder));
    setCategories(cats);
    setLanguages(langs);
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id: number) {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    await apiFetch(`/products/${id}`, { method: "DELETE" });
    toast({ title: "Ürün silindi" });
    load();
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const filtered = filteredProducts;
    const oldIndex = filtered.findIndex((p) => p.id === active.id);
    const newIndex = filtered.findIndex((p) => p.id === over.id);
    const reordered = arrayMove(filtered, oldIndex, newIndex);
    setProducts((prev) => {
      const others = prev.filter((p) => !reordered.find((r) => r.id === p.id));
      return [...others, ...reordered].sort((a, b) => {
        const ai = reordered.findIndex((r) => r.id === a.id);
        const bi = reordered.findIndex((r) => r.id === b.id);
        return ai !== -1 && bi !== -1 ? ai - bi : 0;
      });
    });
    await apiFetch("/products/reorder", {
      method: "POST",
      body: JSON.stringify({ ids: reordered.map((p) => p.id) }),
    });
  }

  const filteredProducts = filterCat === "all"
    ? products
    : products.filter((p) => p.categoryId === filterCat);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Ürünler</h1>
          <p className="text-neutral-400 text-sm mt-1">Sürükleyerek sıralayabilirsiniz</p>
        </div>
        <button
          onClick={() => setEditing({})}
          className="flex items-center gap-2 px-4 py-2 bg-white text-black text-sm font-semibold rounded-full hover:bg-neutral-100 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Yeni Ürün
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterCat === "all" ? "bg-white text-black font-semibold" : "bg-neutral-800 text-neutral-400 hover:text-white"}`}
        >
          Tümü ({products.length})
        </button>
        {categories.map((c) => {
          const count = products.filter((p) => p.categoryId === c.id).length;
          return (
            <button
              key={c.id}
              onClick={() => setFilterCat(c.id)}
              className={`px-3 py-1.5 text-xs rounded-full transition-colors ${filterCat === c.id ? "bg-white text-black font-semibold" : "bg-neutral-800 text-neutral-400 hover:text-white"}`}
            >
              {c.translations.find((t) => t.languageCode === "tr")?.name ?? c.slug} ({count})
            </button>
          );
        })}
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 text-neutral-600">Henüz ürün yok</div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={filteredProducts.map((p) => p.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <SortableProductRow
                  key={product.id}
                  product={product}
                  categories={categories}
                  onEdit={setEditing}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {editing !== false && (
        <ProductModal
          product={editing}
          categories={categories}
          languages={languages}
          onClose={() => setEditing(false)}
          onSave={load}
        />
      )}
    </div>
  );
}
