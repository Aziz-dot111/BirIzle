import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  PackageSearch,
  AlertCircle,
  MapPin,
  Sparkles,
  ArrowLeft,
  SlidersHorizontal,
  ArrowUpDown,
  Tag,
  X,
} from 'lucide-react';
import { SearchBar } from '@/features/home/SearchBar';
import { ProductOffersModal } from '@/features/catalog/ProductOffersModal';
import { ProductCard } from '@/components/common/ProductCard';
import { LocationControl } from '@/components/common/LocationControl';
import { Button } from '@/components/common/Button';
import type { ProductItem, Coordinates } from '@/types';
import {
  searchProductsByKeyword,
  getAvailableBrands,
  type BrandWithCount,
} from '@/services/firebase/catalog';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import './SearchPage.css';

const QUICK_SUGGESTIONS = ['telefon', 'Samsung A24', 'noutbuk', 'sement', 'konditsioner'];

const SEARCH_CATEGORIES = [
  { id: '', label: 'Barcha toifalar' },
  { id: 'phones', label: 'Telefonlar' },
  { id: 'appliances', label: 'Maishiy texnika' },
  { id: 'computers', label: 'Kompyuterlar' },
  { id: 'construction', label: 'Qurilish mollari' },
];

export const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const region = searchParams.get('region') || 'Nukus';
  const scope = (searchParams.get('scope') as 'all' | 'products' | 'services') || 'all';
  const urlCategory = searchParams.get('category') || searchParams.get('cat') || '';
  const urlBrandsParam = searchParams.get('brands') || searchParams.get('brand') || '';

  // Filters state
  const [category, setCategory] = useState<string>(urlCategory);

  const initialBrands = useMemo(() => {
    if (!urlBrandsParam) return [];
    return urlBrandsParam
      .split(',')
      .map((b) => b.trim())
      .filter(Boolean);
  }, [urlBrandsParam]);

  const [selectedBrands, setSelectedBrands] = useState<string[]>(initialBrands);
  const [availableBrands, setAvailableBrands] = useState<BrandWithCount[]>([]);

  // Sync category & brands if URL parameters change
  useEffect(() => {
    setCategory(urlCategory);
  }, [urlCategory]);

  useEffect(() => {
    setSelectedBrands(initialBrands);
  }, [initialBrands]);

  // Load available brands dynamically from catalog based on current category
  useEffect(() => {
    let isMounted = true;
    getAvailableBrands(category).then((brands) => {
      if (isMounted) setAvailableBrands(brands);
    });
    return () => {
      isMounted = false;
    };
  }, [category]);

  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name_asc'>('price_asc');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);

  // Results & status state
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);

  const { addToHistory } = useSearchHistory();

  // Stale request race condition protector
  const requestIdRef = useRef(0);

  const performSearch = useCallback(
    async (
      searchTerm: string,
      filterOpts: {
        cat?: string;
        brands?: string[];
        minP?: number;
        maxP?: number;
        sort?: 'price_asc' | 'price_desc' | 'name_asc';
        inStock?: boolean;
      }
    ) => {
      const trimmed = searchTerm.trim();
      const currentReqId = ++requestIdRef.current;

      if (!trimmed && !filterOpts.cat && (!filterOpts.brands || filterOpts.brands.length === 0)) {
        setProducts([]);
        setLoading(false);
        setError(null);
        return;
      }

      if (trimmed) {
        addToHistory(trimmed);
      }

      setLoading(true);
      setError(null);

      try {
        const res = await searchProductsByKeyword(trimmed, {
          category: filterOpts.cat || undefined,
          brands: filterOpts.brands,
          minPrice: filterOpts.minP,
          maxPrice: filterOpts.maxP,
          sortBy: filterOpts.sort,
          onlyInStock: filterOpts.inStock,
          includeDemo: true,
        });

        // Discard result if newer request has been triggered in the meantime
        if (currentReqId !== requestIdRef.current) {
          return;
        }

        if (res.error) {
          setError(res.error);
          setProducts([]);
        } else {
          setProducts(res.data || []);
        }
      } catch (err) {
        if (currentReqId !== requestIdRef.current) return;
        const msg = err instanceof Error ? err.message : 'Qidiruv jarayonida xatolik yuz berdi.';
        setError(msg);
        setProducts([]);
      } finally {
        if (currentReqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [addToHistory]
  );

  // Debounced execution when query or filters change
  useEffect(() => {
    const minP = minPriceInput ? Number(minPriceInput) : undefined;
    const maxP = maxPriceInput ? Number(maxPriceInput) : undefined;

    const timer = setTimeout(() => {
      performSearch(query, {
        cat: category,
        brands: selectedBrands,
        minP: !isNaN(minP as number) ? minP : undefined,
        maxP: !isNaN(maxP as number) ? maxP : undefined,
        sort: sortBy,
        inStock: onlyInStock,
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, category, selectedBrands, minPriceInput, maxPriceInput, sortBy, onlyInStock, performSearch]);

  const handleSearchBarSubmit = (
    newQuery: string,
    newRegion: string,
    newScope: 'all' | 'products' | 'services'
  ) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', newQuery);
    newParams.set('region', newRegion);
    newParams.set('scope', newScope);
    setSearchParams(newParams);
  };

  const handleSuggestionClick = (term: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('q', term);
    newParams.set('region', region);
    newParams.set('scope', 'products');
    setSearchParams(newParams);
  };

  const handleCategorySelect = (newCat: string) => {
    setCategory(newCat);
    const newParams = new URLSearchParams(searchParams);
    if (newCat) {
      newParams.set('category', newCat);
    } else {
      newParams.delete('category');
      newParams.delete('cat');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleToggleBrand = (brandName: string) => {
    const isSelected = selectedBrands.includes(brandName);
    const nextBrands = isSelected
      ? selectedBrands.filter((b) => b !== brandName)
      : [...selectedBrands, brandName];

    setSelectedBrands(nextBrands);

    const newParams = new URLSearchParams(searchParams);
    if (nextBrands.length > 0) {
      newParams.set('brands', nextBrands.join(','));
      newParams.delete('brand');
    } else {
      newParams.delete('brands');
      newParams.delete('brand');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleClearFilters = () => {
    setCategory('');
    setSelectedBrands([]);
    setMinPriceInput('');
    setMaxPriceInput('');
    setSortBy('price_asc');
    setOnlyInStock(false);

    const newParams = new URLSearchParams(searchParams);
    newParams.delete('category');
    newParams.delete('cat');
    newParams.delete('brands');
    newParams.delete('brand');
    setSearchParams(newParams, { replace: true });
  };

  // Active filter count computation
  const activeFilterCount =
    (category ? 1 : 0) +
    selectedBrands.length +
    (minPriceInput || maxPriceInput ? 1 : 0) +
    (onlyInStock ? 1 : 0) +
    (userCoords ? 1 : 0);

  const hasActiveFilters = Boolean(
    category ||
    selectedBrands.length > 0 ||
    minPriceInput ||
    maxPriceInput ||
    onlyInStock ||
    userCoords ||
    sortBy !== 'price_asc'
  );

  return (
    <div className="bq-search-page">
      <div className="container">
        {/* Top Search Bar */}
        <div className="bq-search-page__top-bar">
          <SearchBar
            initialQuery={query}
            initialRegion={region}
            initialScope={scope}
            onSearch={handleSearchBarSubmit}
          />

          <div className="bq-search-location-panel animate-fade-in">
            <LocationControl
              userCoords={userCoords}
              onLocationChange={(coords, _src, cityName) => {
                setUserCoords(coords);
                if (cityName) {
                  setSearchParams({ q: query, region: cityName, scope });
                }
              }}
              radiusKm={radiusKm}
              onRadiusChange={setRadiusKm}
              showRadiusFilter={Boolean(userCoords)}
            />
          </div>
        </div>

        {/* Search Results Header */}
        {(query.trim() || category || selectedBrands.length > 0) && (
          <div className="bq-search-page__header animate-fade-in">
            <div className="bq-search-page__title-wrap">
              <h1 className="bq-search-page__title">
                {query.trim()
                  ? `\u201c${query}\u201d bo‘yicha qidiruv natijalari`
                  : category
                    ? `${SEARCH_CATEGORIES.find((c) => c.id === category)?.label || 'Mahsulotlar'} katalogi`
                    : selectedBrands.length > 0
                      ? `${selectedBrands.join(', ')} brendlari bo‘yicha mahsulotlar`
                      : 'Mahsulotlar katalogi'}
              </h1>
              {!loading && !error && (
                <span className="bq-search-page__count">
                  {products.length > 0
                    ? `${products.length} ta mahsulot topildi`
                    : 'Mahsulot topilmadi'}
                </span>
              )}
            </div>

            <div className="bq-search-page__filters-bar">
              <Link
                to={`/map?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`}
                className="bq-search-filter-badge bq-search-filter-badge--map-action"
                title="Qidiruv natijalarini interaktiv xaritada ko‘rish"
              >
                <MapPin size={13} className="text-emerald" />
                <span>Xaritada do‘konlarni ko‘rish</span>
              </Link>
              <span className="bq-search-filter-badge">
                <MapPin size={13} className="text-emerald" /> Hudud: {region}
              </span>
              <span className="bq-search-filter-badge">
                Bo‘lim: {scope === 'products' ? 'Mahsulotlar' : scope === 'services' ? 'Xizmatlar' : 'Barcha'}
              </span>
              {userCoords && (
                <span
                  className="bq-search-filter-badge"
                  style={{
                    color: 'var(--color-primary-800)',
                    backgroundColor: 'var(--color-primary-50)',
                    borderColor: 'var(--color-primary-200)',
                  }}
                >
                  📍 GPS faol {radiusKm ? `(${radiusKm} km radius)` : ''}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="bq-search-active-chips-bar animate-fade-in" aria-label="Faol filtrlar">
            <div className="bq-search-active-chips-inner">
              <span className="bq-filter-count-badge">
                <SlidersHorizontal size={12} />
                Filtrlar ({activeFilterCount})
              </span>

              {/* Category chip */}
              {category && (
                <button
                  type="button"
                  className="bq-active-chip"
                  onClick={() => handleCategorySelect('')}
                  title="Toifani tozalash"
                  aria-label={`Toifani tozalash: ${SEARCH_CATEGORIES.find((c) => c.id === category)?.label || category}`}
                >
                  <span>Toifa: {SEARCH_CATEGORIES.find((c) => c.id === category)?.label || category}</span>
                  <X size={13} className="bq-active-chip__remove" />
                </button>
              )}

              {/* Multi-select Brand chips */}
              {selectedBrands.map((b) => (
                <button
                  key={b}
                  type="button"
                  className="bq-active-chip"
                  onClick={() => handleToggleBrand(b)}
                  title={`${b} brendini olib tashlash`}
                  aria-label={`Brendni tozalash: ${b}`}
                >
                  <Tag size={12} />
                  <span>Brend: {b}</span>
                  <X size={13} className="bq-active-chip__remove" />
                </button>
              ))}

              {/* Price range chip */}
              {(minPriceInput || maxPriceInput) && (
                <button
                  type="button"
                  className="bq-active-chip"
                  onClick={() => {
                    setMinPriceInput('');
                    setMaxPriceInput('');
                  }}
                  title="Narx filtrini tozalash"
                  aria-label="Narx filtrini tozalash"
                >
                  <span>
                    Narx: {minPriceInput ? `${Number(minPriceInput).toLocaleString('uz-UZ')} dan` : ''}{' '}
                    {maxPriceInput ? `${Number(maxPriceInput).toLocaleString('uz-UZ')} gacha` : ''}
                  </span>
                  <X size={13} className="bq-active-chip__remove" />
                </button>
              )}

              {/* In-stock chip */}
              {onlyInStock && (
                <button
                  type="button"
                  className="bq-active-chip"
                  onClick={() => setOnlyInStock(false)}
                  title="Mavjudlik filtrini tozalash"
                  aria-label="Mavjudlik filtrini tozalash"
                >
                  <span>Faqat mavjud</span>
                  <X size={13} className="bq-active-chip__remove" />
                </button>
              )}

              {/* GPS chip */}
              {userCoords && (
                <button
                  type="button"
                  className="bq-active-chip"
                  onClick={() => setUserCoords(null)}
                  title="GPS manzilini tozalash"
                  aria-label="GPS manzilini tozalash"
                >
                  <span>📍 GPS {radiusKm ? `(${radiusKm} km)` : ''}</span>
                  <X size={13} className="bq-active-chip__remove" />
                </button>
              )}

              {/* Clear All action */}
              <button
                type="button"
                className="bq-search-clear-all-link"
                onClick={handleClearFilters}
              >
                Barchasini tozalash
              </button>
            </div>
          </div>
        )}

        {/* Filter Toolbar (Category, Multi-select Brands, Price Range, Sort, In-Stock) */}
        {(query.trim() || products.length > 0 || hasActiveFilters) && (
          <div className="bq-search-toolbar animate-fade-in">
            {/* Row 1: Categories */}
            <div className="bq-search-toolbar__row">
              <div className="bq-search-categories">
                <span className="bq-search-row-label">
                  <SlidersHorizontal size={14} /> Toifalar:
                </span>
                {SEARCH_CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`bq-search-cat-pill ${category === cat.id ? 'bq-search-cat-pill--active' : ''}`}
                    onClick={() => handleCategorySelect(cat.id)}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  className="bq-search-clear-filters-btn"
                  onClick={handleClearFilters}
                >
                  Filtrlarni tozalash
                </button>
              )}
            </div>

            {/* Row 2: Multi-select Brand Filtering (OR logic within brands, AND with other filters) */}
            {availableBrands.length > 0 && (
              <div className="bq-search-toolbar__row bq-search-toolbar__brands-row">
                <div className="bq-search-brands-wrap">
                  <span className="bq-search-row-label">
                    <Tag size={14} /> Brendlar:
                  </span>
                  <div className="bq-search-brands-list">
                    {availableBrands.map((b) => {
                      const checked = selectedBrands.includes(b.name);
                      return (
                        <label
                          key={b.name}
                          className={`bq-search-brand-chip ${
                            checked ? 'bq-search-brand-chip--checked' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => handleToggleBrand(b.name)}
                            className="bq-search-brand-checkbox"
                          />
                          <span className="bq-search-brand-name">{b.name}</span>
                          <span className="bq-search-brand-count">({b.count})</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Row 3: Sort, Price Range, and In-Stock Controls */}
            <div className="bq-search-toolbar__row bq-search-toolbar__controls-row">
              <div className="bq-search-controls">
                {/* Sort selector */}
                <div className="bq-search-control-group">
                  <ArrowUpDown size={14} className="text-slate-400" />
                  <span>Saralash:</span>
                  <select
                    className="bq-search-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'price_asc' | 'price_desc' | 'name_asc')}
                    aria-label="Mahsulotlarni saralash"
                  >
                    <option value="price_asc">Eng arzonidan (o‘sish)</option>
                    <option value="price_desc">Eng qimmatidan (kamayish)</option>
                    <option value="name_asc">Nomi bo‘yicha (A-Z)</option>
                  </select>
                </div>

                {/* Price range inputs */}
                <div className="bq-search-control-group">
                  <span>Narx (so‘m):</span>
                  <div className="bq-search-price-inputs">
                    <input
                      type="number"
                      placeholder="Min"
                      min={0}
                      value={minPriceInput}
                      onChange={(e) => setMinPriceInput(e.target.value)}
                      className="bq-search-price-input"
                      aria-label="Minimal narx"
                    />
                    <span>—</span>
                    <input
                      type="number"
                      placeholder="Maks"
                      min={0}
                      value={maxPriceInput}
                      onChange={(e) => setMaxPriceInput(e.target.value)}
                      className="bq-search-price-input"
                      aria-label="Maksimal narx"
                    />
                  </div>
                </div>

                {/* In stock only toggle */}
                <label className="bq-search-checkbox-label">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                    className="bq-search-checkbox"
                  />
                  <span>Faqat mavjud mahsulotlar</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* 1. Loading State */}
        {loading && (
          <div className="bq-search-loading animate-fade-in">
            <div className="bq-search-loading-spinner" />
            <p>{region} do‘konlaridan mahsulotlar va narxlar solishtirilmoqda...</p>
          </div>
        )}

        {/* 2. Error State (Explicit permission-denied reporting) */}
        {!loading && error && (
          <div className="bq-search-error animate-fade-in">
            <div className="bq-search-error__icon">
              <AlertCircle size={28} />
            </div>
            <h2 className="bq-search-error__title">Qidiruv jarayonida xatolik yuz berdi</h2>
            <p className="bq-search-error__desc">{error}</p>
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                performSearch(query, {
                  cat: category,
                  sort: sortBy,
                })
              }
            >
              Qaytadan urinish
            </Button>
          </div>
        )}

        {/* 3. Empty State */}
        {!loading && !error && (query.trim() || category || selectedBrands.length > 0) && products.length === 0 && (
          <div className="bq-search-empty animate-fade-in">
            <div className="bq-search-empty__icon">
              <PackageSearch size={32} />
            </div>
            <h2 className="bq-search-empty__title">Hech qanday mahsulot topilmadi</h2>
            <p className="bq-search-empty__desc">
              {query.trim()
                ? `\u201c${query}\u201d so‘rovi bo‘yicha ${region} do‘konlarida hozircha mos tovar topilmadi.`
                : 'Tanlangan filtrlar bo‘yicha hozircha hech qanday mahsulot topilmadi.'}
              Qidiruv so‘zini yoki filtrlarni o‘zgartirib ko‘ring.
            </p>
            <div className="bq-search-empty__suggestions">
              <div className="bq-search-empty__suggestions-title">
                Tavsiya etilgan qidiruvlar:
              </div>
              <div className="bq-search-empty__chips">
                {QUICK_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    className="bq-search-chip"
                    onClick={() => handleSuggestionClick(sug)}
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '2rem' }}>
              <Link to="/">
                <Button variant="secondary" size="md" leftIcon={<ArrowLeft size={16} />}>
                  Bosh sahifaga qaytish
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* 4. Initial Empty Query Prompt */}
        {!loading && !error && !query.trim() && !category && selectedBrands.length === 0 && products.length === 0 && (
          <div className="bq-search-empty animate-fade-in">
            <div className="bq-search-empty__icon">
              <Sparkles size={32} className="text-emerald" />
            </div>
            <h2 className="bq-search-empty__title">Nimani izlamoqchisiz?</h2>
            <p className="bq-search-empty__desc">
              Yuqoridagi qidiruv paneliga mahsulot yoki tovar nomini yozing. Biz Nukus va butun O‘zbekiston do‘konlaridagi narxlarni solishtirib beramiz.
            </p>
            <div className="bq-search-empty__chips">
              {QUICK_SUGGESTIONS.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  className="bq-search-chip"
                  onClick={() => handleSuggestionClick(sug)}
                >
                  {sug}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 5. Results Grid */}
        {!loading && !error && products.length > 0 && (
          <div className="bq-search-grid animate-fade-in">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onCompareClick={(prod) => setSelectedProduct(prod)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Store Offers Comparison Modal */}
      {selectedProduct && (
        <ProductOffersModal
          product={selectedProduct}
          userCoords={userCoords}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
};

