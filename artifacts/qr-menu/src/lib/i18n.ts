export interface Translations {
  welcome: string;
  welcomeTagline: (name: string) => string;
  welcomeSub: string;
  exploreMenu: string;
  featured: string;
  seeAll: string;
  chefsSpecial: string;
  searchPlaceholder: string;
  noResults: string;
  all: string;

  categories: string;
  categoriesSubtitle: string;
  items: (n: number) => string;

  home: string;
  viewDetails: string;
  qrDisclaimer: string;
  categoryNotFound: string;

  calories: string;
  energy: string;
  allergens: string;
  ingredients: string;
  nutritionFacts: string;
  protein: string;
  carbs: string;
  fat: string;
  chefsNote: string;
  ourTeam: string;
  backToMenu: string;
  productNotFound: string;

  navHome: string;
  navCategories: string;
  navLanguage: string;

  languageTitle: string;
  languageSub: string;
}

const tr: Translations = {
  welcome: "Hoş Geldiniz 👋",
  welcomeTagline: (name) => `${name}'a hoş geldiniz.`,
  welcomeSub: "Özenle seçilmiş lezzetlerimizi keşfedin.",
  exploreMenu: "MENÜYÜ KEŞFET",
  featured: "Öne Çıkanlar",
  seeAll: "Tümünü Gör",
  chefsSpecial: "☆ Şefin Önerisi",
  searchPlaceholder: "Lezzet, malzeme veya kategori ara...",
  noResults: "Sonuç bulunamadı",
  all: "Tümü",

  categories: "Kategoriler",
  categoriesSubtitle: "Menümüzü keşfedin. Her tabak, özenle seçilmiş malzemelerle hazırlandı.",
  items: (n) => `${n} Seçenek`,

  home: "Ana Sayfa",
  viewDetails: "Detayı Gör →",
  qrDisclaimer: "ⓘ Bu menü QR ile görüntülenmektedir. Sipariş verilemez.",
  categoryNotFound: "Kategori bulunamadı",

  calories: "Kalori",
  energy: "Enerji",
  allergens: "Alerjenler",
  ingredients: "İçindekiler",
  nutritionFacts: "Besin Değerleri (Porsiyon)",
  protein: "Protein",
  carbs: "Karbonhidrat",
  fat: "Yağ",
  chefsNote: "Şefin Notu",
  ourTeam: "Ekibimiz",
  backToMenu: "← MENÜYE DÖN",
  productNotFound: "Ürün bulunamadı",

  navHome: "Ana Sayfa",
  navCategories: "Kategoriler",
  navLanguage: "Dil",

  languageTitle: "Dil Seçimi",
  languageSub: "Lütfen menüyü görüntülemek istediğiniz dili seçin.",
};

const en: Translations = {
  welcome: "Welcome 👋",
  welcomeTagline: (name) => `Welcome to ${name}.`,
  welcomeSub: "Discover our carefully selected flavors.",
  exploreMenu: "EXPLORE MENU",
  featured: "Featured",
  seeAll: "See All",
  chefsSpecial: "☆ Chef's Special",
  searchPlaceholder: "Search dish, ingredient or category...",
  noResults: "No results found",
  all: "All",

  categories: "Categories",
  categoriesSubtitle: "Explore our menu. Every dish is prepared with carefully selected ingredients.",
  items: (n) => `${n} items`,

  home: "Home",
  viewDetails: "View Details →",
  qrDisclaimer: "ⓘ This menu is viewed via QR. Orders cannot be placed.",
  categoryNotFound: "Category not found",

  calories: "Calories",
  energy: "Energy",
  allergens: "Allergens",
  ingredients: "Ingredients",
  nutritionFacts: "Nutrition Facts (Serving)",
  protein: "Protein",
  carbs: "Carbs",
  fat: "Fat",
  chefsNote: "Chef's Note",
  ourTeam: "Our Team",
  backToMenu: "← BACK TO MENU",
  productNotFound: "Product not found",

  navHome: "Home",
  navCategories: "Categories",
  navLanguage: "Language",

  languageTitle: "Language Selection",
  languageSub: "Please select the language you want to view the menu in.",
};

const ru: Translations = {
  welcome: "Добро пожаловать 👋",
  welcomeTagline: (name) => `Добро пожаловать в ${name}.`,
  welcomeSub: "Откройте для себя наши тщательно отобранные блюда.",
  exploreMenu: "МЕНЮ",
  featured: "Рекомендуем",
  seeAll: "Смотреть всё",
  chefsSpecial: "☆ Выбор шефа",
  searchPlaceholder: "Поиск блюда, ингредиента или категории...",
  noResults: "Ничего не найдено",
  all: "Все",

  categories: "Категории",
  categoriesSubtitle: "Исследуйте наше меню. Каждое блюдо приготовлено из тщательно подобранных ингредиентов.",
  items: (n) => `${n} позиций`,

  home: "Главная",
  viewDetails: "Подробнее →",
  qrDisclaimer: "ⓘ Меню доступно по QR-коду. Заказы не принимаются.",
  categoryNotFound: "Категория не найдена",

  calories: "Калории",
  energy: "Энергия",
  allergens: "Аллергены",
  ingredients: "Ингредиенты",
  nutritionFacts: "Пищевая ценность (порция)",
  protein: "Белок",
  carbs: "Углеводы",
  fat: "Жиры",
  chefsNote: "Записка шефа",
  ourTeam: "Наша команда",
  backToMenu: "← В МЕНЮ",
  productNotFound: "Товар не найден",

  navHome: "Главная",
  navCategories: "Категории",
  navLanguage: "Язык",

  languageTitle: "Выбор языка",
  languageSub: "Пожалуйста, выберите язык для просмотра меню.",
};

const ar: Translations = {
  welcome: "أهلاً وسهلاً 👋",
  welcomeTagline: (name) => `مرحباً بكم في ${name}.`,
  welcomeSub: "اكتشف أشهى الأطباق المختارة بعناية.",
  exploreMenu: "استكشف القائمة",
  featured: "المميز",
  seeAll: "عرض الكل",
  chefsSpecial: "☆ اختيار الشيف",
  searchPlaceholder: "ابحث عن طبق أو مكون أو فئة...",
  noResults: "لا توجد نتائج",
  all: "الكل",

  categories: "الفئات",
  categoriesSubtitle: "استكشف قائمتنا. كل طبق محضّر من مكونات مختارة بعناية.",
  items: (n) => `${n} عناصر`,

  home: "الرئيسية",
  viewDetails: "عرض التفاصيل →",
  qrDisclaimer: "ⓘ هذه القائمة تُعرض عبر رمز QR. لا يمكن تقديم الطلبات.",
  categoryNotFound: "الفئة غير موجودة",

  calories: "السعرات",
  energy: "الطاقة",
  allergens: "مسببات الحساسية",
  ingredients: "المكونات",
  nutritionFacts: "القيمة الغذائية (حصة)",
  protein: "بروتين",
  carbs: "كربوهيدرات",
  fat: "دهون",
  chefsNote: "ملاحظة الشيف",
  ourTeam: "فريقنا",
  backToMenu: "→ العودة للقائمة",
  productNotFound: "المنتج غير موجود",

  navHome: "الرئيسية",
  navCategories: "الفئات",
  navLanguage: "اللغة",

  languageTitle: "اختيار اللغة",
  languageSub: "الرجاء اختيار اللغة التي تريد عرض القائمة بها.",
};

const TRANSLATIONS: Record<string, Translations> = { tr, en, ru, ar };

export function t(lang: string): Translations {
  return TRANSLATIONS[lang] ?? en;
}
