import type { Coordinates, GeolocationErrorType } from '@/types';

export type MapLanguage = 'uz' | 'ru';

export interface MapTexts {
  // Navigation & Header
  langLabel: string;
  sectionTag: string;
  sectionTitle: string;
  sectionDesc: string;
  searchNearby: string;
  myLocation: string;
  getDirections: string;
  nearbyStores: string;
  locationUnavailable: string;
  retry: string;
  loading: string;
  loadingStores: string;
  noStoresFound: string;
  unverifiedStore: string;
  verifiedPartner: string;
  verifiedPartnerTitle: string;
  demoStore: string;
  osmPlace: string;
  unnamedStore: string;

  // LocationControl & GPS
  detectLocation: string;
  detectingLocation: string;
  selectCity: string;
  closeCitySelect: string;
  selectCityLabel: string;
  clearLocationAria: string;
  clearLocationTitle: string;
  searchRadiusLabel: string;
  radiusAll: string;
  selectCityFromList: string;

  // GPS error messages
  errorPermissionDenied: string;
  errorTimeout: string;
  errorPositionUnavailable: string;
  errorNotSupported: string;
  errorInsecureContext: string;
  errorUnknown: string;

  // Filters & Search
  filterAll: string;
  filterBirQidir: string;
  filterOsm: string;
  districtSelectPlaceholder: string;
  districtSelectAria: string;
  searchPlaceholder: string;
  searchAria: string;
  clearSearch: string;

  // Toolbar & View
  placesCount: (count: number) => string;
  radiusTag: (radius: number) => string;
  onlyBirQidirTag: string;
  onlyOsmTag: string;
  sortLabel: string;
  sortDistance: string;
  sortName: string;
  viewAll: string;
  viewMap: string;
  viewList: string;

  // Empty state
  emptyRadiusMsg: (radius: number) => string;
  emptyDefaultMsg: string;
  removeRadiusBtn: string;
  clearAllFiltersBtn: string;

  // Product Matching & Price Badges
  cheapestOfferBadge: string;
  closestStoreBadge: string;
  inStockOnly: string;
  inStockLabel: string;
  outOfStockLabel: string;
  productPriceLabel: string;
  sortPriceAsc: string;
  sortPriceDesc: string;
  filterCategory: string;
  allCategories: string;
  quickProductSuggestions: string;
  productOffersCount: (count: number) => string;
  activeProductFilter: (name: string) => string;
  clearProductFilter: string;

  // Store card & Leaflet Map Popup
  distanceLabel: (dist: string) => string;
  distanceUnknown: string;
  noCoordinatesNote: string;
  viewOnMap: string;
  selectedOnMap: string;
  website: string;
  osmDataSource: string;
  birqidirStore: string;
  mapRegionAria: string;
  userMarkerTitle: string;
  birqidirLegend: string;
  osmLegend: string;
  radiusLegend: (radius: number) => string;
  osmAttribution: string;
}

