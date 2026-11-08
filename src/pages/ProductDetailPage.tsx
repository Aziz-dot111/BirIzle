import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  Share2,
  Store as StoreIcon,
  MapPin,
  Phone,
  ShieldCheck,
  Truck,
  AlertCircle,
  PackageSearch,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  ChevronRight,
  TrendingDown,
  Check,
  Clock,
  ExternalLink,
  X,
  Info,
  SlidersHorizontal,
  Layers,
  ShoppingBag,
} from 'lucide-react';
import type { ProductItem, StoreProductOffer, Coordinates, Store } from '@/types';
import {
  getProductById,
  getStoreProductOffers,
  getProducts,
} from '@/services/firebase/catalog';
import { formatDistance, isValidCoordinates, CITY_CENTROIDS } from '@/utils/geo';
import { buildDirectionsUrl, translateCategory, getSavedMapLanguage } from '@/utils/mapI18n';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { LocationControl } from '@/components/common/LocationControl';
import { NearbyStoresMap } from '@/components/map/NearbyStoresMap';
import { CustomerOrderModal } from '@/components/order/CustomerOrderModal';
import { useFavorites } from '@/hooks/useFavorites';
import './ProductDetailPage.css';

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [product, setProduct] = useState<ProductItem | null>(null);
  const [offers, setOffers] = useState<StoreProductOffer[]>([]);
  const [categoryProducts, setCategoryProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Geo, filters & view
  const [userCoords, setUserCoords] = useState<Coordinates | null>(null);
  const [radiusKm, setRadiusKm] = useState<number | null>(null);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [sortBy, setSortBy] = useState<'price_asc' | 'distance' | 'price_desc'>('price_asc');
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const [selectedStoreModal, setSelectedStoreModal] = useState<StoreProductOffer | null>(null);
  const [selectedOrderOffer, setSelectedOrderOffer] = useState<StoreProductOffer | null>(null);

  const lang = getSavedMapLanguage();
  const {
    isProductFavorite,
    toggleProductFavorite,
    isStoreFavorite,
    toggleStoreFavorite,
  } = useFavorites();

  // Load product and offers
  useEffect(() => {
    if (!id) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    Promise.all([
      getProductById(id),
      getStoreProductOffers(id, userCoords),
    ])
      .then(([productRes, offersRes]) => {
        if (!isMounted) return;

        if (productRes.error || !productRes.data) {
          setError(productRes.error || (lang === 'ru' ? 'Товар не найден.' : 'Mahsulot topilmadi.'));
          setProduct(null);
        } else {
          setProduct(productRes.data);
          setOffers(offersRes.data || []);

          // Fetch products in the same category to find related items and variants
          if (productRes.data.category) {
            getProducts({
              category: productRes.data.category,
              includeDemo: true,
              limitCount: 12,
            }).then((catRes) => {
              if (isMounted && catRes.data) {
                setCategoryProducts(catRes.data);
              }
            });
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Ma’lumotlarni yuklashda xatolik yuz berdi.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, userCoords, lang]);

  // Identify lowest and highest prices (strictly positive numbers)
  const priceStats = useMemo(() => {
    if (offers.length === 0) return null;
    const validPrices = offers.map((o) => o.price).filter((p) => typeof p === 'number' && p > 0);
    if (validPrices.length === 0) return null;
    const lowest = Math.min(...validPrices);
    const highest = Math.max(...validPrices);
    const savings = highest - lowest;
    return { lowest, highest, savings };
  }, [offers]);

  // Identify sibling variants of the same model (e.g. 128GB vs 256GB)
  const productVariants = useMemo(() => {
    if (!product || categoryProducts.length === 0) return [];

    // Match products with same explicit model, or same brand and shared prefix
    return categoryProducts.filter((p) => {
      if (product.model && p.model) {
        return p.model.toLowerCase() === product.model.toLowerCase();
      }
      if (product.brand && p.brand && p.brand.toLowerCase() === product.brand.toLowerCase()) {
        const prodTokens = product.normalizedName.split(/\s+/).slice(0, 3).join(' ');
        const otherTokens = p.normalizedName.split(/\s+/).slice(0, 3).join(' ');
        return prodTokens === otherTokens;
      }
      return false;
    });
  }, [product, categoryProducts]);

  // Other related products (excluding current product and its direct variants)
  const relatedProducts = useMemo(() => {
    if (!product) return [];
    const variantIds = new Set(productVariants.map((v) => v.id));
    return categoryProducts
      .filter((p) => p.id !== product.id && !variantIds.has(p.id))
      .slice(0, 4);
  }, [product, categoryProducts, productVariants]);

  // Filter offers by inStock & radius
  const filteredOffers = useMemo(() => {
    let list = offers;

    if (onlyInStock) {
      list = list.filter((o) => o.inStock || o.availability === 'in_stock');
    }

    if (radiusKm && userCoords) {
      list = list.filter((o) => {
        if (o.distanceKm === undefined) return false;
        return o.distanceKm <= radiusKm;
      });
    }

    return list;
  }, [offers, onlyInStock, radiusKm, userCoords]);

  // Sort offers safely (unpriced items pushed to the end)
  const sortedOffers = useMemo(() => {
    const list = [...filteredOffers];
    if (sortBy === 'distance') {
      list.sort((a, b) => (a.distanceKm ?? 999999) - (b.distanceKm ?? 999999));
    } else if (sortBy === 'price_desc') {
      list.sort((a, b) => {
        const pA = typeof a.price === 'number' && a.price > 0 ? a.price : -1;
        const pB = typeof b.price === 'number' && b.price > 0 ? b.price : -1;
        return pB - pA;
      });
    } else {
      // price_asc: Cheapest first, unpriced offers go to the end
      list.sort((a, b) => {
        const hasA = typeof a.price === 'number' && a.price > 0;
        const hasB = typeof b.price === 'number' && b.price > 0;
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        return a.price - b.price;
      });
    }
    return list;
  }, [filteredOffers, sortBy]);

  // Convert offers to Store[] for interactive Leaflet map
  const storesForMap: Store[] = useMemo(() => {
    if (!product) return [];
    const validOffers = filteredOffers.filter(
      (o) => o.storeCoordinates && isValidCoordinates(o.storeCoordinates)
    );
    const minDistance =
      userCoords && validOffers.some((o) => o.distanceKm !== undefined)
        ? Math.min(
            ...validOffers
              .filter((o) => o.distanceKm !== undefined)
              .map((o) => o.distanceKm as number)
          )
        : null;

    return validOffers.map((o) => {
      const isCheapest = priceStats !== null && o.price === priceStats.lowest && o.price > 0;
      const isClosest =
        minDistance !== null &&
        o.distanceKm !== undefined &&
        o.distanceKm === minDistance;

      return {
        id: o.storeId,
        name: o.storeName,
        city: o.storeCity,
        address: o.storeAddress,
        coordinates: o.storeCoordinates as Coordinates,
        category: product.category,
        phone: o.storePhone || '',
        openingHours: '',
        isVerified: o.isStoreVerified,
        isDemo: o.isDemo,
        sourceType: 'birqidir',
        createdAt: '',
        updatedAt: '',
        distanceKm: o.distanceKm,
        isCheapest,
        isClosest,
        matchedOffer: {
          productId: product.id,
          productName: product.name,
          price: o.price,
          currency: o.currency,
          availability: o.availability,
          inStock: Boolean(o.inStock),
          warrantyMonths: o.warrantyMonths,
          deliveryAvailable: o.deliveryAvailable,
          isDemo: o.isDemo,
        },
      };
    });
  }, [filteredOffers, priceStats, userCoords, product]);

  const isFav = product ? isProductFavorite(product.id) : false;

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: product ? `${product.name} — OneShop` : 'OneShop',
          text: `OneShop orqali ${product?.name} narxlarini solishtiring:`,
          url,
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // clipboard access error
    }
  };

  const formatOfferDate = (isoDate?: string) => {
    if (!isoDate) return null;
    try {
      const date = new Date(isoDate);
      return date.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'uz-UZ', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return null;
    }
  };

  const isOfferStale = (isoDate?: string) => {
    if (!isoDate) return false;
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      return diffMs > 60 * 24 * 3600 * 1000; // > 60 days
    } catch {
      return false;
    }
  };

  if (loading) {
    return (
      <div className="bq-product-detail-page">
        <div className="container">
          <div className="bq-product-detail__loading">
            <div className="bq-product-detail__spinner" />
            <p>{lang === 'ru' ? 'Загрузка данных товара и предложений...' : 'Mahsulot va do‘konlar narxlari yuklanmoqda...'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="bq-product-detail-page">
        <div className="container">
          <div className="bq-product-detail__error">
            <AlertCircle size={36} className="text-rose" />
            <h2>{lang === 'ru' ? 'Товар не найден' : 'Mahsulot topilmadi'}</h2>
            <p>{error || (lang === 'ru' ? 'Запрашиваемый товар отсутствует в каталоге.' : 'Qidirilayotgan mahsulot bazada mavjud emas yoki o‘chirilgan.')}</p>
            <div className="bq-product-detail__error-actions">
              <Button variant="primary" size="md" onClick={() => navigate('/search')}>
                {lang === 'ru' ? 'Вернуться к поиску' : 'Qidiruvga qaytish'}
              </Button>
              <Button variant="outline" size="md" onClick={() => navigate('/')}>
                {lang === 'ru' ? 'На главную' : 'Bosh sahifa'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bq-product-detail-page">
      <div className="container">
        {/* Breadcrumbs Navigation */}
        <nav className="bq-product-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="bq-breadcrumb-link">
            {lang === 'ru' ? 'Главная' : 'Bosh sahifa'}
          </Link>
          <ChevronRight size={14} className="bq-breadcrumb-separator" />
          <Link
            to={`/search?category=${encodeURIComponent(product.category)}`}
            className="bq-breadcrumb-link"
          >
            {translateCategory(product.category, lang)}
          </Link>
          <ChevronRight size={14} className="bq-breadcrumb-separator" />
          <span className="bq-breadcrumb-current" aria-current="page">
            {product.name}
          </span>
        </nav>

        {/* Top Action Bar */}
        <div className="bq-product-detail__top-actions">
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              className="bq-product-detail__back-btn"
              onClick={() => navigate(-1)}
              aria-label={lang === 'ru' ? 'Назад' : 'Orqaga'}
            >
              <ArrowLeft size={18} />
              <span>{lang === 'ru' ? 'Назад' : 'Orqaga'}</span>
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/search')}
              className="bq-back-search-btn"
            >
              {lang === 'ru' ? 'Каталог' : 'Qidiruvga qaytish'}
            </Button>
          </div>

          <div className="bq-product-detail__action-btns">
            <button
              type="button"
              className="bq-product-detail__share-btn"
              onClick={handleShare}
              aria-label={lang === 'ru' ? 'Поделиться ссылкой' : 'Havolani ulashish'}
              title="Havolani nusxalash"
            >
              {copiedShare ? (
                <>
                  <Check size={16} className="text-emerald" />
                  <span className="text-emerald">{lang === 'ru' ? 'Скопировано!' : 'Nusxalandi!'}</span>
                </>
              ) : (
                <>
                  <Share2 size={16} />
                  <span>{lang === 'ru' ? 'Поделиться' : 'Ulashish'}</span>
                </>
              )}
            </button>

            <button
              type="button"
              className={`bq-product-detail__fav-btn ${isFav ? 'bq-product-detail__fav-btn--active' : ''}`}
              onClick={() =>
                toggleProductFavorite({
                  id: product.id,
                  name: product.name,
                  category: product.category,
                  imageUrl: product.imageUrl,
                })
              }
              aria-label={isFav ? "Saqlanganlardan o'chirish" : "Saqlash"}
            >
              <Heart size={18} fill={isFav ? 'currentColor' : 'none'} />
              <span>{isFav ? (lang === 'ru' ? 'В сохраненных' : 'Saqlangan') : (lang === 'ru' ? 'В избранное' : 'Saqlash')}</span>
            </button>
          </div>
        </div>

        {/* Product Hero Card */}
        <div className="bq-product-hero-card">
          <div className="bq-product-hero__grid">
            {/* Visual Thumbnail */}
            <div className="bq-product-hero__media">
              {product.imageUrl ? (
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="bq-product-hero__img"
                />
              ) : (
                <div className="bq-product-hero__placeholder">
                  <PackageSearch size={64} className="text-slate-300" />
                </div>
              )}
              {product.isDemo && (
                <span className="bq-product-hero__demo-badge">Demo namuna</span>
              )}
            </div>

            {/* Product Meta & Highlights */}
            <div className="bq-product-hero__info">
              <div className="bq-product-hero__badges">
                <span className="bq-product-hero__cat-badge">
                  {translateCategory(product.category, lang)}
                </span>
                {product.brand && (
                  <span className="bq-product-hero__brand-badge">
                    {product.brand}
                  </span>
                )}
                {product.model && (
                  <span className="bq-product-hero__model-badge" title="Model kodi">
                    Model: {product.model}
                  </span>
                )}
              </div>

              <h1 className="bq-product-hero__title">{product.name}</h1>

              {/* Variant Selector: Keep distinct products separated, allow instant 1-click variant switch */}
              {productVariants.length > 1 && (
                <div className="bq-product-variants-container">
                  <div className="bq-product-variants-label">
                    <Layers size={14} className="text-slate-400" />
                    <span>{lang === 'ru' ? 'Варианты модели:' : 'Model variantlari:'}</span>
                  </div>
                  <div className="bq-product-variants-list" role="radiogroup" aria-label="Variantlar">
                    {productVariants.map((v) => {
                      const isCurrent = v.id === product.id;
                      const specLabel = v.variant?.storage || v.variant?.size || v.name;
                      return (
                        <Link
                          key={v.id}
                          to={`/product/${v.id}`}
                          className={`bq-product-variant-chip ${isCurrent ? 'bq-product-variant-chip--active' : ''}`}
                          aria-checked={isCurrent}
                          role="radio"
                          title={`${v.name} sahifasiga o‘tish`}
                        >
                          <span className="bq-variant-chip__text">{specLabel}</span>
                          {v.minPrice && (
                            <span className="bq-variant-chip__price">
                              {v.minPrice.toLocaleString('uz-UZ')} so‘m
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}

              {product.description && (
                <p className="bq-product-hero__desc">{product.description}</p>
              )}

              {/* Price Comparison Summary Box */}
              <div className="bq-product-hero__price-box">
                <div className="bq-product-hero__price-main">
                  <span className="bq-product-hero__price-label">
                    {lang === 'ru' ? 'Лучшая цена:' : 'Eng yaxshi narx:'}
                  </span>
                  <div className="bq-product-hero__price-value">
                    {priceStats ? (
                      <>
                        <span className="bq-product-hero__price-amount">
                          {priceStats.lowest.toLocaleString('uz-UZ')}
                        </span>
                        <span className="bq-product-hero__price-currency">so‘m</span>
                      </>
                    ) : (
                      <span className="text-slate-500 font-semibold">
                        {lang === 'ru' ? 'Цена формируется' : 'Narx belgilanmoqda'}
                      </span>
                    )}
                  </div>
                </div>

                {priceStats && priceStats.savings > 0 && (
                  <div className="bq-product-hero__savings-pill">
                    <TrendingDown size={14} />
                    <span>
                      {priceStats.savings.toLocaleString('uz-UZ')} {lang === 'ru' ? 'сум выгоды между магазинами' : 'so‘mgacha tejamkorlik'}
                    </span>
                  </div>
                )}

                <div className="bq-product-hero__sellers-count">
                  <StoreIcon size={15} className="text-emerald" />
                  <span>
                    <strong>{offers.length} {lang === 'ru' ? 'предложений от магазинов' : 'ta do‘konda mavjud taklif'}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Specifications Section (Xususiyatlar) */}
        <section className="bq-product-specs-card">
          <div className="bq-product-specs-header">
            <h3 className="bq-product-specs-title">
              <SlidersHorizontal size={18} className="text-emerald" />
              <span>{lang === 'ru' ? 'Характеристики и параметры' : 'Xususiyatlar va parametrlar'}</span>
            </h3>
            <span className="bq-product-specs-sub">
              {lang === 'ru' ? 'Подробные технические данные товара' : 'Mahsulotning to‘liq texnik ko‘rsatkichlari'}
            </span>
          </div>

          <div className="bq-product-specs-grid">
            {product.brand && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Бренд' : 'Brend'}</span>
                <span className="bq-spec-val font-semibold">{product.brand}</span>
              </div>
            )}
            {product.model && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Модель' : 'Model'}</span>
                <span className="bq-spec-val">{product.model}</span>
              </div>
            )}
            {product.category && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Категория' : 'Toifa'}</span>
                <span className="bq-spec-val">{translateCategory(product.category, lang)}</span>
              </div>
            )}
            {product.variant?.storage && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Встроенная память' : 'Doimiy xotira'}</span>
                <span className="bq-spec-val font-semibold">{product.variant.storage}</span>
              </div>
            )}
            {product.variant?.ram && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Оперативная память (RAM)' : 'Tezkor xotira (RAM)'}</span>
                <span className="bq-spec-val">{product.variant.ram}</span>
              </div>
            )}
            {product.variant?.color && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Цвет' : 'Rangi'}</span>
                <span className="bq-spec-val">{product.variant.color}</span>
              </div>
            )}
            {product.variant?.size && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Размер / Объем' : 'O‘lchami / Hajmi'}</span>
                <span className="bq-spec-val">{product.variant.size}</span>
              </div>
            )}
            {product.barcode && (
              <div className="bq-spec-row">
                <span className="bq-spec-key">{lang === 'ru' ? 'Штрих-код' : 'Shtrix-kod'}</span>
                <span className="bq-spec-val">{product.barcode}</span>
              </div>
            )}
            {/* Custom technical specifications dictionary */}
            {product.specifications &&
              Object.entries(product.specifications).map(([key, val]) => (
                <div key={key} className="bq-spec-row">
                  <span className="bq-spec-key">{key}</span>
                  <span className="bq-spec-val">{val}</span>
                </div>
              ))}
            <div className="bq-spec-row">
              <span className="bq-spec-key">{lang === 'ru' ? 'Статус каталога' : 'Katalogdagi holati'}</span>
              <span className="bq-spec-val">
                {product.isDemo ? (
                  <span className="bq-offer-badge bq-offer-badge--demo">Demo ma’lumot</span>
                ) : (
                  <span className="bq-offer-badge bq-offer-badge--verified">Tekshirilgan tovar</span>
                )}
              </span>
            </div>
          </div>
        </section>

        {/* Location & Radius Control */}
        <div className="bq-product-location-section animate-fade-in">
          <div className="bq-product-location-header">
            <div>
              <h3 className="bq-product-location-title">
                {lang === 'ru' ? 'Сортировка магазинов рядом с вами' : 'Sizga yaqin do‘konlarni saralash'}
              </h3>
              <p className="bq-product-location-sub">
                {lang === 'ru'
                  ? 'Включите GPS для точного расчета расстояний и поиска ближайшей точки.'
                  : 'GPS orqali joylashuvingizni aniqlang va yaqin atrofdagi do‘konlar narxini ko‘ring.'}
              </p>
            </div>
          </div>

          <LocationControl
            userCoords={userCoords}
            onLocationChange={(coords) => setUserCoords(coords)}
            radiusKm={radiusKm}
            onRadiusChange={setRadiusKm}
            showRadiusFilter={Boolean(userCoords)}
            lang={lang}
          />
        </div>

        {/* Offers Comparison Section */}
        <section className="bq-product-offers-section">
          <div className="bq-product-offers-section__head">
            <div>
              <h2 className="bq-product-offers-section__title">
                {lang === 'ru' ? 'Сравнение цен и магазинов' : 'Do‘konlar va narxlar taqqoslashi'}
              </h2>
              <span className="bq-product-offers-section__count">
                {lang === 'ru'
                  ? `Найдено ${sortedOffers.length} предложений`
                  : `Jami ${sortedOffers.length} ta taklif topildi`}
              </span>
            </div>

            <div className="bq-product-offers-section__controls">
              {/* In-Stock Only Toggle */}
              <label className="bq-stock-toggle-label">
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  className="bq-stock-checkbox"
                />
                <span>{lang === 'ru' ? 'Только в наличии' : 'Faqat mavjud mahsulotlar'}</span>
              </label>

              {/* Sort Switcher */}
              <div className="bq-product-sort-box">
                <label htmlFor="product-offers-sort" className="bq-product-sort-label">
                  {lang === 'ru' ? 'Сортировка:' : 'Saralash:'}
                </label>
                <select
                  id="product-offers-sort"
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as 'price_asc' | 'distance' | 'price_desc')
                  }
                  className="bq-product-sort-select"
                >
                  <option value="price_asc">
                    {lang === 'ru' ? 'Сначала дешевые' : 'Arzondan qimmatga'}
                  </option>
                  <option value="distance" disabled={!userCoords}>
                    {lang === 'ru'
                      ? `По расстоянию (${userCoords ? 'GPS активен' : 'требуется GPS'})`
                      : `Yaqin masofadan (${userCoords ? 'GPS faol' : 'GPS talab etiladi'})`}
                  </option>
                  <option value="price_desc">
                    {lang === 'ru' ? 'Сначала дорогие' : 'Qimmatdan arzonga'}
                  </option>
                </select>
              </div>

              {/* View Mode Toggle: List vs Map */}
              <div className="bq-product-view-toggle">
                <button
                  type="button"
                  className={`bq-product-view-btn ${viewMode === 'list' ? 'bq-product-view-btn--active' : ''}`}
                  onClick={() => setViewMode('list')}
                  aria-label="Ro'yxat ko'rinishi"
                >
                  <ListIcon size={16} />
                  <span>{lang === 'ru' ? 'Список' : 'Ro‘yxat'}</span>
                </button>
                <button
                  type="button"
                  className={`bq-product-view-btn ${viewMode === 'map' ? 'bq-product-view-btn--active' : ''}`}
                  onClick={() => setViewMode('map')}
                  aria-label="Xarita ko'rinishi"
                >
                  <MapIcon size={16} />
                  <span>{lang === 'ru' ? 'На карте' : 'Xaritada'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* VIEW: Interactive Map */}
          {viewMode === 'map' && (
            <div className="bq-product-map-container animate-fade-in">
              <NearbyStoresMap
                stores={storesForMap}
                userCoords={userCoords}
                selectedStoreId={selectedStoreId}
                radiusKm={radiusKm}
                onSelectStore={(st) => setSelectedStoreId(st.id)}
                height="480px"
                defaultCenter={CITY_CENTROIDS.Nukus}
                lang={lang}
              />
              <div className="bq-product-map-legend">
                <span className="bq-legend-item">
                  <span className="bq-legend-dot bq-legend-dot--gold" />
                  {lang === 'ru' ? 'Самое выгодное предложение' : 'Eng arzon taklif'}
                </span>
                <span className="bq-legend-item">
                  <span className="bq-legend-dot bq-legend-dot--blue" />
                  {lang === 'ru' ? 'Ближайший магазин' : 'Eng yaqin do‘kon'}
                </span>
                <span className="bq-legend-item">
                  <span className="bq-legend-dot bq-legend-dot--emerald" />
                  {lang === 'ru' ? 'Другие магазины' : 'Boshqa do‘konlar'}
                </span>
              </div>
            </div>
          )}

          {/* VIEW: Offers List */}
          {viewMode === 'list' && (
            <div className="bq-product-offers-list animate-fade-in">
              {sortedOffers.length === 0 ? (
                <div className="bq-product-offers-empty">
                  <StoreIcon size={36} className="text-slate-400" />
                  <p>
                    {onlyInStock
                      ? (lang === 'ru' ? 'Нет предложений в наличии по выбранным фильтрам.' : 'Tanlangan filtrlarda hozircha sotuvda mavjud do‘kon topilmadi.')
                      : radiusKm
                      ? `${radiusKm} km radiusda ushbu mahsulotni sotayotgan do‘kon topilmadi.`
                      : (lang === 'ru' ? 'Пока нет предложений от магазинов.' : 'Hozircha do‘kon takliflari kiritilmagan.')}
                  </p>
                  {(radiusKm || onlyInStock) && (
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      {radiusKm && (
                        <Button variant="secondary" size="sm" onClick={() => setRadiusKm(null)}>
                          {lang === 'ru' ? 'Сбросить радиус' : 'Radius filtrini olib tashlash'}
                        </Button>
                      )}
                      {onlyInStock && (
                        <Button variant="outline" size="sm" onClick={() => setOnlyInStock(false)}>
                          {lang === 'ru' ? 'Показать все' : 'Barcha takliflarni ko‘rsatish'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                sortedOffers.map((offer) => {
                  const hasValidPrice = typeof offer.price === 'number' && offer.price > 0;
                  const isLowest = hasValidPrice && priceStats !== null && offer.price === priceStats.lowest;
                  const isStoreFav = isStoreFavorite(offer.storeId);
                  const hasCoords = offer.storeCoordinates && isValidCoordinates(offer.storeCoordinates);
                  const directionsUrl = hasCoords
                    ? buildDirectionsUrl(offer.storeCoordinates!, userCoords)
                    : null;
                  const formattedDate = formatOfferDate(offer.updatedAt);
                  const stale = isOfferStale(offer.updatedAt);

                  return (
                    <Card
                      key={offer.id}
                      variant="default"
                      padding="md"
                      className={`bq-offer-card ${isLowest ? 'bq-offer-card--cheapest' : ''}`}
                    >
                      <div className="bq-offer-card__inner">
                        {/* Store info */}
                        <div className="bq-offer-card__store-section">
                          <div className="bq-offer-card__store-header">
                            <Link
                              to={`/store/${offer.storeId}`}
                              className="bq-offer-card__store-name-link"
                              title={lang === 'ru' ? 'Перейти на страницу магазина' : 'Do‘kon sahifasiga o‘tish'}
                            >
                              <h4 className="bq-offer-card__store-name">{offer.storeName}</h4>
                            </Link>
                            <button
                              type="button"
                              className="bq-offer-card__store-info-btn"
                              onClick={() => setSelectedStoreModal(offer)}
                              title={lang === 'ru' ? 'Подробнее о магазине' : 'Do‘kon haqida ma’lumot'}
                              aria-label="Do‘kon ma’lumotini ko‘rish"
                            >
                              <Info size={14} className="text-slate-400 bq-store-info-icon" />
                            </button>
                            {offer.isStoreVerified && !offer.isDemo && (
                              <span className="bq-offer-badge bq-offer-badge--verified" title="Tekshirilgan do‘kon">
                                <ShieldCheck size={12} />
                                <span>{lang === 'ru' ? 'Проверен' : 'Tekshirilgan'}</span>
                              </span>
                            )}
                            {offer.isDemo && (
                              <span className="bq-offer-badge bq-offer-badge--demo">Demo taklif</span>
                            )}
                          </div>

                          <div className="bq-offer-card__meta-row">
                            <span className="bq-offer-card__location">
                              <MapPin size={13} />
                              <span>{offer.storeCity}, {offer.storeAddress}</span>
                            </span>

                            {offer.distanceKm !== undefined && (
                              <span className="bq-offer-card__distance">
                                📍 {formatDistance(offer.distanceKm, lang)}
                              </span>
                            )}

                            {formattedDate && (
                              <span className={`bq-offer-card__date ${stale ? 'bq-offer-card__date--stale' : ''}`}>
                                <Clock size={12} />
                                <span>{lang === 'ru' ? 'Обновлено: ' : 'Yangilandi: '}{formattedDate}</span>
                              </span>
                            )}
                          </div>

                          <div className="bq-offer-card__extra-tags">
                            <span className={`bq-offer-tag ${offer.inStock ? 'bq-offer-tag--stock' : 'bq-offer-tag--out'}`}>
                              {offer.inStock
                                ? (lang === 'ru' ? '✓ В наличии' : '✓ Sotuvda mavjud')
                                : (lang === 'ru' ? 'Под заказ' : 'Buyurtma asosida')}
                            </span>
                            {offer.warrantyMonths && (
                              <span className="bq-offer-tag bq-offer-tag--info">
                                🛡️ {offer.warrantyMonths} {lang === 'ru' ? 'мес. гарантии' : 'oy kafolat'}
                              </span>
                            )}
                            {offer.deliveryAvailable && (
                              <span className="bq-offer-tag bq-offer-tag--info">
                                <Truck size={12} /> {lang === 'ru' ? 'Доставка' : 'Yetkazib berish'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Price & Action */}
                        <div className="bq-offer-card__price-section">
                          <div className="bq-offer-card__price-box">
                            {isLowest && (
                              <span className="bq-badge-cheapest">🏆 {lang === 'ru' ? 'Лучшая цена' : 'Eng yaxshi narx'}</span>
                            )}
                            <div className="bq-offer-card__price">
                              {hasValidPrice ? (
                                <>
                                  {offer.price.toLocaleString('uz-UZ')}{' '}
                                  <span className="bq-offer-card__currency">{offer.currency}</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm font-semibold">
                                  {lang === 'ru' ? 'По запросу' : 'Kelishiladi'}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bq-offer-card__actions">
                            <Button
                              variant="primary"
                              size="sm"
                              leftIcon={<ShoppingBag size={14} />}
                              onClick={() => setSelectedOrderOffer(offer)}
                              title={lang === 'ru' ? 'Отправить запрос в магазин' : 'Do‘konga so‘rov yuborish'}
                            >
                              {lang === 'ru' ? 'Заказать' : 'So‘rov yuborish'}
                            </Button>

                            {offer.storePhone && (
                              <a
                                href={`tel:${offer.storePhone}`}
                                className="bq-offer-card__phone-btn"
                                aria-label={`${offer.storeName} bilan bog'lanish`}
                              >
                                <Phone size={15} />
                                <span>{offer.storePhone}</span>
                              </a>
                            )}

                            {directionsUrl && (
                              <a
                                href={directionsUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bq-offer-card__map-link"
                                aria-label="Google Maps orqali marshrut ochish"
                                title="Google Maps"
                              >
                                <Navigation size={14} />
                                <span>{lang === 'ru' ? 'Маршрут' : 'Marshrut'}</span>
                              </a>
                            )}

                            <button
                              type="button"
                              className={`bq-offer-card__fav-btn ${isStoreFav ? 'bq-offer-card__fav-btn--active' : ''}`}
                              onClick={() =>
                                toggleStoreFavorite({
                                  id: offer.storeId,
                                  name: offer.storeName,
                                  city: offer.storeCity,
                                  address: offer.storeAddress,
                                  phone: offer.storePhone,
                                  category: product.category,
                                })
                              }
                              aria-label={isStoreFav ? "Do'konni saqlangandan o'chirish" : "Do'konni saqlash"}
                              title={isStoreFav ? "Saqlanganlardan o'chirish" : "Do'konni saqlash"}
                            >
                              <Heart size={16} fill={isStoreFav ? 'currentColor' : 'none'} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Store Information Modal */}
        {selectedStoreModal && (
          <div className="bq-store-modal-backdrop animate-fade-in" onClick={() => setSelectedStoreModal(null)}>
            <div
              className="bq-store-modal"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="store-modal-name"
            >
              <button
                type="button"
                className="bq-store-modal__close"
                onClick={() => setSelectedStoreModal(null)}
                aria-label="Yopish"
              >
                <X size={18} />
              </button>

              <div className="bq-store-modal__header">
                <div className="bq-store-modal__icon">
                  <StoreIcon size={24} />
                </div>
                <div>
                  <h3 id="store-modal-name" className="bq-store-modal__name">
                    {selectedStoreModal.storeName}
                  </h3>
                  <div className="bq-store-modal__badges">
                    {selectedStoreModal.isStoreVerified && !selectedStoreModal.isDemo && (
                      <span className="bq-offer-badge bq-offer-badge--verified">
                        <ShieldCheck size={12} /> {lang === 'ru' ? 'Проверенный партнер' : 'Rasmiy tekshirilgan do‘kon'}
                      </span>
                    )}
                    {selectedStoreModal.isDemo && (
                      <span className="bq-offer-badge bq-offer-badge--demo">Demo do‘kon</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="bq-store-modal__body">
                <div className="bq-store-modal__info-row">
                  <MapPin size={16} className="text-slate-400" />
                  <div>
                    <span className="bq-store-modal__label">{lang === 'ru' ? 'Адрес' : 'Manzil'}:</span>
                    <p className="bq-store-modal__val">
                      {selectedStoreModal.storeCity}, {selectedStoreModal.storeAddress}
                    </p>
                  </div>
                </div>

                {selectedStoreModal.distanceKm !== undefined && (
                  <div className="bq-store-modal__info-row">
                    <Navigation size={16} className="text-emerald" />
                    <div>
                      <span className="bq-store-modal__label">{lang === 'ru' ? 'Расстояние' : 'Masofa'}:</span>
                      <p className="bq-store-modal__val font-semibold">
                        {formatDistance(selectedStoreModal.distanceKm, lang)}
                      </p>
                    </div>
                  </div>
                )}

                {selectedStoreModal.storePhone && (
                  <div className="bq-store-modal__info-row">
                    <Phone size={16} className="text-slate-400" />
                    <div>
                      <span className="bq-store-modal__label">{lang === 'ru' ? 'Телефон' : 'Telefon'}:</span>
                      <a href={`tel:${selectedStoreModal.storePhone}`} className="bq-store-modal__link">
                        {selectedStoreModal.storePhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>

              <div className="bq-store-modal__actions">
                <Link
                  to={`/store/${selectedStoreModal.storeId}`}
                  className="bq-store-modal__store-page-btn"
                >
                  <StoreIcon size={16} />
                  <span>{lang === 'ru' ? 'Страница магазина' : 'Do‘kon sahifasi'}</span>
                </Link>
                {selectedStoreModal.storePhone && (
                  <a
                    href={`tel:${selectedStoreModal.storePhone}`}
                    className="bq-store-modal__call-btn"
                  >
                    <Phone size={16} />
                    <span>{lang === 'ru' ? 'Позвонить' : 'Qo‘ng‘iroq qilish'}</span>
                  </a>
                )}
                {selectedStoreModal.storeCoordinates && isValidCoordinates(selectedStoreModal.storeCoordinates) && (
                  <a
                    href={buildDirectionsUrl(selectedStoreModal.storeCoordinates, userCoords)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bq-store-modal__dir-btn"
                  >
                    <ExternalLink size={16} />
                    <span>{lang === 'ru' ? 'Открыть в Google Maps' : 'Google Maps orqali ochish'}</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Related Products from same category */}
        {relatedProducts.length > 0 && (
          <section className="bq-related-products-section">
            <h3 className="bq-related-products__title">
              {lang === 'ru'
                ? `Похожие товары (${translateCategory(product.category, lang)})`
                : `O‘xshash mahsulotlar (${translateCategory(product.category, lang)})`}
            </h3>
            <div className="bq-related-products__grid">
              {relatedProducts.map((rel) => (
                <Link
                  key={rel.id}
                  to={`/product/${rel.id}`}
                  className="bq-related-card"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                >
                  <div className="bq-related-card__thumb">
                    {rel.imageUrl ? (
                      <img src={rel.imageUrl} alt={rel.name} />
                    ) : (
                      <PackageSearch size={32} className="text-slate-300" />
                    )}
                  </div>
                  <div className="bq-related-card__info">
                    <span className="bq-related-card__category">{translateCategory(rel.category, lang)}</span>
                    <h4 className="bq-related-card__name">{rel.name}</h4>
                    {rel.minPrice !== undefined && (
                      <div className="bq-related-card__price">
                        {rel.minPrice.toLocaleString('uz-UZ')} so‘mdan
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
        {/* Customer Order / Lead Modal */}
        <CustomerOrderModal
          isOpen={selectedOrderOffer !== null}
          product={product}
          offer={selectedOrderOffer}
          lang={lang}
          onClose={() => setSelectedOrderOffer(null)}
        />
      </div>
    </div>
  );
};
