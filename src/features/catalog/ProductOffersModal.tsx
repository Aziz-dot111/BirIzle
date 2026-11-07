import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  Store as StoreIcon,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  PackageSearch,
  Sparkles,
  ShieldCheck,
  Truck,
  Navigation,
  Map as MapIcon,
  List as ListIcon,
  ShoppingBag,
} from 'lucide-react';
import type { ProductItem, StoreProductOffer, Coordinates, Store } from '@/types';
import { getStoreProductOffers } from '@/services/firebase/catalog';
import { formatDistance, isValidCoordinates } from '@/utils/geo';
import { Button } from '@/components/common/Button';
import { NearbyStoresMap } from '@/components/map/NearbyStoresMap';
import { CustomerOrderModal } from '@/components/order/CustomerOrderModal';
import './ProductOffersModal.css';

interface ProductOffersModalProps {
  product: ProductItem | null;
  userCoords?: Coordinates | null;
  onClose: () => void;
}

export const ProductOffersModal: React.FC<ProductOffersModalProps> = ({
  product,
  userCoords,
  onClose,
}) => {
  const [offers, setOffers] = useState<StoreProductOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalSort, setModalSort] = useState<'price_asc' | 'price_desc' | 'distance'>('price_asc');
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [selectedOrderOffer, setSelectedOrderOffer] = useState<StoreProductOffer | null>(null);

  useEffect(() => {
    if (!product) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    getStoreProductOffers(product.id, userCoords)
      .then((res) => {
        if (!isMounted) return;
        if (res.error) {
          setError(res.error);
        } else {
          setOffers(res.data || []);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : 'Takliflarni yuklashda xatolik yuz berdi.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [product, userCoords]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sortedOffers = useMemo(() => {
    let list = offers;
    if (onlyInStock) {
      list = list.filter((o) => o.inStock || o.availability === 'in_stock');
    }
    const result = [...list];
    if (modalSort === 'distance') {
      result.sort((a, b) => {
        if (a.distanceKm === undefined && b.distanceKm === undefined) return 0;
        if (a.distanceKm === undefined) return 1;
        if (b.distanceKm === undefined) return -1;
        return a.distanceKm - b.distanceKm;
      });
    } else if (modalSort === 'price_desc') {
      result.sort((a, b) => {
        const pA = typeof a.price === 'number' && a.price > 0 ? a.price : -1;
        const pB = typeof b.price === 'number' && b.price > 0 ? b.price : -1;
        return pB - pA;
      });
    } else {
      // price_asc: Cheapest first, unpriced offers go to the end
      result.sort((a, b) => {
        const hasA = typeof a.price === 'number' && a.price > 0;
        const hasB = typeof b.price === 'number' && b.price > 0;
        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;
        return a.price - b.price;
      });
    }
    return result;
  }, [offers, onlyInStock, modalSort]);

  // Identify absolute lowest price offer among all valid offers (strictly positive)
  const lowestPrice = useMemo(() => {
    if (offers.length === 0) return null;
    const validPrices = offers.map((o) => o.price).filter((p) => typeof p === 'number' && p > 0);
    if (validPrices.length === 0) return null;
    return Math.min(...validPrices);
  }, [offers]);

  // Convert offers to Store[] for interactive map rendering
  const modalStoresForMap: Store[] = useMemo(() => {
    if (!product) return [];
    const validOffers = offers.filter(
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
      const isCheapest = lowestPrice !== null && o.price === lowestPrice;
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
  }, [offers, lowestPrice, userCoords, product]);

  if (!product) return null;

  return (
    <div className="bq-offers-modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="bq-offers-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-offers-title"
      >
        <button
          type="button"
          className="bq-offers-modal__close"
          onClick={onClose}
          aria-label="Yopish"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="bq-offers-modal__header">
          <div className="bq-offers-modal__tag">
            <Sparkles size={13} /> Narxlarni solishtirish
          </div>

          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.5rem' }}>
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                style={{
                  width: '64px',
                  height: '64px',
                  objectFit: 'cover',
                  borderRadius: '10px',
                  border: '1px solid var(--color-slate-200)',
                }}
              />
            ) : (
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-slate-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--color-slate-400)',
                }}
              >
                <PackageSearch size={32} />
              </div>
            )}
            <div>
              <h2 id="product-offers-title" className="bq-offers-modal__title" style={{ margin: 0 }}>
                {product.name}
              </h2>
              <div className="bq-offers-modal__meta" style={{ marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                {product.brand && <span>Brend: <strong>{product.brand}</strong></span>}
                <span>Toifa: <strong>{product.category}</strong></span>
                {product.isDemo && (
                  <span className="bq-offer-badge-demo">Demo namuna</span>
                )}
                <Link
                  to={`/product/${product.id}`}
                  onClick={onClose}
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: 'var(--color-primary-700)',
                    textDecoration: 'underline',
                  }}
                >
                  To‘liq sahifada ochish →
                </Link>
              </div>
            </div>
          </div>

          {/* Sort & View Switcher Row */}
          <div className="bq-modal-sort-row" style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="bq-modal-sort-label">Saralash:</span>
              <button
                type="button"
                className={`bq-modal-sort-btn ${modalSort === 'price_asc' ? 'bq-modal-sort-btn--active' : ''}`}
                onClick={() => setModalSort('price_asc')}
              >
                Eng arzon
              </button>
              <button
                type="button"
                className={`bq-modal-sort-btn ${modalSort === 'price_desc' ? 'bq-modal-sort-btn--active' : ''}`}
                onClick={() => setModalSort('price_desc')}
              >
                Eng qimmat
              </button>
              {userCoords && offers.some((o) => o.distanceKm !== undefined) && (
                <button
                  type="button"
                  className={`bq-modal-sort-btn ${modalSort === 'distance' ? 'bq-modal-sort-btn--active' : ''}`}
                  onClick={() => setModalSort('distance')}
                >
                  Eng yaqin do‘kon
                </button>
              )}
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', fontWeight: 600, color: 'var(--color-slate-700)', cursor: 'pointer', marginLeft: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={onlyInStock}
                  onChange={(e) => setOnlyInStock(e.target.checked)}
                  style={{ cursor: 'pointer', accentColor: 'var(--color-primary-700)' }}
                />
                <span>Faqat mavjud</span>
              </label>
            </div>

            {/* View Toggle: List vs Map */}
            <div className="bq-modal-view-toggle">
              <button
                type="button"
                className={`bq-modal-view-btn ${viewMode === 'list' ? 'bq-modal-view-btn--active' : ''}`}
                onClick={() => setViewMode('list')}
                title="Ro‘yxat ko‘rinishi"
              >
                <ListIcon size={14} />
                <span>Ro‘yxat</span>
              </button>
              <button
                type="button"
                className={`bq-modal-view-btn ${viewMode === 'map' ? 'bq-modal-view-btn--active' : ''}`}
                onClick={() => setViewMode('map')}
                title="Xaritada ko‘rish"
              >
                <MapIcon size={14} />
                <span>Xaritada</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="bq-offers-modal__body">
          {loading && (
            <div className="bq-offers-modal__loading">
              <div className="bq-offers-modal__spinner" />
              <p>Do‘konlardagi narx va masofalar hisoblanmoqda...</p>
            </div>
          )}

          {!loading && error && (
            <div className="bq-offers-modal__empty">
              <div className="bq-offers-modal__empty-icon">
                <AlertCircle size={26} />
              </div>
              <h3>Ma’lumot olishda xatolik yuz berdi</h3>
              <p>{error}</p>
              <Button variant="secondary" size="sm" onClick={onClose} style={{ marginTop: '1rem' }}>
                Yopish
              </Button>
            </div>
          )}

          {!loading && !error && sortedOffers.length === 0 && (
            <div className="bq-offers-modal__empty">
              <div className="bq-offers-modal__empty-icon">
                <PackageSearch size={26} />
              </div>
              <h3>Hozircha do‘kon takliflari mavjud emas</h3>
              <p>
                Ushbu tovar katalogda mavjud, ammo do‘konlar tomonidan sotuv taklifi hali kiritilmagan.
              </p>
              <Button variant="secondary" size="sm" onClick={onClose} style={{ marginTop: '1rem' }}>
                Boshqa mahsulotlarni qidirish
              </Button>
            </div>
          )}

          {!loading && !error && sortedOffers.length > 0 && viewMode === 'map' && (
            <div className="bq-offers-modal__map-wrap animate-fade-in" style={{ padding: '0.75rem' }}>
              <NearbyStoresMap
                stores={modalStoresForMap}
                userCoords={userCoords}
                height="380px"
              />
            </div>
          )}

          {!loading && !error && sortedOffers.length > 0 && viewMode === 'list' && (
            <div className="bq-offers-list">
              {sortedOffers.map((offer: StoreProductOffer) => {
                const isBestPrice = lowestPrice !== null && offer.price === lowestPrice;
                const isClosest = modalSort === 'distance' && offer.distanceKm !== undefined;

                return (
                  <div
                    key={offer.id}
                    className={`bq-offer-item ${isBestPrice ? 'bq-offer-item--best-price' : ''} ${isClosest ? 'bq-offer-item--closest' : ''}`}
                  >
                    <div className="bq-offer-store-info">
                      <div className="bq-offer-store-name-row">
                        <StoreIcon size={16} className="text-emerald" />
                        <span className="bq-offer-store-name">{offer.storeName}</span>
                        {offer.isStoreVerified && !offer.isDemo && (
                          <span className="bq-offer-badge-verified">
                            <CheckCircle2 size={11} /> Tasdiqlangan do‘kon
                          </span>
                        )}
                        {offer.isDemo && (
                          <span className="bq-offer-badge-demo">Demo taklif</span>
                        )}
                      </div>

                      <div className="bq-offer-store-address">
                        <MapPin size={13} className="text-slate-400" />
                        <span>{offer.storeCity}, {offer.storeAddress}</span>
                      </div>

                      {offer.distanceKm !== undefined && (
                        <div className="bq-offer-distance-badge">
                          <Navigation size={12} />
                          <span>{formatDistance(offer.distanceKm)} masofada</span>
                        </div>
                      )}

                      {offer.storePhone && (
                        <div>
                          <a href={`tel:${offer.storePhone}`} className="bq-offer-store-phone">
                            <Phone size={12} /> {offer.storePhone}
                          </a>
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.25rem' }}>
                        {offer.warrantyMonths && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-slate-500)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <ShieldCheck size={12} /> {offer.warrantyMonths} oy kafolat
                          </span>
                        )}
                        {offer.deliveryAvailable && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--color-primary-700)', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                            <Truck size={12} /> Yetkazib berish bor
                          </span>
                        )}
                        {offer.updatedAt && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-slate-400)' }}>
                            Yangilandi: {new Date(offer.updatedAt).toLocaleDateString('uz-UZ', { day: 'numeric', month: 'short' })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="bq-offer-pricing-col">
                      {isBestPrice && (
                        <span className="bq-offer-best-tag">Eng arzon narx</span>
                      )}
                      <span className="bq-offer-price">
                        {offer.price.toLocaleString('uz-UZ')} {offer.currency}
                      </span>
                      <span
                        className={`bq-offer-status ${
                          offer.availability === 'in_stock'
                            ? 'bq-offer-status--in-stock'
                            : offer.availability === 'out_of_stock'
                            ? 'bq-offer-status--out-of-stock'
                            : ''
                        }`}
                      >
                        {offer.availability === 'in_stock'
                          ? 'Omborda mavjud'
                          : offer.availability === 'pre_order'
                          ? 'Oldindan buyurtma'
                          : offer.availability === 'out_of_stock'
                          ? 'Omborda yo‘q'
                          : 'Talab bo‘yicha'}
                      </span>
                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        leftIcon={<ShoppingBag size={13} />}
                        onClick={() => setSelectedOrderOffer(offer)}
                        style={{ marginTop: '0.45rem', width: '100%' }}
                      >
                        So‘rov yuborish
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Customer Order / Lead Modal */}
        <CustomerOrderModal
          isOpen={selectedOrderOffer !== null}
          product={product}
          offer={selectedOrderOffer}
          onClose={() => setSelectedOrderOffer(null)}
        />
      </div>
    </div>
  );
};
