import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  MapPin,
  Store as StoreIcon,
  Phone,
  Clock,
  Navigation,
  ShieldCheck,
  Layers,
  Map as MapIcon,
  List,
  AlertCircle,
  Globe,
  ExternalLink,
  Search,
  Building2,
  Languages,
  Sparkles,
  Tag,
  Package,
  Heart,
} from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/common/Button';
import { LocationControl } from '@/components/common/LocationControl';
import { NearbyStoresMap } from '@/components/map/NearbyStoresMap';
import {
  getStores,
  searchProductsByKeyword,
  getOffersForProduct,
} from '@/services/firebase/catalog';
import {
  enrichStoresWithDistance,
  filterStoresByRadius,
  formatDistance,
  isValidCoordinates,
  CITY_CENTROIDS,
} from '@/utils/geo';
import {
  matchStoresWithProductOffers,
  filterStoresByCategory,
  sortStoresAdvanced,
} from '@/utils/productStoreMatcher';
import { KARAKALPAKSTAN_DISTRICTS } from '@/utils/karakalpakstanDistricts';
import { normalizeSearchQuery } from '@/utils/textNormalization';
import {
  type MapLanguage,
  getMapTexts,
  getSavedMapLanguage,
  saveMapLanguage,
  translateCategory,
  getSafeStoreName,
  buildDirectionsUrl,
} from '@/utils/mapI18n';
import type { Store, Coordinates, PlaceSourceType, ProductItem, InventoryOffer } from '@/types';
import './NearbyStoresSection.css';

const QUICK_PRODUCT_KEYWORDS = [
  'Samsung A24',
  'telefon',
  'konditsioner',
  'noutbuk',
  'sement',
];

const STORE_CATEGORIES = [
  { id: '', labelUz: 'Barcha toifalar', labelRu: 'Все категории' },
  { id: 'phones', labelUz: 'Smartfon va aloqa', labelRu: 'Смартфоны и связь' },
  { id: 'appliances', labelUz: 'Maishiy texnika', labelRu: 'Бытовая техника' },
  { id: 'computers', labelUz: 'Kompyuterlar', labelRu: 'Компьютеры' },
  { id: 'construction', labelUz: 'Qurilish mollari', labelRu: 'Стройматериалы' },
  { id: 'electronics', labelUz: 'Elektronika', labelRu: 'Электроника' },
];

export interface NearbyStoresSectionProps {
  initialSearchQuery?: string;
  initialCategory?: string;
  initialDistrict?: string;
  initialStoreId?: string | null;
  defaultViewMode?: 'both' | 'map' | 'list';
  isFullPage?: boolean;
}

