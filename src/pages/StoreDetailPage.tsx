import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Store as StoreIcon,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Globe,
  Navigation,
  Heart,
  Share2,
  ChevronRight,
  AlertCircle,
  PackageSearch,
  Search,
  SlidersHorizontal,
  ArrowLeft,
  Truck,
  ExternalLink,
} from 'lucide-react';
import type { Store, Coordinates } from '@/types';
import {
  getStoreById,
  getStoreOffersWithProducts,
  isStoreVisibleToCustomer,
  type StoreOfferProductItem,
} from '@/services/firebase/catalog';
import { isValidCoordinates } from '@/utils/geo';
import {
  buildDirectionsUrl,
  translateCategory,
  getSafeStoreName,
  getSavedMapLanguage,
} from '@/utils/mapI18n';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { NearbyStoresMap } from '@/components/map/NearbyStoresMap';
import { useFavorites } from '@/hooks/useFavorites';
import './StoreDetailPage.css';

export const StoreDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [store, setStore] = useState<Store | null>(null);
  const [storeOffers, setStoreOffers] = useState<StoreOfferProductItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters inside store products
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [onlyInStock, setOnlyInStock] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'price_asc' | 'price_desc' | 'name'>('price_asc');

  // Share notification
  const [copiedShare, setCopiedShare] = useState<boolean>(false);

  // User location for distance if available
  const [userCoords] = useState<Coordinates | null>(null);

  const lang = useMemo(() => getSavedMapLanguage(), []);
  const { isStoreFavorite, toggleStoreFavorite } = useFavorites();

  const fetchStoreData = useCallback(async (storeId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [storeRes, offersRes] = await Promise.all([
        getStoreById(storeId),
        getStoreOffersWithProducts(storeId),
      ]);

      if (storeRes.error || !storeRes.data || !isStoreVisibleToCustomer(storeRes.data)) {
        setError(
          storeRes.error ||
            (lang === 'ru' ? 'Магазин не найден или не активен.' : 'Do‘kon topilmadi yoki faol emas.')
        );
        setStore(null);
        setStoreOffers([]);
      } else {
        setStore(storeRes.data);
        setStoreOffers(offersRes.data || []);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Do‘kon ma’lumotlarini yuklashda xatolik yuz berdi.'
      );
      setStore(null);
      setStoreOffers([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    if (!id || !id.trim()) {
      setError(lang === 'ru' ? 'Неверный ID магазина.' : 'Do‘kon IDsi noto‘g‘ri.');
      setLoading(false);
      return;
    }
    fetchStoreData(id.trim());
  }, [id, fetchStoreData, lang]);

  // Handle store sharing
  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: store ? `${store.name} — OneShop` : 'OneShop',
          text: `OneShop orqali ${store?.name} do‘koni va uning tovarlarini ko‘ring:`,
          url,
        });
        return;
      } catch {
        // Share cancelled, fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // Clipboard denied
    }
  };

  // Distinct categories available in this store's offers
  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    storeOffers.forEach((o) => {
      if (o.productCategory) cats.add(o.productCategory);
    });
    return Array.from(cats);
  }, [storeOffers]);

  // Filtered and sorted store offers
  const filteredOffers = useMemo(() => {
    let list = storeOffers;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter((o) => {
        const text = `${o.productName} ${o.productBrand || ''} ${o.productModel || ''} ${o.notes || ''}`.toLowerCase();
        return text.includes(q);
      });
    }

    if (selectedCategory) {
      list = list.filter((o) => o.productCategory === selectedCategory);
    }

    if (onlyInStock) {
      list = list.filter((o) => o.inStock || o.availability === 'in_stock');
    }

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') {
        return a.price - b.price;
      }
      if (sortBy === 'price_desc') {
        return b.price - a.price;
      }
      return a.productName.localeCompare(b.productName, lang === 'ru' ? 'ru' : 'uz');
    });
  }, [storeOffers, searchTerm, selectedCategory, onlyInStock, sortBy, lang]);

  if (loading) {
    return (
      <div className="bq-store-detail-page">
        <div className="container">
          <div className="bq-store-detail__loading">
            <div className="bq-store-detail__spinner" />
            <p>
              {lang === 'ru'
                ? 'Загрузка данных магазина и каталога товаров...'
                : 'Do‘kon ma’lumotlari va tovarlar ro‘yxati yuklanmoqda...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="bq-store-detail-page">
        <div className="container">
          <div className="bq-store-detail__error">
            <AlertCircle size={36} className="text-rose" />
            <h2>{lang === 'ru' ? 'Магазин не найден' : 'Do‘kon topilmadi'}</h2>
            <p>
              {error ||
                (lang === 'ru'
                  ? 'Запрашиваемый магазин не существует или был удален.'
                  : 'Qidirilayotgan do‘kon bazada mavjud emas yoki o‘chirilgan.')}
            </p>
            <div className="bq-store-detail__error-actions">
              <Button variant="primary" size="md" onClick={() => navigate('/map')}>
                {lang === 'ru' ? 'Открыть карту' : 'Xaritaga o‘tish'}
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

  const isStoreFav = isStoreFavorite(store.id);
  const displayName = getSafeStoreName(store.name, lang);
  const displayCategory = translateCategory(store.category, lang);
  const hasValidCoords = isValidCoordinates(store.coordinates);
  const directionsUrl = hasValidCoords
    ? buildDirectionsUrl(store.coordinates, userCoords)
    : null;

  return (
    <div className="bq-store-detail-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="bq-store-breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="bq-breadcrumb-link">
            {lang === 'ru' ? 'Главная' : 'Bosh sahifa'}
          </Link>
          <ChevronRight size={14} className="bq-breadcrumb-separator" />
          <Link to="/map" className="bq-breadcrumb-link">
            {lang === 'ru' ? 'Карта магазинов' : 'Do‘konlar xaritasi'}
          </Link>
          <ChevronRight size={14} className="bq-breadcrumb-separator" />
          <span className="bq-breadcrumb-current" aria-current="page">
            {displayName}
          </span>
        </nav>

        {/* Back Link */}
        <div className="bq-store-back-row">
          <button
            type="button"
            className="bq-store-back-btn"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={16} />
            <span>{lang === 'ru' ? 'Назад' : 'Ortga qaytish'}</span>
          </button>
        </div>

        {/* Hero Header Card */}
        <div className="bq-store-hero animate-fade-in">
          <div className="bq-store-hero__inner">
            {/* Store Icon Box */}
            <div className="bq-store-hero__icon-col">
              <div className="bq-store-hero__avatar">
                <StoreIcon size={38} className="text-emerald" />
              </div>
            </div>

            {/* Store Meta & Titles */}
            <div className="bq-store-hero__main-col">
              <div className="bq-store-hero__badges-row">
                {store.isVerified && !store.isDemo && (
                  <span className="bq-store-badge bq-store-badge--verified">
                    <ShieldCheck size={13} />
                    <span>{lang === 'ru' ? 'Проверенный партнер' : 'Rasmiy tekshirilgan'}</span>
                  </span>
                )}
                {store.isDemo && (
                  <span className="bq-store-badge bq-store-badge--demo">
                    {lang === 'ru' ? 'Демо магазин' : 'Demo do‘kon'}
                  </span>
                )}
                {store.sourceType === 'openstreetmap' && (
                  <span className="bq-store-badge bq-store-badge--osm">
                    <Globe size={13} />
                    <span>OpenStreetMap</span>
                  </span>
                )}
                <span className="bq-store-badge bq-store-badge--cat">
                  {displayCategory}
                </span>
              </div>

              <h1 className="bq-store-hero__name">{displayName}</h1>

              {/* Location, Phone, Hours */}
              <div className="bq-store-hero__meta-list">
                <div className="bq-store-hero__meta-item">
                  <MapPin size={15} className="text-slate-400" />
                  <span>
                    {store.district ? `${store.district}, ` : ''}{store.city}, {store.address}
                  </span>
                </div>

                {store.phone && (
                  <div className="bq-store-hero__meta-item">
                    <Phone size={15} className="text-slate-400" />
                    <a href={`tel:${store.phone}`} className="bq-store-hero__phone-link">
                      {store.phone}
                    </a>
                  </div>
                )}

                {store.openingHours && (
                  <div className="bq-store-hero__meta-item">
                    <Clock size={15} className="text-slate-400" />
                    <span>{store.openingHours}</span>
                  </div>
                )}

                {store.website && (
                  <div className="bq-store-hero__meta-item">
                    <Globe size={15} className="text-slate-400" />
                    <a
                      href={store.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bq-store-hero__website-link"
                    >
                      <span>{store.website.replace(/^https?:\/\//, '')}</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>

              {store.description && (
                <p className="bq-store-hero__desc">{store.description}</p>
              )}
            </div>

            {/* Quick Actions (Call, Route, Favorite, Share) */}
            <div className="bq-store-hero__actions-col">
              {directionsUrl && (
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bq-store-action-btn bq-store-action-btn--primary"
                  title="Google Maps marshruti"
                >
                  <Navigation size={16} />
                  <span>{lang === 'ru' ? 'Маршрут' : 'Marshrut'}</span>
                </a>
              )}

              {store.phone && (
                <a
                  href={`tel:${store.phone}`}
                  className="bq-store-action-btn bq-store-action-btn--outline"
                >
                  <Phone size={16} />
                  <span>{lang === 'ru' ? 'Позвонить' : 'Qo‘ng‘iroq'}</span>
                </a>
              )}

              <div className="bq-store-hero__icon-buttons">
                <button
                  type="button"
                  className={`bq-store-fav-btn ${isStoreFav ? 'bq-store-fav-btn--active' : ''}`}
                  onClick={() =>
                    toggleStoreFavorite({
                      id: store.id,
                      name: store.name,
                      city: store.city,
                      address: store.address,
                      phone: store.phone,
                      category: store.category,
                    })
                  }
                  title={isStoreFav ? 'Saqlanganlardan o‘chirish' : 'Do‘konni saqlash'}
                  aria-label={isStoreFav ? 'Saqlanganlardan o‘chirish' : 'Do‘konni saqlash'}
                >
                  <Heart size={18} fill={isStoreFav ? 'currentColor' : 'none'} />
                  <span>
                    {isStoreFav
                      ? lang === 'ru'
                        ? 'В избранном'
                        : 'Saqlangan'
                      : lang === 'ru'
                      ? 'В избранное'
                      : 'Saqlash'}
                  </span>
                </button>

                <button
                  type="button"
                  className="bq-store-share-btn"
                  onClick={handleShare}
                  title="Havolani nusxalash"
                  aria-label="Ulashish"
                >
                  <Share2 size={18} />
                  <span>
                    {copiedShare
                      ? lang === 'ru'
                        ? 'Скопировано!'
                        : 'Nusxalandi!'
                      : lang === 'ru'
                      ? 'Поделиться'
                      : 'Ulashish'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mini Interactive Map View (if valid coordinates exist) */}
        {hasValidCoords && (
          <section className="bq-store-map-card animate-fade-in">
            <div className="bq-store-map-card__header">
              <h3 className="bq-store-map-card__title">
                <MapPin size={16} className="text-emerald" />
                <span>{lang === 'ru' ? 'Расположение магазина на карте' : 'Do‘konning xaritadagi joylashuvi'}</span>
              </h3>
              <span className="bq-store-map-card__coords">
                {store.coordinates.lat.toFixed(4)}, {store.coordinates.lng.toFixed(4)}
              </span>
            </div>
            <NearbyStoresMap
              stores={[store]}
              userCoords={userCoords}
              selectedStoreId={store.id}
              height="280px"
              defaultCenter={store.coordinates}
              lang={lang}
            />
          </section>
        )}

        {/* Store Active Offers & Products Section */}
        <section className="bq-store-products-section">
          <div className="bq-store-products__header">
            <div>
              <h2 className="bq-store-products__title">
                {lang === 'ru' ? 'Каталог товаров магазина' : 'Do‘kondagi tovarlar va takliflar'}
              </h2>
              <p className="bq-store-products__count">
                {lang === 'ru'
                  ? `Всего ${storeOffers.length} активных предложений`
                  : `Jami ${storeOffers.length} ta faol mahsulot taklifi`}
              </p>
            </div>

            {/* Filter & Sort Controls */}
            {storeOffers.length > 0 && (
              <div className="bq-store-products__controls">
                {/* Search in store */}
                <div className="bq-store-search-box">
                  <Search size={15} className="bq-store-search-icon" />
                  <input
                    type="text"
                    placeholder={
                      lang === 'ru'
                        ? 'Поиск товара в магазине...'
                        : 'Do‘kon bo‘yicha tovar qidirish...'
                    }
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bq-store-search-input"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      className="bq-store-search-clear"
                      onClick={() => setSearchTerm('')}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Stock Toggle */}
                <label className="bq-store-stock-toggle">
                  <input
                    type="checkbox"
                    checked={onlyInStock}
                    onChange={(e) => setOnlyInStock(e.target.checked)}
                  />
                  <span>
                    {lang === 'ru' ? 'Только в наличии' : 'Faqat mavjudlar'}
                  </span>
                </label>

                {/* Sort Selector */}
                <div className="bq-store-sort-box">
                  <SlidersHorizontal size={14} className="text-slate-400" />
                  <select
                    value={sortBy}
                    onChange={(e) =>
                      setSortBy(e.target.value as 'price_asc' | 'price_desc' | 'name')
                    }
                    className="bq-store-sort-select"
                  >
                    <option value="price_asc">
                      {lang === 'ru' ? 'Сначала дешевые' : 'Arzondan qimmatga'}
                    </option>
                    <option value="price_desc">
                      {lang === 'ru' ? 'Сначала дорогие' : 'Qimmatdan arzonga'}
                    </option>
                    <option value="name">
                      {lang === 'ru' ? 'По названию' : 'Nomi bo‘yicha'}
                    </option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Category Filter Pills (if multiple categories available) */}
          {availableCategories.length > 1 && (
            <div className="bq-store-category-pills">
              <button
                type="button"
                className={`bq-store-cat-pill ${!selectedCategory ? 'bq-store-cat-pill--active' : ''}`}
                onClick={() => setSelectedCategory('')}
              >
                {lang === 'ru' ? 'Все категории' : 'Barcha toifalar'}
              </button>
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  className={`bq-store-cat-pill ${selectedCategory === cat ? 'bq-store-cat-pill--active' : ''}`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {translateCategory(cat, lang)}
                </button>
              ))}
            </div>
          )}

          {/* Offers Grid */}
          {filteredOffers.length === 0 ? (
            <div className="bq-store-products-empty animate-fade-in">
              <PackageSearch size={42} className="text-slate-400" />
              <h3>
                {storeOffers.length === 0
                  ? lang === 'ru'
                    ? 'В этом магазине пока нет опубликованных предложений.'
                    : 'Ushbu do‘konda hozircha faol tovar takliflari mavjud emas.'
                  : lang === 'ru'
                  ? 'По выбранным фильтрам товаров не найдено.'
                  : 'Tanlangan parametrlar bo‘yicha tovarlar topilmadi.'}
              </h3>
              {(searchTerm || selectedCategory || onlyInStock) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setOnlyInStock(false);
                  }}
                >
                  {lang === 'ru' ? 'Сбросить фильтры' : 'Filtrlarni tozalash'}
                </Button>
              )}
            </div>
          ) : (
            <div className="bq-store-offers-grid animate-fade-in">
              {filteredOffers.map((offer) => {
                const hasValidPrice = typeof offer.price === 'number' && offer.price > 0;
                return (
                  <Card
                    key={offer.id}
                    variant="default"
                    padding="md"
                    className="bq-store-product-card"
                  >
                    <div className="bq-store-product-card__inner">
                      {/* Product image */}
                      <div className="bq-store-product-card__img-box">
                        {offer.productImage ? (
                          <img
                            src={offer.productImage}
                            alt={offer.productName}
                            className="bq-store-product-card__img"
                            loading="lazy"
                          />
                        ) : (
                          <div className="bq-store-product-card__placeholder">
                            <StoreIcon size={24} className="text-slate-300" />
                          </div>
                        )}
                        <span
                          className={`bq-store-product-card__stock-tag ${
                            offer.inStock
                              ? 'bq-store-product-card__stock-tag--in'
                              : 'bq-store-product-card__stock-tag--out'
                          }`}
                        >
                          {offer.inStock
                            ? lang === 'ru'
                              ? 'В наличии'
                              : 'Sotuvda mavjud'
                            : lang === 'ru'
                            ? 'Под заказ'
                            : 'Buyurtmaga'}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="bq-store-product-card__content">
                        <div className="bq-store-product-card__category">
                          {translateCategory(offer.productCategory, lang)}
                        </div>

                        <Link
                          to={`/product/${offer.productId}`}
                          className="bq-store-product-card__name-link"
                          title={offer.productName}
                        >
                          <h4 className="bq-store-product-card__title">
                            {offer.productName}
                          </h4>
                        </Link>

                        {/* Variant or specs tag */}
                        {offer.variantId && (
                          <div className="bq-store-product-card__variant-badge">
                            <span>Variant: {offer.variantId}</span>
                          </div>
                        )}

                        {/* Extras (warranty, delivery) */}
                        <div className="bq-store-product-card__features">
                          {offer.warrantyMonths && (
                            <span className="bq-store-product-card__feature">
                              🛡️ {offer.warrantyMonths} {lang === 'ru' ? 'мес.' : 'oy'}
                            </span>
                          )}
                          {offer.deliveryAvailable && (
                            <span className="bq-store-product-card__feature">
                              <Truck size={12} /> {lang === 'ru' ? 'Доставка' : 'Yetkazib berish'}
                            </span>
                          )}
                        </div>

                        {/* Price & View Action */}
                        <div className="bq-store-product-card__footer">
                          <div className="bq-store-product-card__price-box">
                            <span className="bq-store-product-card__price-label">
                              {lang === 'ru' ? 'Цена магазина:' : 'Do‘kon narxi:'}
                            </span>
                            <div className="bq-store-product-card__price">
                              {hasValidPrice ? (
                                <>
                                  <strong>{offer.price.toLocaleString('uz-UZ')}</strong>{' '}
                                  <span className="text-sm font-semibold">{offer.currency}</span>
                                </>
                              ) : (
                                <span className="text-slate-400 text-sm font-semibold">
                                  {lang === 'ru' ? 'По запросу' : 'Kelishiladi'}
                                </span>
                              )}
                            </div>
                          </div>

                          <Link
                            to={`/product/${offer.productId}`}
                            className="bq-store-product-card__view-btn"
                          >
                            <span>{lang === 'ru' ? 'Открыть' : 'Ko‘rish'}</span>
                            <ChevronRight size={14} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