export const MAP_TRANSLATIONS: Record<MapLanguage, MapTexts> = {
  uz: {
    langLabel: 'Xarita tili',
    sectionTag: 'Geolokatsiya va xarita',
    sectionTitle: 'Yaqin do‘konlar',
    sectionDesc:
      'GPS joylashuvingiz orqali yaqin masofadagi do‘konlarni xaritada ko‘ring, masofani hisoblang va qulay savdo nuqtasini tanlang.',
    searchNearby: 'Yaqin atrofni qidirish',
    myLocation: 'Mening joylashuvim',
    getDirections: 'Yo‘nalishni ko‘rsatish',
    nearbyStores: 'Yaqin do‘konlar',
    locationUnavailable: 'Joylashuv aniqlanmadi',
    retry: 'Qayta urinish',
    loading: 'Yuklanmoqda',
    loadingStores: 'Do‘konlar bazasi va joylashuv ma’lumotlari yuklanmoqda...',
    noStoresFound: 'Do‘konlar topilmadi',
    unverifiedStore: 'Tasdiqlanmagan do‘kon',
    verifiedPartner: 'Tasdiqlangan hamkor',
    verifiedPartnerTitle: 'BirQidir tomonidan tasdiqlangan rasmiy savdo hamkori',
    demoStore: 'Namuna (demo)',
    osmPlace: 'OSM ochiq ma’lumot',
    unnamedStore: 'Nomsiz savdo nuqtasi',

    detectLocation: 'Joylashuvimni aniqlash',
    detectingLocation: 'Joylashuv aniqlanmoqda...',
    selectCity: 'Shaharni tanlash',
    closeCitySelect: 'Shaharni yopish',
    selectCityLabel: 'Shahar yoki viloyat markazini tanlang:',
    clearLocationAria: 'Joylashuvni tozalash',
    clearLocationTitle: 'Joylashuv filtrini bekor qilish',
    searchRadiusLabel: 'Qidiruv radiusi:',
    radiusAll: 'Barchasi',
    selectCityFromList: 'Shaharni ro‘yxatdan tanlash',

    errorPermissionDenied:
      'Joylashuv ruxsati rad etildi. Brauzer sozlamalaridan geolokatsiyaga ruxsat bering yoki hududni qo‘lda tanlang.',
    errorTimeout:
      'Joylashuvni aniqlash vaqti tugadi (tarmoq yoki GPS signali sekin). Shaharni qo‘lda tanlashingiz yoki qayta urinishingiz mumkin.',
    errorPositionUnavailable:
      'Joylashuv aniqlanmadi (GPS signali topilmadi). Shaharni qo‘lda tanlashingiz mumkin.',
    errorNotSupported:
      'Brauzeringizda GPS geolokatsiya qo‘llab-quvvatlanmaydi. Iltimos, hududingizni ro‘yxatdan tanlang.',
    errorInsecureContext:
      'Geolokatsiya xavfsizlik talablariga ko‘ra faqat HTTPS yoki localhost manzilida ishlaydi.',
    errorUnknown:
      'Geolokatsiyani aniqlashda kutilmagan xatolik yuz berdi. Shaharni qo‘lda tanlang.',

    filterAll: 'Barchasi',
    filterBirQidir: 'BirQidir hamkorlari',
    filterOsm: 'OpenStreetMap ochiq ma’lumotlari',
    districtSelectPlaceholder: 'Barcha tumanlar / shaharlar',
    districtSelectAria: 'Qoraqalpog‘iston tumanini tanlang',
    searchPlaceholder: 'Do‘kon, xizmat yoki manzil qidirish...',
    searchAria: 'Do‘kon nomini qidirish',
    clearSearch: 'Tozalash',

    placesCount: (count: number) => `${count} ta joy ko‘rsatilmoqda`,
    radiusTag: (radius: number) => `${radius} km radius ichida`,
    onlyBirQidirTag: 'Faqat BirQidir',
    onlyOsmTag: 'Faqat OSM',
    sortLabel: 'Saralash:',
    sortDistance: 'Eng yaqin masofa bo‘yicha',
    sortName: 'Nomi bo‘yicha (A-Z)',
    viewAll: 'Barchasi',
    viewMap: 'Xarita',
    viewList: 'Ro‘yxat',

    emptyRadiusMsg: (radius: number) =>
      `${radius} km radius ichida yoki tanlangan tuman/nom bo‘yicha mos joylar yo‘q. Filtrlarni tozalab ko‘ring.`,
    emptyDefaultMsg:
      'Tanlangan mezonlarga mos do‘kon yoki xizmat ko‘rsatish nuqtasi topilmadi.',
    removeRadiusBtn: 'Radiusni olib tashlash',
    clearAllFiltersBtn: 'Barcha filtrlarni tozalash',

    cheapestOfferBadge: 'Eng arzon taklif',
    closestStoreBadge: 'Eng yaqin do‘kon',
    inStockOnly: 'Faqat omborda mavjud',
    inStockLabel: 'Omborda mavjud',
    outOfStockLabel: 'Omborda yo‘q',
    productPriceLabel: 'Narxi:',
    sortPriceAsc: 'Eng arzon narx bo‘yicha',
    sortPriceDesc: 'Eng qimmat narx bo‘yicha',
    filterCategory: 'Kategoriya',
    allCategories: 'Barcha toifalar',
    quickProductSuggestions: 'Ommabop mahsulotlar:',
    productOffersCount: (count: number) => `${count} ta do‘konda mavjud`,
    activeProductFilter: (name: string) => `“${name}” tovari bo‘yicha takliflar`,
    clearProductFilter: 'Mahsulot filtrini bekor qilish',

    distanceLabel: (dist: string) => `${dist} masofada`,
    distanceUnknown: 'Masofa noma’lum',
    noCoordinatesNote: 'Koordinatalari kiritilmagan',
    viewOnMap: 'Xaritada ko‘rish',
    selectedOnMap: 'Xaritada tanlandi',
    website: 'Veb-sayt',
    osmDataSource: '🌐 OpenStreetMap (ODbL)',
    birqidirStore: '✓ BirQidir savdo nuqtasi',
    mapRegionAria: 'Yaqin atrofdagi do‘konlar xaritasi',
    userMarkerTitle: 'Mening joylashuvim',
    birqidirLegend: 'BirQidir do‘koni',
    osmLegend: 'OpenStreetMap joyi',
    radiusLegend: (radius: number) => `${radius} km radius`,
    osmAttribution:
      'Xaritadagi joylashuv va ochiq ma’lumotlar © OpenStreetMap hissa qo‘shuvchilari (ODbL litsenziyasi bo‘yicha). BirQidir rasmiy hamkorlari esa alohida tasdiqlangan savdo nuqtalaridir.',
  },
  ru: {
    langLabel: 'Язык карты',
    sectionTag: 'Геолокация и карта',
    sectionTitle: 'Магазины рядом',
    sectionDesc:
      'Находите ближайшие магазины на карте по GPS, рассчитывайте расстояние и выбирайте удобные торговые точки.',
    searchNearby: 'Искать рядом',
    myLocation: 'Моё местоположение',
    getDirections: 'Построить маршрут',
    nearbyStores: 'Магазины рядом',
    locationUnavailable: 'Местоположение не определено',
    retry: 'Повторить',
    loading: 'Загрузка',
    loadingStores: 'Загрузка базы магазинов и данных геолокации...',
    noStoresFound: 'Магазины не найдены',
    unverifiedStore: 'Непроверенный магазин',
    verifiedPartner: 'Проверенный партнёр',
    verifiedPartnerTitle: 'Официальный торговый партнёр, проверенный BirQidir',
    demoStore: 'Демо-образец',
    osmPlace: 'Открытые данные OSM',
    unnamedStore: 'Торговая точка без названия',

    detectLocation: 'Моё местоположение',
    detectingLocation: 'Определение местоположения...',
    selectCity: 'Выбрать город',
    closeCitySelect: 'Закрыть выбор',
    selectCityLabel: 'Выберите город или районный центр:',
    clearLocationAria: 'Сбросить местоположение',
    clearLocationTitle: 'Сбросить фильтр местоположения',
    searchRadiusLabel: 'Радиус поиска:',
    radiusAll: 'Все',
    selectCityFromList: 'Выбрать город из списка',

    errorPermissionDenied:
      'Доступ к геопозиции отклонён. Разрешите геолокацию в настройках браузера или выберите город вручную.',
    errorTimeout:
      'Время ожидания GPS истекло (слабый сигнал). Выберите город вручную или попробуйте снова.',
    errorPositionUnavailable:
      'Местоположение не определено (сигнал GPS недоступен). Выберите город вручную.',
    errorNotSupported:
      'Ваш браузер не поддерживает GPS-геолокацию. Выберите город из списка.',
    errorInsecureContext:
      'По требованиям безопасности геолокация работает только по защищенному протоколу HTTPS или localhost.',
    errorUnknown:
      'Произошла непредвиденная ошибка геолокации. Выберите город вручную.',

    filterAll: 'Все',
    filterBirQidir: 'Партнёры BirQidir',
    filterOsm: 'Открытые данные OpenStreetMap',
    districtSelectPlaceholder: 'Все районы / города',
    districtSelectAria: 'Выберите район Каракалпакстана',
    searchPlaceholder: 'Поиск магазина, услуги или адреса...',
    searchAria: 'Поиск по названию магазина',
    clearSearch: 'Очистить',

    placesCount: (count: number) => `Показано мест: ${count}`,
    radiusTag: (radius: number) => `В радиусе ${radius} км`,
    onlyBirQidirTag: 'Только BirQidir',
    onlyOsmTag: 'Только OSM',
    sortLabel: 'Сортировка:',
    sortDistance: 'Сначала ближайшие',
    sortName: 'По названию (А-Я)',
    viewAll: 'Все',
    viewMap: 'Карта',
    viewList: 'Список',

    emptyRadiusMsg: (radius: number) =>
      `В радиусе ${radius} км или по выбранным фильтрам подходящих мест не найдено. Попробуйте сбросить фильтры.`,
    emptyDefaultMsg:
      'По выбранным критериям торговых точек или служб не найдено.',
    removeRadiusBtn: 'Сбросить радиус',
    clearAllFiltersBtn: 'Сбросить все фильтры',

    cheapestOfferBadge: 'Лучшая цена',
    closestStoreBadge: 'Ближайший магазин',
    inStockOnly: 'Только в наличии',
    inStockLabel: 'В наличии',
    outOfStockLabel: 'Нет в наличии',
    productPriceLabel: 'Цена:',
    sortPriceAsc: 'По возрастанию цены',
    sortPriceDesc: 'По убыванию цены',
    filterCategory: 'Категория',
    allCategories: 'Все категории',
    quickProductSuggestions: 'Популярные товары:',
    productOffersCount: (count: number) => `В ${count} магазинах`,
    activeProductFilter: (name: string) => `Предложения по товару «${name}»`,
    clearProductFilter: 'Сбросить фильтр товара',

    distanceLabel: (dist: string) => `в ${dist}`,
    distanceUnknown: 'Расстояние неизвестно',
    noCoordinatesNote: 'Координаты не указаны',
    viewOnMap: 'На карте',
    selectedOnMap: 'Выбрано на карте',
    website: 'Веб-сайт',
    osmDataSource: '🌐 OpenStreetMap (ODbL)',
    birqidirStore: '✓ Торговая точка BirQidir',
    mapRegionAria: 'Карта магазинов поблизости',
    userMarkerTitle: 'Моё местоположение',
    birqidirLegend: 'Магазин BirQidir',
    osmLegend: 'Объект OpenStreetMap',
    radiusLegend: (radius: number) => `Радиус ${radius} км`,
    osmAttribution:
      'Данные карты и открытые геометки © Участники OpenStreetMap (по лицензии ODbL). Официальные партнёры BirQidir — проверенные торговые точки.',
  },
};