export const NearbyStoresSection: React.FC<NearbyStoresSectionProps> = ({
  initialSearchQuery = '',
  initialCategory = '',
  initialDistrict = '',
  initialStoreId = null,
  defaultViewMode = 'both',
  isFullPage = false,
}) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Language state (defaulting to saved preference or 'uz')
  const [lang, setLang] = useState<MapLanguage>(() => getSavedMapLanguage());
  const t = getMapTexts(lang);

  const handleLanguageChange = (newLang: MapLanguage) => {
    setLang(newLang);
    saveMapLanguage(newLang);
  };

  // Geolocation & View State
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(initialStoreId);
  const [viewMode, setViewMode] = useState<'both' | 'map' | 'list'>(defaultViewMode);
  const [sortBy, setSortBy] = useState<'distance' | 'price_asc' | 'price_desc' | 'name'>('distance');

  // Filters State: Category, Stock, District, Source, Search
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [selectedDistrict, setSelectedDistrict] = useState<string>(initialDistrict);
  const [sourceFilter, setSourceFilter] = useState<'all' | PlaceSourceType>('all');
  const [searchQuery, setSearchQuery] = useState<string>(initialSearchQuery);

  // Sync with incoming props if URL parameters change
  useEffect(() => {
    if (initialSearchQuery !== undefined) setSearchQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  useEffect(() => {
    if (initialCategory !== undefined) setSelectedCategory(initialCategory);
  }, [initialCategory]);

  useEffect(() => {
    if (initialDistrict !== undefined) setSelectedDistrict(initialDistrict);
  }, [initialDistrict]);

  useEffect(() => {
    if (initialStoreId !== undefined) setSelectedStoreId(initialStoreId);
  }, [initialStoreId]);

  // Product Matching State
  const [activeProduct, setActiveProduct] = useState<ProductItem | null>(null);
  const [productOffers, setProductOffers] = useState<InventoryOffer[]>([]);
  const [isMatchingProduct, setIsMatchingProduct] = useState<boolean>(false);
  const searchRequestIdRef = useRef(0);

  const { isStoreFavorite, toggleStoreFavorite } = useFavorites();

  // Load stores from Firestore (with safe demo fallback in development)
  const fetchStoresData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getStores({ includeDemo: true });
      if (res.error) {
        setError(res.error);
        setStores([]);
      } else {
        setStores(res.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Do‘konlar ro‘yxatini yuklashda xatolik yuz berdi.');
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStoresData();
  }, [fetchStoresData]);

  // Handle location update from LocationControl
  const handleLocationChange = (
    coords: Coordinates | null,
    _source: 'gps' | 'manual' | null
  ) => {
    setUserCoords(coords);
    if (coords && !radiusKm) {
      // Default to 10 km on initial location acquisition
      setRadiusKm(10);
    }
  };

  // Debounced search for products matching searchQuery
  const handleProductSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    const reqId = ++searchRequestIdRef.current;

    if (!trimmed) {
      setActiveProduct(null);
      setProductOffers([]);
      setIsMatchingProduct(false);
      return;
    }

    setIsMatchingProduct(true);
    try {
      const prodRes = await searchProductsByKeyword(trimmed, { includeDemo: true });
      if (reqId !== searchRequestIdRef.current) return;

      if (prodRes.data && prodRes.data.length > 0) {
        const topProduct = prodRes.data[0];
        setActiveProduct(topProduct);

        const offersRes = await getOffersForProduct(topProduct.id);
        if (reqId !== searchRequestIdRef.current) return;

        setProductOffers(offersRes.data || []);
      } else {
        setActiveProduct(null);
        setProductOffers([]);
      }
    } catch {
      if (reqId === searchRequestIdRef.current) {
        setActiveProduct(null);
        setProductOffers([]);
      }
    } finally {
      if (reqId === searchRequestIdRef.current) {
        setIsMatchingProduct(false);
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleProductSearch(searchQuery);
      } else {
        setActiveProduct(null);
        setProductOffers([]);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, handleProductSearch]);

  const handleSelectQuickProduct = async (term: string) => {
    setSearchQuery(term);
    await handleProductSearch(term);
  };

  const handleClearProductFilter = () => {
    setSearchQuery('');
    setActiveProduct(null);
    setProductOffers([]);
    if (sortBy === 'price_asc' || sortBy === 'price_desc') {
      setSortBy('distance');
    }
  };

  // Compute enriched & filtered stores
  const displayedStores = useMemo(() => {
    let list: Store[] = [];

    // 1. If an active product with offers exists, strictly match stores with those offers
    if (activeProduct && productOffers.length > 0) {
      list = matchStoresWithProductOffers(stores, productOffers, activeProduct, {
        userCoords,
        onlyInStock,
      });
    } else {
      // General stores view enriched with distance
      list = enrichStoresWithDistance(stores, userCoords);
    }

    // 2. Filter by category
    if (selectedCategory) {
      list = filterStoresByCategory(list, selectedCategory);
    }

    // 3. Filter by source type (BirQidir vs OpenStreetMap)
    if (sourceFilter !== 'all') {
      list = list.filter((s) => (s.sourceType || 'birqidir') === sourceFilter);
    }

    // 4. Filter by Karakalpakstan district
    if (selectedDistrict) {
      const dNorm = normalizeSearchQuery(selectedDistrict);
      list = list.filter((s) => {
        const storeDist = normalizeSearchQuery(s.district || '');
        const storeCity = normalizeSearchQuery(s.city || '');
        return storeDist.includes(dNorm) || storeCity.includes(dNorm);
      });
    }

    // 5. If not matching product offers, apply tolerant text search on store attributes
    if (!activeProduct && searchQuery.trim()) {
      const qNorm = normalizeSearchQuery(searchQuery);
      list = list.filter((s) => {
        const text = normalizeSearchQuery(
          `${s.name} ${s.category} ${s.address} ${s.district || ''} ${s.city} ${s.description || ''}`
        );
        return text.includes(qNorm);
      });
    }

    // 6. Filter by radius if set and user coordinates active
    if (userCoords && radiusKm) {
      list = filterStoresByRadius(list, userCoords, radiusKm);
    }

    // 7. Sort stores (distance, price_asc, price_desc, name)
    const effectiveSort =
      (sortBy === 'price_asc' || sortBy === 'price_desc') && !activeProduct
        ? userCoords
          ? 'distance'
          : 'name'
        : sortBy;

    list = sortStoresAdvanced(list, effectiveSort, lang);

    return list;
  }, [
    stores,
    activeProduct,
    productOffers,
    onlyInStock,
    userCoords,
    selectedCategory,
    sourceFilter,
    selectedDistrict,
    searchQuery,
    radiusKm,
    sortBy,
    lang,
  ]);

  const handleSelectStore = (store: Store) => {
    setSelectedStoreId(store.id);
    const cardEl = document.getElementById(`store-card-${store.id}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  return (
    <section id="stores-section" className={`bq-stores-section ${isFullPage ? 'bq-stores-section--fullpage' : ''}`}>
      <div className="container">
        {/* Section Header with Language Switcher */}
        <div className="bq-section-header">
          <div className="bq-section-header-top">
            <div className="bq-section-tag">
              <Navigation size={14} />
              <span>{t.sectionTag}</span>
            </div>

            {/* Language Switcher: O‘zbekcha | Русский */}
            <div className="bq-map-lang-switcher" role="group" aria-label={t.langLabel}>
              <Languages size={14} className="bq-map-lang-icon" />
              <button
                type="button"
                className={`bq-lang-btn ${lang === 'uz' ? 'bq-lang-btn--active' : ''}`}
                onClick={() => handleLanguageChange('uz')}
                aria-pressed={lang === 'uz'}
              >
                O‘zbekcha
              </button>
              <span className="bq-lang-divider">|</span>
              <button
                type="button"
                className={`bq-lang-btn ${lang === 'ru' ? 'bq-lang-btn--active' : ''}`}
                onClick={() => handleLanguageChange('ru')}
                aria-pressed={lang === 'ru'}
              >
                Русский
              </button>
            </div>
          </div>

          <h2 className="bq-section-title">{t.sectionTitle}</h2>
          <p className="bq-section-desc">{t.sectionDesc}</p>
        </div>

        {/* Location & Radius Control Panel */}
        <div className="bq-stores-control-card">
          <LocationControl
            userCoords={userCoords}
            onLocationChange={handleLocationChange}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            showRadiusFilter={Boolean(userCoords)}
            lang={lang}
          />

          {/* Secondary Filters Bar: Source Type, District, and Search */}
          <div className="bq-stores-secondary-filters">
            {/* Source Type Filter Pills */}
            <div className="bq-source-filter-group" role="group" aria-label={lang === 'ru' ? 'Источник данных' : 'Ma’lumot manbasi'}>
              <button
                type="button"
                className={`bq-source-filter-btn ${sourceFilter === 'all' ? 'bq-source-filter-btn--active' : ''}`}
                onClick={() => setSourceFilter('all')}
              >
                <span>{t.filterAll}</span>
              </button>
              <button
                type="button"
                className={`bq-source-filter-btn bq-source-filter-btn--birqidir ${sourceFilter === 'birqidir' ? 'bq-source-filter-btn--active' : ''}`}
                onClick={() => setSourceFilter('birqidir')}
              >
                <ShieldCheck size={14} />
                <span>{t.filterBirQidir}</span>
              </button>
              <button
                type="button"
                className={`bq-source-filter-btn bq-source-filter-btn--osm ${sourceFilter === 'openstreetmap' ? 'bq-source-filter-btn--active' : ''}`}
                onClick={() => setSourceFilter('openstreetmap')}
              >
                <Globe size={14} />
                <span>{t.filterOsm}</span>
              </button>
            </div>

            {/* Karakalpakstan District Dropdown */}
            <div className="bq-district-filter-group">
              <Building2 size={15} className="bq-district-icon" />
              <select
                id="karakalpakstan-district-select"
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="bq-district-select"
                aria-label={t.districtSelectAria}
              >
                <option value="">{t.districtSelectPlaceholder}</option>
                {KARAKALPAKSTAN_DISTRICTS.map((d) => {
                  const districtLabel = lang === 'ru' ? d.nameRu : d.nameUz;
                  return (
                    <option key={d.id} value={d.name}>
                      {districtLabel} {lang === 'uz' && d.nameKaa ? `(${d.nameKaa})` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Search Input */}
            <div className="bq-stores-search-input-wrap">
              <Search size={15} className="bq-search-icon" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'ru' ? 'Поиск товара или магазина...' : 'Mahsulot yoki do‘kon nomi...'}
                className="bq-stores-search-input"
                aria-label={t.searchAria}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="bq-search-clear-btn"
                  onClick={handleClearProductFilter}
                  title={t.clearSearch}
                >
                  &times;
                </button>
              )}
            </div>
          </div>

          {/* Tertiary Row: Categories & Quick Product Chips */}
          <div className="bq-stores-tertiary-filters">
            {/* Category Selector Pills */}
            <div className="bq-stores-cat-group">
              <span className="bq-stores-filter-label">
                <Tag size={13} /> {t.filterCategory}:
              </span>
              <div className="bq-stores-cat-pills">
                {STORE_CATEGORIES.map((cat) => {
                  const label = lang === 'ru' ? cat.labelRu : cat.labelUz;
                  const isActive = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`bq-stores-cat-pill ${isActive ? 'bq-stores-cat-pill--active' : ''}`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Suggestions */}
            <div className="bq-stores-quick-products">
              <span className="bq-stores-filter-label">
                <Sparkles size={13} className="text-amber-500" /> {t.quickProductSuggestions}
              </span>
              <div className="bq-stores-quick-chips">
                {QUICK_PRODUCT_KEYWORDS.map((kw) => (
                  <button
                    key={kw}
                    type="button"
                    className={`bq-quick-prod-chip ${searchQuery.toLowerCase() === kw.toLowerCase() ? 'bq-quick-prod-chip--active' : ''}`}
                    onClick={() => handleSelectQuickProduct(kw)}
                  >
                    {kw}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Product Match Banner */}
          {activeProduct && (
            <div className="bq-stores-active-product-banner animate-fade-in">
              <div className="bq-stores-active-product-info">
                <Package size={16} className="text-emerald" />
                <span>
                  <strong>{activeProduct.name}</strong> — {t.productOffersCount(displayedStores.length)}
                </span>
                {isMatchingProduct && (
                  <span className="bq-stores-matching-spinner" />
                )}
              </div>

              <div className="bq-stores-active-product-actions">
                {/* In Stock toggle */}
                <label className="bq-stock-toggle-label">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="bq-stock-checkbox"
                  />
                  <span>{t.inStockOnly}</span>
                </label>

                <button
                  type="button"
                  className="bq-clear-product-filter-btn"
                  onClick={handleClearProductFilter}
                >
                  {t.clearProductFilter}
                </button>
              </div>
            </div>
          )}

          {/* View and Sort toolbar */}
          <div className="bq-stores-toolbar">
            <div className="bq-stores-toolbar-left">
              <span className="bq-stores-count-label">
                {loading
                  ? t.loadingStores
                  : t.placesCount(displayedStores.length)}
              </span>
              {radiusKm && userCoords && (
                <span className="bq-stores-filter-tag">
                  {t.radiusTag(radiusKm)}
                </span>
              )}
              {selectedCategory && (
                <span className="bq-stores-filter-tag bq-stores-filter-tag--category">
                  {translateCategory(selectedCategory, lang)}
                </span>
              )}
              {selectedDistrict && (
                <span className="bq-stores-filter-tag bq-stores-filter-tag--district">
                  {selectedDistrict}
                </span>
              )}
              {sourceFilter !== 'all' && (
                <span className="bq-stores-filter-tag bq-stores-filter-tag--source">
                  {sourceFilter === 'birqidir' ? t.onlyBirQidirTag : t.onlyOsmTag}
                </span>
              )}
            </div>

            <div className="bq-stores-toolbar-right">
              {/* Sort selector */}
              <div className="bq-stores-sort-wrap">
                <label htmlFor="stores-sort-select" className="bq-stores-sort-label">
                  {t.sortLabel}
                </label>
                <select
                  id="stores-sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'distance' | 'price_asc' | 'price_desc' | 'name')}
                  className="bq-stores-sort-select"
                >
                  {userCoords && <option value="distance">{t.sortDistance}</option>}
                  {activeProduct && <option value="price_asc">{t.sortPriceAsc}</option>}
                  {activeProduct && <option value="price_desc">{t.sortPriceDesc}</option>}
                  <option value="name">{t.sortName}</option>
                </select>
              </div>

              {/* View Switcher: Both, Map, List */}
              <div className="bq-stores-view-toggle" role="group" aria-label={lang === 'ru' ? 'Режим отображения' : 'Ko‘rinish turi'}>
                <button
                  type="button"
                  className={`bq-view-toggle-btn ${viewMode === 'both' ? 'bq-view-toggle-btn--active' : ''}`}
                  onClick={() => setViewMode('both')}
                  title={t.viewAll}
                >
                  <Layers size={15} />
                  <span className="hide-on-mobile">{t.viewAll}</span>
                </button>
                <button
                  type="button"
                  className={`bq-view-toggle-btn ${viewMode === 'map' ? 'bq-view-toggle-btn--active' : ''}`}
                  onClick={() => setViewMode('map')}
                  title={t.viewMap}
                >
                  <MapIcon size={15} />
                  <span>{t.viewMap}</span>
                </button>
                <button
                  type="button"
                  className={`bq-view-toggle-btn ${viewMode === 'list' ? 'bq-view-toggle-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  title={t.viewList}
                >
                  <List size={15} />
                  <span>{t.viewList}</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="bq-stores-loading animate-fade-in">
            <div className="bq-stores-loading-spinner" />
            <p>{t.loadingStores}</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="bq-stores-error animate-fade-in" role="alert">
            <AlertCircle size={24} className="text-rose" />
            <div>
              <h4>{lang === 'ru' ? 'Не удалось загрузить данные' : 'Ma’lumotlarni yuklab bo‘lmadi'}</h4>
              <p>{error}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchStoresData}>
              {t.retry}
            </Button>
          </div>
        )}

        {/* Interactive Main Content Area */}
        {!loading && !error && (
          <div className={`bq-stores-content-layout bq-stores-content-layout--${viewMode}`}>
            {/* 1. Leaflet Interactive Map View */}
            {(viewMode === 'both' || viewMode === 'map') && (
              <div className="bq-stores-map-column animate-fade-in">
                <NearbyStoresMap
                  stores={displayedStores}
                  userCoords={userCoords}
                  selectedStoreId={selectedStoreId}
                  radiusKm={radiusKm}
                  onSelectStore={handleSelectStore}
                  height={viewMode === 'map' ? (isFullPage ? '620px' : '540px') : (isFullPage ? '520px' : '480px')}
                  defaultCenter={CITY_CENTROIDS.Nukus}
                  lang={lang}
                />
              </div>
            )}

            {/* 2. Store Cards List View */}
            {(viewMode === 'both' || viewMode === 'list') && (
              <div className="bq-stores-list-column animate-fade-in">
                {displayedStores.length === 0 ? (
                  <div className="bq-stores-empty">
                    <StoreIcon size={32} className="text-slate-400" />
                    <h4>{t.noStoresFound}</h4>
                    <p>
                      {userCoords && radiusKm
                        ? t.emptyRadiusMsg(radiusKm)
                        : t.emptyDefaultMsg}
                    </p>
                    <div className="bq-stores-empty-actions">
                      {radiusKm && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setRadiusKm(null)}
                        >
                          {t.removeRadiusBtn}
                        </Button>
                      )}
                      {(selectedDistrict || sourceFilter !== 'all' || searchQuery) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedDistrict('');
                            setSourceFilter('all');
                            setSearchQuery('');
                          }}
                        >
                          {t.clearAllFiltersBtn}
                        </Button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bq-stores-cards-scroll">
                    {displayedStores.map((store) => {
                      const isSelected = selectedStoreId === store.id;
                      const hasCoords = isValidCoordinates(store.coordinates);
                      const isOsm = store.sourceType === 'openstreetmap';
                      const isRealVerified = Boolean(store.isVerified && !store.isDemo);
                      const directionsUrl = hasCoords
                        ? buildDirectionsUrl(store.coordinates, userCoords)
                        : null;
                      const displayName = getSafeStoreName(store.name, lang);
                      const displayCategory = translateCategory(store.category, lang);
                      const isStoreFav = isStoreFavorite(store.id);

                      return (
                        <div
                          key={store.id}
                          id={`store-card-${store.id}`}
                          className={`bq-store-card ${isSelected ? 'bq-store-card--selected' : ''} ${isOsm ? 'bq-store-card--osm' : ''}`}
                          onClick={() => setSelectedStoreId(store.id)}
                        >
                          <div className="bq-store-card__header">
                            <div className={`bq-store-card__icon-box ${isOsm ? 'bq-store-card__icon-box--osm' : ''}`}>
                              {isOsm ? <Globe size={20} /> : <StoreIcon size={20} />}
                            </div>
                            <div className="bq-store-card__title-group">
                              <div className="bq-store-card__name-row">
                                <h4 className="bq-store-card__name">{displayName}</h4>
                                {isRealVerified && (
                                  <span className="bq-store-card__verified" title={t.verifiedPartnerTitle}>
                                    <ShieldCheck size={12} />
                                    <span>{t.verifiedPartner}</span>
                                  </span>
                                )}
                                {!store.isVerified && !isOsm && !store.isDemo && (
                                  <span className="bq-store-card__unverified" title={t.unverifiedStore}>
                                    <StoreIcon size={12} />
                                    <span>{t.unverifiedStore}</span>
                                  </span>
                                )}
                                {isOsm && (
                                  <span className="bq-store-card__osm-tag" title="OpenStreetMap">
                                    <Globe size={11} />
                                    <span>{t.osmPlace}</span>
                                  </span>
                                )}
                                {store.isDemo && (
                                  <span className="bq-store-card__demo-tag">{t.demoStore}</span>
                                )}
                              </div>
                              <div className="bq-store-card__sub-row">
                                <span className="bq-store-card__category">{displayCategory}</span>
                                {store.district && (
                                  <span className="bq-store-card__district-badge">
                                    {store.district}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              className={`bq-store-card__fav-btn ${isStoreFav ? 'bq-store-card__fav-btn--active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStoreFavorite({
                                  id: store.id,
                                  name: store.name,
                                  city: store.city,
                                  address: store.address,
                                  category: store.category,
                                  phone: store.phone,
                                });
                              }}
                              aria-label={isStoreFav ? (lang === 'ru' ? 'Удалить из сохраненных' : "Saqlanganlardan o'chirish") : (lang === 'ru' ? 'Сохранить' : 'Saqlash')}
                              title={isStoreFav ? (lang === 'ru' ? 'Удалить из сохраненных' : "Saqlanganlardan o'chirish") : (lang === 'ru' ? 'Сохранить' : 'Saqlash')}
                            >
                              <Heart size={15} fill={isStoreFav ? 'currentColor' : 'none'} />
                            </button>
                          </div>

                          <div className="bq-store-card__body">
                            {/* Product Offer Section when searching by product */}
                            {store.matchedOffer && (
                              <div className="bq-store-card__offer-box">
                                <div className="bq-store-card__offer-title-row">
                                  <Package size={14} className="text-emerald" />
                                  <span className="bq-store-card__offer-name">
                                    {store.matchedOffer.productName}
                                  </span>
                                  {store.matchedOffer.isDemo && (
                                    <span className="bq-store-card__offer-demo-tag">Demo taklif</span>
                                  )}
                                </div>

                                <div className="bq-store-card__offer-price-row">
                                  <span className="bq-store-card__offer-price">
                                    {store.matchedOffer.price > 0
                                      ? `${store.matchedOffer.price.toLocaleString('uz-UZ')} ${store.matchedOffer.currency}`
                                      : ''}
                                  </span>
                                  <div className="bq-store-card__offer-badges">
                                    {store.isCheapest && (
                                      <span className="bq-badge-cheapest">🏆 {t.cheapestOfferBadge}</span>
                                    )}
                                    {store.isClosest && (
                                      <span className="bq-badge-closest">📍 {t.closestStoreBadge}</span>
                                    )}
                                    <span className="bq-badge-stock">
                                      {store.matchedOffer.inStock
                                        ? '✓ ' + t.inStockLabel
                                        : t.outOfStockLabel}
                                    </span>
                                  </div>
                                </div>

                                {(store.matchedOffer.warrantyMonths || store.matchedOffer.deliveryAvailable) && (
                                  <div className="bq-store-card__offer-extra-row">
                                    {store.matchedOffer.warrantyMonths && (
                                      <span>🛡️ {store.matchedOffer.warrantyMonths} oy kafolat</span>
                                    )}
                                    {store.matchedOffer.deliveryAvailable && (
                                      <span>🚚 Yetkazib berish</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="bq-store-card__meta-item">
                              <MapPin size={14} className="text-slate-400" />
                              <span>{store.city}, {store.address}</span>
                            </div>

                            {/* Distance Badge */}
                            {userCoords && (
                              <div className="bq-store-card__distance-row">
                                <span className={`bq-distance-badge ${store.distanceKm !== undefined ? 'bq-distance-badge--active' : ''}`}>
                                  <Navigation size={12} />
                                  <span>{t.distanceLabel(formatDistance(store.distanceKm, lang))}</span>
                                </span>
                              </div>
                            )}

                            {store.phone && (
                              <div className="bq-store-card__meta-item">
                                <Phone size={14} className="text-slate-400" />
                                <a href={`tel:${store.phone}`} className="bq-store-phone-link">
                                  {store.phone}
                                </a>
                              </div>
                            )}

                            {store.website && (
                              <div className="bq-store-card__meta-item">
                                <Globe size={14} className="text-slate-400" />
                                <a
                                  href={store.website}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bq-store-website-link"
                                >
                                  <span>{t.website}</span>
                                  <ExternalLink size={12} />
                                </a>
                              </div>
                            )}

                            {store.openingHours && (
                              <div className="bq-store-card__meta-item">
                                <Clock size={14} className="text-slate-400" />
                                <span>{store.openingHours}</span>
                              </div>
                            )}

                            {store.description && (
                              <p className="bq-store-card__desc">{store.description}</p>
                            )}
                          </div>

                          <div className="bq-store-card__footer">
                            <div className="bq-store-card__actions-left">
                              {directionsUrl && (
                                <a
                                  href={directionsUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="bq-directions-btn"
                                  onClick={(e) => e.stopPropagation()}
                                  title={t.getDirections}
                                >
                                  <Navigation size={13} />
                                  <span>{t.getDirections}</span>
                                </a>
                              )}
                            </div>

                            <div className="bq-store-card__actions-right">
                              {hasCoords ? (
                                <Button
                                  type="button"
                                  variant={isSelected ? 'primary' : 'outline'}
                                  size="sm"
                                  leftIcon={<MapIcon size={14} />}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectStore(store);
                                  }}
                                >
                                  {isSelected ? t.selectedOnMap : t.viewOnMap}
                                </Button>
                              ) : (
                                <span className="bq-store-no-coords-note">
                                  {t.noCoordinatesNote}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* OpenStreetMap ODbL Attribution Notice */}
        <div className="bq-osm-attribution-footer">
          <p>{t.osmAttribution}</p>
        </div>
      </div>
    </section>
  );
};
