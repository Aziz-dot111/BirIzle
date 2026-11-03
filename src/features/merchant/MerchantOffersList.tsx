import React, { useEffect, useState, useCallback } from 'react';
import {
  Package,
  Plus,
  ShieldCheck,
  Truck,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { getOffersByStore } from '@/services/firebase/catalog';
import { getMerchantTexts } from '@/utils/merchantI18n';
import type { Store, InventoryOffer } from '@/types';
import type { MapLanguage } from '@/utils/mapI18n';
import './MerchantOffersList.css';

export interface MerchantOffersListProps {
  store: Store;
  lang?: MapLanguage;
}

export const MerchantOffersList: React.FC<MerchantOffersListProps> = ({ store, lang }) => {
  const [offers, setOffers] = useState<InventoryOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showStagedModal, setShowStagedModal] = useState(false);

  const t = getMerchantTexts(lang);

  const loadOffers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getOffersByStore(store.id);
      if (res.error) {
        setError(res.error);
        setOffers([]);
      } else {
        setOffers(res.data || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Takliflarni yuklashda xatolik yuz berdi.');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [store.id]);

  useEffect(() => {
    loadOffers();
  }, [loadOffers]);

  const formatPrice = (price: number, currency: string) => {
    return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(price) + ` ${currency}`;
  };

  return (
    <div className="bq-merchant-offers">
      <div className="bq-merchant-offers__header">
        <div>
          <h3 className="bq-merchant-offers__title">{t.offersTitle}</h3>
          <p className="bq-merchant-offers__subtitle">
            {t.offersSubtitle}: <strong>{store.name}</strong>
          </p>
        </div>
        <Button
          type="button"
          variant="primary"
          size="sm"
          leftIcon={<Plus size={15} />}
          onClick={() => setShowStagedModal(true)}
        >
          {t.addOfferBtn}
        </Button>
      </div>

      {/* Security and Staged Notice Alert */}
      <div className="bq-merchant-offers__alert" role="note">
        <Info size={16} className="text-emerald flex-shrink-0" />
        <p>{t.offersStagedNotice}</p>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bq-merchant-offers__loading">
          <div className="bq-spinner" />
          <p>{lang === 'ru' ? 'Загрузка предложений магазина...' : 'Do‘kon takliflari yuklanmoqda...'}</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bq-merchant-offers__error" role="alert">
          <AlertCircle size={18} className="text-rose flex-shrink-0" />
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={loadOffers}>
            {lang === 'ru' ? 'Повторить' : 'Qaytadan urinish'}
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && offers.length === 0 && (
        <div className="bq-merchant-offers__empty">
          <Package size={36} className="text-slate-400" />
          <h4>{t.noOffersTitle}</h4>
          <p>{t.noOffersDesc}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setShowStagedModal(true)}
          >
            {t.addOfferBtn}
          </Button>
        </div>
      )}

      {/* Offers Cards / Table */}
      {!loading && !error && offers.length > 0 && (
        <div className="bq-merchant-offers__grid">
          {offers.map((offer) => {
            return (
              <div key={offer.id} className="bq-merchant-offer-card">
                <div className="bq-merchant-offer-card__head">
                  <div className="bq-merchant-offer-card__product-ref">
                    <Package size={16} className="text-emerald" />
                    <span>Mahsulot ID: <code>{offer.productId}</code></span>
                  </div>
                  <span
                    className={`bq-offer-avail-badge bq-offer-avail-badge--${offer.availability}`}
                  >
                    {offer.availability === 'in_stock'
                      ? t.inStock
                      : offer.availability === 'pre_order' || offer.availability === 'on_demand'
                        ? t.onOrder
                        : t.outOfStock}
                  </span>
                </div>

                <div className="bq-merchant-offer-card__body">
                  <div className="bq-merchant-offer-card__price">
                    {formatPrice(offer.price, offer.currency)}
                  </div>

                  <div className="bq-merchant-offer-card__meta">
                    {offer.warrantyMonths !== undefined && (
                      <span className="bq-offer-meta-pill">
                        <ShieldCheck size={12} />
                        {offer.warrantyMonths > 0
                          ? `${offer.warrantyMonths} ${lang === 'ru' ? 'мес. гарантия' : 'oy kafolat'}`
                          : lang === 'ru' ? 'Без гарантии' : 'Kafolatsiz'}
                      </span>
                    )}

                    <span className="bq-offer-meta-pill">
                      <Truck size={12} />
                      {offer.deliveryAvailable ? t.availableDelivery : t.noDelivery}
                    </span>
                  </div>

                  {offer.notes && (
                    <p className="bq-merchant-offer-card__notes">{offer.notes}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Staged Information Modal */}
      {showStagedModal && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setShowStagedModal(false)}>
          <div
            className="bq-merchant-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="staged-modal-title"
          >
            <div className="bq-merchant-modal__head">
              <div className="flex items-center gap-2">
                <Info size={18} className="text-emerald" />
                <h4 id="staged-modal-title" className="font-bold text-slate-900">
                  {lang === 'ru' ? 'Добавление товаров в каталог' : 'Mahsulot qo‘shish bosqichi'}
                </h4>
              </div>
              <button
                type="button"
                className="bq-modal-close-btn"
                onClick={() => setShowStagedModal(false)}
                aria-label="Yopish"
              >
                <X size={16} />
              </button>
            </div>
            <div className="bq-merchant-modal__body">
              <p>
                {lang === 'ru'
                  ? 'Интерфейс для привязки и редактирования товаров подготовлен. По текущим требованиям безопасности, отправка новых записей в живую базу Cloud Firestore будет включена после развертывания утвержденных правил безопасности Firebase.'
                  : 'Mahsulot va narxlarni biriktirish interfeysi tayyorlandi. Xavfsizlik talablariga muvofiq, yangi takliflarni jonli Cloud Firestore bazasiga yuborish keyingi bosqichda Firebase Security Rules yangilangandan so‘ng ochiladi.'}
              </p>
              <div className="bq-merchant-modal__badge">
                <CheckCircle2 size={16} className="text-emerald" />
                <span>
                  {lang === 'ru'
                    ? 'Ваш магазин и данные защищены от несанкционированного изменения.'
                    : 'Do‘koningiz va ma’lumotlaringiz ruxsatsiz o‘zgarishlardan himoyalangan.'}
                </span>
              </div>
            </div>
            <div className="bq-merchant-modal__actions">
              <Button variant="primary" size="sm" onClick={() => setShowStagedModal(false)}>
                {lang === 'ru' ? 'Понятно' : 'Tushunarli'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