const MAP_LANG_STORAGE_KEY = 'bq_map_lang';

export function getSavedMapLanguage(): MapLanguage {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(MAP_LANG_STORAGE_KEY);
      if (saved === 'ru' || saved === 'uz') {
        return saved;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return 'uz';
}

export function saveMapLanguage(lang: MapLanguage): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(MAP_LANG_STORAGE_KEY, lang);
    }
  } catch {
    // Ignore storage errors
  }
}

export function getMapTexts(lang: MapLanguage): MapTexts {
  return MAP_TRANSLATIONS[lang] || MAP_TRANSLATIONS.uz;
}

/**
 * Normalizes store name or provides friendly fallback when missing
 */
export function getSafeStoreName(name?: string | null, lang: MapLanguage = 'uz'): string {
  if (!name || !name.trim()) {
    return MAP_TRANSLATIONS[lang].unnamedStore;
  }
  return name.trim();
}

/**
 * Translates categories and service slugs to friendly localized names
 */
export function translateCategory(category: string | undefined, lang: MapLanguage): string {
  if (!category || !category.trim()) {
    return lang === 'ru' ? 'Общая категория' : 'Umumiy toifa';
  }

  const norm = category.toLowerCase().trim();

  const ruCategories: Record<string, string> = {
    electronics: 'Электроника',
    appliances: 'Бытовая техника',
    phones: 'Смартфоны и связь',
    computers: 'Компьютеры и оргтехника',
    general: 'Товары общего назначения',
    supermarket: 'Супермаркет',
    'savdo markazi': 'Торговый центр',
    'bozor va savdo markazi': 'Рынок и торговый центр',
    dorixona: 'Аптека',
    'avtoservis va ta’mirlash': 'Автосервис и ремонт',
    'avtoservis va ta\'mirlash': 'Автосервис и ремонт',
    'elektronika ta’mirlash': 'Ремонт электроники',
    'elektronika ta\'mirlash': 'Ремонт электроники',
    'kitob va kanselyariya': 'Книги и канцелярия',
    'elektronika va jihozlar': 'Электроника и техника',
    'hunarmandchilik va ta’mirlash': 'Ремесло и ремонт',
    'hunarmandchilik va ta\'mirlash': 'Ремесло и ремонт',
    'do‘kon va xizmat': 'Магазин и услуги',
    'do\'kon va xizmat': 'Магазин и услуги',
  };

  const uzCategories: Record<string, string> = {
    electronics: 'Elektronika',
    appliances: 'Maishiy texnika',
    phones: 'Smartfon va aloqa',
    computers: 'Kompyuterlar',
    general: 'Umumiy tovarlar',
    supermarket: 'Supermarket',
  };

  if (lang === 'ru') {
    return ruCategories[norm] || category;
  }
  return uzCategories[norm] || category;
}

/**
 * Returns localized GPS error message according to GeolocationErrorType
 */
export function getGeolocationErrorMessage(
  errorType: GeolocationErrorType | null | undefined,
  lang: MapLanguage
): string | null {
  if (!errorType) return null;
  const t = getMapTexts(lang);
  switch (errorType) {
    case 'PERMISSION_DENIED':
      return t.errorPermissionDenied;
    case 'TIMEOUT':
      return t.errorTimeout;
    case 'POSITION_UNAVAILABLE':
      return t.errorPositionUnavailable;
    case 'NOT_SUPPORTED':
      return t.errorNotSupported;
    case 'INSECURE_CONTEXT':
      return t.errorInsecureContext;
    default:
      return t.errorUnknown;
  }
}

/**
 * Builds reliable Google Maps directions URL with optional user GPS origin
 */
export function buildDirectionsUrl(destination: Coordinates, origin?: Coordinates | null): string {
  const destStr = `${destination.lat},${destination.lng}`;
  if (origin && origin.lat !== undefined && origin.lng !== undefined) {
    return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destStr}`;
  }
  return `https://www.google.com/maps/dir/?api=1&destination=${destStr}`;
}
