import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Package,
  Plus,
  ShieldCheck,
  Truck,
  AlertCircle,
  Clock,
  CheckCircle2,
  X,
  Search,
  Tag,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/hooks/useAuth';
import {
  getOffersByStore,
  getOfferSubmissions,
  getProductSubmissions,
  createOfferSubmission,
  createProductSubmission,
  getAllProductsCached,
} from '@/services/firebase/catalog';
import { getMerchantTexts } from '@/utils/merchantI18n';
import type {
  Store,
  InventoryOffer,
  ProductItem,
  OfferSubmission,
  ProductSubmission,
  OfferAvailability,
} from '@/types';
import type { MapLanguage } from '@/utils/mapI18n';
import './MerchantOffersList.css';

export interface MerchantOffersListProps {
  store: Store;
  lang?: MapLanguage;
}

export type MerchantOffersTab = 'offers' | 'submissions';
export type ModalTab = 'existing' | 'new';

const CATEGORY_OPTIONS: { id: string; labelUz: string; labelRu: string }[] = [
  { id: 'phones', labelUz: 'Smartfonlar va telefonlar', labelRu: 'Смартфоны и телефоны' },
  { id: 'computers', labelUz: 'Kompyuterlar va noutbuklar', labelRu: 'Компьютеры и ноутбуки' },
  { id: 'appliances', labelUz: 'Maishiy texnika', labelRu: 'Бытовая техника' },
  { id: 'electronics', labelUz: 'Elektronika va gadjetlar', labelRu: 'Электроника и гаджеты' },
  { id: 'construction', labelUz: 'Qurilish va ta’mirlash', labelRu: 'Строительство и ремонт' },
  { id: 'fashion', labelUz: 'Kiyim va poyabzal', labelRu: 'Одежда и обувь' },
  { id: 'food', labelUz: 'Oziq-ovqat mahsulotlari', labelRu: 'Продукты питания' },
  { id: 'auto', labelUz: 'Avto tovarlar', labelRu: 'Автотовары' },
  { id: 'other', labelUz: 'Boshqa toifalar', labelRu: 'Другие категории' },
];

export const MerchantOffersList: React.FC<MerchantOffersListProps> = ({ store, lang }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<MerchantOffersTab>('offers');
  const [offers, setOffers] = useState<InventoryOffer[]>([]);
  const [offerSubmissions, setOfferSubmissions] = useState<OfferSubmission[]>([]);
  const [productSubmissions, setProductSubmissions] = useState<ProductSubmission[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState<ModalTab>('existing');

  // Existing Product Offer Form State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [offerPrice, setOfferPrice] = useState<string>('');
  const [offerAvailability, setOfferAvailability] = useState<OfferAvailability>('in_stock');
  const [offerWarrantyMonths, setOfferWarrantyMonths] = useState<string>('');
  const [offerDelivery, setOfferDelivery] = useState<boolean>(false);
  const [offerNotes, setOfferNotes] = useState<string>('');

  // New Product Submission Form State
  const [newProdName, setNewProdName] = useState('');
  const [newProdCategory, setNewProdCategory] = useState('phones');
  const [newProdBrand, setNewProdBrand] = useState('');
  const [newProdModel, setNewProdModel] = useState('');
  const [newProdBarcode, setNewProdBarcode] = useState('');
  const [newProdImage, setNewProdImage] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdPrice, setNewProdPrice] = useState('');

  // Submission Status
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const t = getMerchantTexts(lang);
  const isStoreActive = Boolean(store.status === 'active' || (!store.status && store.isVerified));

  // Load catalog products for fast client search & lookup
  useEffect(() => {
    let isMounted = true;
    getAllProductsCached(true).then((products) => {
      if (isMounted) setCatalogProducts(products);
    }).catch(() => {
      // Non-blocking fallback
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Load Offers & Submissions for current store
  const loadStoreData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [offersRes, offerSubsRes, prodSubsRes] = await Promise.all([
        getOffersByStore(store.id),
        getOfferSubmissions({ storeId: store.id, merchantUid: user?.uid }),
        getProductSubmissions({ storeId: store.id, merchantUid: user?.uid }),
      ]);

      if (offersRes.error) {
        setError(offersRes.error);
        setOffers([]);
      } else {
        setOffers(offersRes.data || []);
      }

      setOfferSubmissions(offerSubsRes.data || []);
      setProductSubmissions(prodSubsRes.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ma’lumotlarni yuklashda xatolik yuz berdi.');
      setOffers([]);
    } finally {
      setLoading(false);
    }
  }, [store.id, user?.uid]);

  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  const formatPrice = (price: number, currency: string = 'UZS') => {
    return new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(price) + ` ${currency}`;
  };

  // Filter catalog products for search in modal
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) {
      return catalogProducts.slice(0, 8);
    }
    const q = searchQuery.toLowerCase().trim();
    return catalogProducts
      .filter((p) => {
        return (
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          (p.brand && p.brand.toLowerCase().includes(q)) ||
          (p.model && p.model.toLowerCase().includes(q))
        );
      })
      .slice(0, 10);
  }, [catalogProducts, searchQuery]);

  // Combined and sorted submissions list
  const combinedSubmissions = useMemo(() => {
    type UnifiedSub =
      | { kind: 'offer'; sub: OfferSubmission; date: string }
      | { kind: 'product'; sub: ProductSubmission; date: string };

    const unified: UnifiedSub[] = [
      ...offerSubmissions.map((s) => ({ kind: 'offer' as const, sub: s, date: s.createdAt })),
      ...productSubmissions.map((p) => ({ kind: 'product' as const, sub: p, date: p.createdAt })),
    ];

    unified.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return unified;
  }, [offerSubmissions, productSubmissions]);

  // Open modal handler
  const handleOpenModal = (tab: ModalTab = 'existing') => {
    setModalTab(tab);
    setSubmitError(null);
    setSubmitSuccess(null);
    setIsModalOpen(true);
  };

  // Close modal handler
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSubmitError(null);
    setSubmitSuccess(null);
  };

  // Submit Offer for Existing Product
  const handleSubmitOffer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) {
      setSubmitError(lang === 'ru' ? 'Выберите товар из каталога.' : 'Katalogdan mahsulotni tanlang.');
      return;
    }

    const priceNum = Number(offerPrice.replace(/\s+/g, ''));
    if (isNaN(priceNum) || priceNum < 0) {
      setSubmitError(lang === 'ru' ? 'Введите корректную цену.' : 'Narxni to‘g‘ri raqam bilan kiriting.');
      return;
    }

    let warrantyNum: number | undefined = undefined;
    if (offerWarrantyMonths.trim()) {
      const w = parseInt(offerWarrantyMonths, 10);
      if (isNaN(w) || w < 0 || w > 120) {
        setSubmitError(lang === 'ru' ? 'Гарантия от 0 до 120 месяцев.' : 'Kafolat 0 dan 120 oygacha bo‘lishi kerak.');
        return;
      }
      warrantyNum = w;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await createOfferSubmission({
        storeId: store.id,
        productId: selectedProduct.id,
        variantId: selectedVariantId.trim() || undefined,
        price: priceNum,
        currency: 'UZS',
        availability: offerAvailability,
        warrantyMonths: warrantyNum,
        deliveryAvailable: offerDelivery,
        notes: offerNotes.trim() || undefined,
      });

      if (res.error) {
        setSubmitError(res.error);
      } else {
        setSubmitSuccess(t.offerSubmittedSuccess);
        // Refresh data
        await loadStoreData();
        // Reset form
        setSelectedProduct(null);
        setSelectedVariantId('');
        setOfferPrice('');
        setOfferNotes('');
        setOfferWarrantyMonths('');
        setOfferDelivery(false);
        setActiveTab('submissions');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit New Product Suggestion
  const handleSubmitNewProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim() || newProdName.trim().length < 2) {
      setSubmitError(
        lang === 'ru'
          ? 'Название товара должно содержать минимум 2 символа.'
          : 'Mahsulot nomi kamida 2 ta belgidan iborat bo‘lishi kerak.'
      );
      return;
    }

    let proposedPriceNum: number | undefined = undefined;
    if (newProdPrice.trim()) {
      const p = Number(newProdPrice.replace(/\s+/g, ''));
      if (isNaN(p) || p < 0) {
        setSubmitError(lang === 'ru' ? 'Введите корректную цену.' : 'Narxni to‘g‘ri raqam bilan kiriting.');
        return;
      }
      proposedPriceNum = p;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await createProductSubmission({
        storeId: store.id,
        name: newProdName.trim(),
        category: newProdCategory,
        brand: newProdBrand.trim() || undefined,
        model: newProdModel.trim() || undefined,
        barcode: newProdBarcode.trim() || undefined,
        imageUrl: newProdImage.trim() || undefined,
        description: newProdDesc.trim() || undefined,
        proposedPrice: proposedPriceNum,
      });

      if (res.error) {
        setSubmitError(res.error);
      } else {
        setSubmitSuccess(t.productSubmittedSuccess);
        // Refresh data
        await loadStoreData();
        // Reset form
        setNewProdName('');
        setNewProdBrand('');
        setNewProdModel('');
        setNewProdBarcode('');
        setNewProdImage('');
        setNewProdDesc('');
        setNewProdPrice('');
        setActiveTab('submissions');
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Prefill for resubmission from rejected offer/product
  const handleResubmitOffer = (sub: OfferSubmission) => {
    const prod = catalogProducts.find((p) => p.id === sub.productId) || {
      id: sub.productId,
      name: `Mahsulot (${sub.productId})`,
      normalizedName: sub.productId.toLowerCase(),
      searchKeywords: [],
      category: 'other',
      createdAt: '',
      updatedAt: '',
    };
    setSelectedProduct(prod);
    setSelectedVariantId(sub.variantId || '');
    setOfferPrice(String(sub.price || ''));
    setOfferAvailability(sub.availability || 'in_stock');
    setOfferWarrantyMonths(sub.warrantyMonths !== undefined ? String(sub.warrantyMonths) : '');
    setOfferDelivery(Boolean(sub.deliveryAvailable));
    setOfferNotes(sub.notes || '');
    handleOpenModal('existing');
  };

  const handleResubmitProduct = (sub: ProductSubmission) => {
    setNewProdName(sub.name || '');
    setNewProdCategory(sub.category || 'phones');
    setNewProdBrand(sub.brand || '');
    setNewProdModel(sub.model || '');
    setNewProdBarcode(sub.barcode || '');
    setNewProdImage(sub.imageUrl || '');
    setNewProdDesc(sub.description || '');
    setNewProdPrice(sub.proposedPrice !== undefined ? String(sub.proposedPrice) : '');
    handleOpenModal('new');
  };

  return (
    <div className="bq-merchant-offers">
      {/* Header and Controls */}
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
          onClick={() => handleOpenModal('existing')}
          disabled={!isStoreActive}
          title={!isStoreActive ? t.inactiveStoreWarning : undefined}
        >
          {t.addOfferBtn}
        </Button>
      </div>

      {/* Inactive store warning banner if store is pending/archived/inactive */}
      {!isStoreActive && (
        <div className="bq-merchant-offers__warning-banner" role="alert">
          <AlertTriangle size={18} className="text-amber flex-shrink-0" />
          <p>{t.inactiveStoreWarning}</p>
        </div>
      )}

      {/* Primary Tabs: Faol Takliflar vs Arizalar Tarixi */}
      <div className="bq-merchant-offers__tabs">
        <button
          type="button"
          className={`bq-merchant-tab-btn ${
            activeTab === 'offers' ? 'bq-merchant-tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('offers')}
        >
          <Package size={15} />
          <span>{t.activeOffersTab}</span>
          <span className="bq-tab-badge">{offers.length}</span>
        </button>
        <button
          type="button"
          className={`bq-merchant-tab-btn ${
            activeTab === 'submissions' ? 'bq-merchant-tab-btn--active' : ''
          }`}
          onClick={() => setActiveTab('submissions')}
        >
          <Clock size={15} />
          <span>{t.submissionsTab}</span>
          <span className="bq-tab-badge">{combinedSubmissions.length}</span>
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="bq-merchant-offers__loading">
          <div className="bq-spinner" />
          <p>{lang === 'ru' ? 'Загрузка данных магазина...' : 'Do‘kon ma’lumotlari yuklanmoqda...'}</p>
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="bq-merchant-offers__error" role="alert">
          <AlertCircle size={18} className="text-rose flex-shrink-0" />
          <span>{error}</span>
          <Button variant="secondary" size="sm" onClick={loadStoreData}>
            {lang === 'ru' ? 'Повторить' : 'Qaytadan urinish'}
          </Button>
        </div>
      )}

      {/* TAB 1: ACTIVE OFFERS */}
      {!loading && !error && activeTab === 'offers' && (
        <>
          {offers.length === 0 ? (
            <div className="bq-merchant-offers__empty">
              <Package size={36} className="text-slate-400" />
              <h4>{t.noOffersTitle}</h4>
              <p>{t.noOffersDesc}</p>
              {isStoreActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => handleOpenModal('existing')}
                >
                  {t.addOfferBtn}
                </Button>
              )}
            </div>
          ) : (
            <div className="bq-merchant-offers__grid">
              {offers.map((offer) => {
                const prod = catalogProducts.find((p) => p.id === offer.productId);
                return (
                  <div key={offer.id} className="bq-merchant-offer-card">
                    <div className="bq-merchant-offer-card__head">
                      <div className="bq-merchant-offer-card__product-ref">
                        <Package size={16} className="text-emerald flex-shrink-0" />
                        <span className="font-semibold text-slate-800 line-clamp-1">
                          {prod ? prod.name : `ID: ${offer.productId}`}
                        </span>
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

                    {offer.variantId && (
                      <div className="bq-offer-variant-badge">
                        <Tag size={11} />
                        <span>Variant: {offer.variantId}</span>
                      </div>
                    )}

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
        </>
      )}

      {/* TAB 2: SUBMISSIONS HISTORY */}
      {!loading && !error && activeTab === 'submissions' && (
        <div className="bq-submissions-container">
          {combinedSubmissions.length === 0 ? (
            <div className="bq-merchant-offers__empty">
              <Clock size={36} className="text-slate-400" />
              <h4>{t.noSubmissionsTitle}</h4>
              <p>{t.noSubmissionsDesc}</p>
              {isStoreActive && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus size={14} />}
                  onClick={() => handleOpenModal('existing')}
                >
                  {t.addOfferBtn}
                </Button>
              )}
            </div>
          ) : (
            <div className="bq-submissions-grid">
              {combinedSubmissions.map(({ kind, sub }) => {
                const isOffer = kind === 'offer';
                const offerSub = isOffer ? (sub as OfferSubmission) : null;
                const prodSub = !isOffer ? (sub as ProductSubmission) : null;

                const prodTitle = isOffer
                  ? (catalogProducts.find((p) => p.id === offerSub?.productId)?.name ||
                     `Mahsulot (${offerSub?.productId})`)
                  : prodSub?.name;

                const priceDisplay = isOffer
                  ? formatPrice(offerSub?.price || 0, offerSub?.currency || 'UZS')
                  : prodSub?.proposedPrice
                    ? formatPrice(prodSub.proposedPrice, 'UZS')
                    : '-';

                const formattedDate = new Date(sub.createdAt).toLocaleDateString(
                  lang === 'ru' ? 'ru-RU' : 'uz-UZ',
                  {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }
                );

                return (
                  <div key={sub.id} className="bq-submission-card">
                    <div className="bq-submission-card__head">
                      <div className="flex items-center gap-2">
                        <span
                          className={`bq-sub-type-badge bq-sub-type-badge--${
                            isOffer ? 'offer' : 'product'
                          }`}
                        >
                          {isOffer ? t.offerSubmissionBadge : t.productSubmissionBadge}
                        </span>
                        <span className="bq-submission-date">{formattedDate}</span>
                      </div>

                      <span
                        className={`bq-sub-status-badge bq-sub-status-badge--${sub.status}`}
                      >
                        {sub.status === 'pending' && <Clock size={12} />}
                        {sub.status === 'approved' && <CheckCircle2 size={12} />}
                        {sub.status === 'rejected' && <AlertCircle size={12} />}
                        <span>
                          {sub.status === 'pending'
                            ? t.statusPending
                            : sub.status === 'approved'
                              ? t.statusApproved
                              : t.statusRejected}
                        </span>
                      </span>
                    </div>

                    <div className="bq-submission-card__body">
                      <h4 className="bq-submission-card__title">{prodTitle}</h4>

                      <div className="bq-submission-card__details">
                        <span className="bq-submission-price">{priceDisplay}</span>
                        {isOffer && offerSub?.variantId && (
                          <span className="bq-offer-meta-pill">Variant: {offerSub.variantId}</span>
                        )}
                        {!isOffer && prodSub?.category && (
                          <span className="bq-offer-meta-pill">{prodSub.category}</span>
                        )}
                        {!isOffer && prodSub?.brand && (
                          <span className="bq-offer-meta-pill">{prodSub.brand}</span>
                        )}
                      </div>

                      {/* Rejection Alert Box */}
                      {sub.status === 'rejected' && (
                        <div className="bq-submission-card__rejected-box">
                          <div className="flex items-start gap-1.5">
                            <AlertTriangle size={15} className="text-rose flex-shrink-0 mt-0.5" />
                            <div>
                              <strong>{t.adminNoteLabel}</strong>
                              <p>{sub.adminNotes || (lang === 'ru' ? 'Причина не указана.' : 'Izoh qoldirilmagan.')}</p>
                            </div>
                          </div>
                          {isStoreActive && (
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              leftIcon={<RotateCcw size={12} />}
                              onClick={() => {
                                if (isOffer && offerSub) handleResubmitOffer(offerSub);
                                if (!isOffer && prodSub) handleResubmitProduct(prodSub);
                              }}
                            >
                              {t.resubmitBtn}
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* OFFER & PRODUCT SUBMISSION MODAL */}
      {isModalOpen && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={handleCloseModal}>
          <div
            className="bq-merchant-modal bq-merchant-modal--wide"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="submission-modal-title"
          >
            {/* Modal Header */}
            <div className="bq-merchant-modal__head">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-emerald" />
                <h4 id="submission-modal-title" className="font-bold text-slate-900">
                  {t.modalTitle}
                </h4>
              </div>
              <button
                type="button"
                className="bq-modal-close-btn"
                onClick={handleCloseModal}
                aria-label="Yopish"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Tabs: Existing vs New Product */}
            <div className="bq-modal-tabs">
              <button
                type="button"
                className={`bq-modal-tab-btn ${
                  modalTab === 'existing' ? 'bq-modal-tab-btn--active' : ''
                }`}
                onClick={() => {
                  setModalTab('existing');
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
              >
                <Package size={15} />
                <span>{t.selectExistingTab}</span>
              </button>
              <button
                type="button"
                className={`bq-modal-tab-btn ${
                  modalTab === 'new' ? 'bq-modal-tab-btn--active' : ''
                }`}
                onClick={() => {
                  setModalTab('new');
                  setSubmitError(null);
                  setSubmitSuccess(null);
                }}
              >
                <Plus size={15} />
                <span>{t.suggestNewTab}</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="bq-merchant-modal__body">
              {/* Feedback Alerts */}
              {submitError && (
                <div className="bq-modal-alert bq-modal-alert--error" role="alert">
                  <AlertCircle size={16} className="text-rose flex-shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {submitSuccess && (
                <div className="bq-modal-alert bq-modal-alert--success" role="status">
                  <CheckCircle2 size={16} className="text-emerald flex-shrink-0" />
                  <span>{submitSuccess}</span>
                </div>
              )}

              {/* TAB 1: Existing Product Selection */}
              {modalTab === 'existing' && !submitSuccess && (
                <form onSubmit={handleSubmitOffer} className="bq-modal-form">
                  {/* Product Picker */}
                  {!selectedProduct ? (
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.searchCatalogPlaceholder}</label>
                      <div className="bq-search-box">
                        <Search size={15} className="bq-search-box__icon" />
                        <input
                          type="text"
                          className="bq-form-input bq-search-box__input"
                          placeholder={t.searchCatalogPlaceholder}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                      </div>

                      {/* Search Results List */}
                      <div className="bq-catalog-search-results">
                        {filteredProducts.length === 0 ? (
                          <div className="bq-catalog-no-results">
                            <p>{t.noProductsFound}</p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              leftIcon={<Plus size={13} />}
                              onClick={() => setModalTab('new')}
                            >
                              {t.suggestNewTab}
                            </Button>
                          </div>
                        ) : (
                          filteredProducts.map((p) => (
                            <div
                              key={p.id}
                              className="bq-catalog-product-pick-item"
                              onClick={() => {
                                setSelectedProduct(p);
                                setSearchQuery('');
                              }}
                            >
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="bq-catalog-product-thumb"
                                />
                              ) : (
                                <div className="bq-catalog-product-thumb-placeholder">
                                  <Package size={16} />
                                </div>
                              )}
                              <div className="bq-catalog-pick-info">
                                <span className="bq-catalog-pick-name">{p.name}</span>
                                <span className="bq-catalog-pick-meta">
                                  {p.brand ? `${p.brand} • ` : ''}
                                  {p.category}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ) : (
                    /* Selected Product Card */
                    <div className="bq-selected-product-card">
                      <div className="flex items-center gap-3">
                        {selectedProduct.imageUrl ? (
                          <img
                            src={selectedProduct.imageUrl}
                            alt={selectedProduct.name}
                            className="bq-catalog-product-thumb"
                          />
                        ) : (
                          <div className="bq-catalog-product-thumb-placeholder">
                            <Package size={18} />
                          </div>
                        )}
                        <div>
                          <span className="bq-selected-label">{t.selectedProduct}</span>
                          <h4 className="bq-selected-name">{selectedProduct.name}</h4>
                          <span className="bq-catalog-pick-meta">
                            {selectedProduct.brand ? `${selectedProduct.brand} • ` : ''}
                            {selectedProduct.category}
                          </span>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                      >
                        {t.changeProduct}
                      </Button>
                    </div>
                  )}

                  {/* Pricing and Details (Enabled after product selection) */}
                  {selectedProduct && (
                    <>
                      <div className="bq-modal-grid-2">
                        {/* Price (UZS) */}
                        <div className="bq-modal-form-group">
                          <label className="bq-form-label">{t.priceUzsLabel} *</label>
                          <input
                            type="number"
                            min="0"
                            step="1000"
                            required
                            className="bq-form-input font-bold"
                            placeholder={t.pricePlaceholder}
                            value={offerPrice}
                            onChange={(e) => setOfferPrice(e.target.value)}
                          />
                        </div>

                        {/* Availability */}
                        <div className="bq-modal-form-group">
                          <label className="bq-form-label">{t.availabilityLabel}</label>
                          <select
                            className="bq-form-select"
                            value={offerAvailability}
                            onChange={(e) =>
                              setOfferAvailability(e.target.value as OfferAvailability)
                            }
                          >
                            <option value="in_stock">{t.inStock}</option>
                            <option value="pre_order">{t.onOrder}</option>
                            <option value="on_demand">{t.onOrder} (On demand)</option>
                            <option value="out_of_stock">{t.outOfStock}</option>
                          </select>
                        </div>
                      </div>

                      <div className="bq-modal-grid-2">
                        {/* Variant ID */}
                        <div className="bq-modal-form-group">
                          <label className="bq-form-label">{t.variantLabel}</label>
                          <input
                            type="text"
                            className="bq-form-input"
                            placeholder={t.selectVariantPlaceholder}
                            value={selectedVariantId}
                            onChange={(e) => setSelectedVariantId(e.target.value)}
                          />
                        </div>

                        {/* Warranty Months */}
                        <div className="bq-modal-form-group">
                          <label className="bq-form-label">{t.warrantyMonthsLabel}</label>
                          <input
                            type="number"
                            min="0"
                            max="120"
                            className="bq-form-input"
                            placeholder={t.warrantyPlaceholder}
                            value={offerWarrantyMonths}
                            onChange={(e) => setOfferWarrantyMonths(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Delivery Available Checkbox */}
                      <div className="bq-modal-checkbox-group">
                        <label className="bq-checkbox-label">
                          <input
                            type="checkbox"
                            checked={offerDelivery}
                            onChange={(e) => setOfferDelivery(e.target.checked)}
                          />
                          <span>{t.deliveryCheckboxLabel}</span>
                        </label>
                      </div>

                      {/* Notes */}
                      <div className="bq-modal-form-group">
                        <label className="bq-form-label">{t.notesLabel}</label>
                        <textarea
                          rows={2}
                          className="bq-form-textarea"
                          placeholder={t.notesPlaceholder}
                          value={offerNotes}
                          onChange={(e) => setOfferNotes(e.target.value)}
                        />
                      </div>

                      {/* Form Actions */}
                      <div className="bq-merchant-modal__actions">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={handleCloseModal}
                        >
                          {t.cancelBtn}
                        </Button>
                        <Button
                          type="submit"
                          variant="primary"
                          size="sm"
                          isLoading={isSubmitting}
                        >
                          {isSubmitting ? t.sendingBtn : t.sendOfferSubmissionBtn}
                        </Button>
                      </div>
                    </>
                  )}
                </form>
              )}

              {/* TAB 2: Suggest New Product */}
              {modalTab === 'new' && !submitSuccess && (
                <form onSubmit={handleSubmitNewProduct} className="bq-modal-form">
                  <div className="bq-modal-form-group">
                    <label className="bq-form-label">{t.newProdNameLabel} *</label>
                    <input
                      type="text"
                      required
                      className="bq-form-input"
                      placeholder={t.newProdNamePlaceholder}
                      value={newProdName}
                      onChange={(e) => setNewProdName(e.target.value)}
                    />
                  </div>

                  <div className="bq-modal-grid-2">
                    {/* Category */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdCategoryLabel} *</label>
                      <select
                        className="bq-form-select"
                        value={newProdCategory}
                        onChange={(e) => setNewProdCategory(e.target.value)}
                      >
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.id} value={c.id}>
                            {lang === 'ru' ? c.labelRu : c.labelUz}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Proposed Price */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdProposedPriceLabel}</label>
                      <input
                        type="number"
                        min="0"
                        className="bq-form-input"
                        placeholder="2500000"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bq-modal-grid-2">
                    {/* Brand */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdBrandLabel}</label>
                      <input
                        type="text"
                        className="bq-form-input"
                        placeholder={t.newProdBrandPlaceholder}
                        value={newProdBrand}
                        onChange={(e) => setNewProdBrand(e.target.value)}
                      />
                    </div>

                    {/* Model */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdModelLabel}</label>
                      <input
                        type="text"
                        className="bq-form-input"
                        placeholder={t.newProdModelPlaceholder}
                        value={newProdModel}
                        onChange={(e) => setNewProdModel(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="bq-modal-grid-2">
                    {/* Barcode */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdBarcodeLabel}</label>
                      <input
                        type="text"
                        className="bq-form-input"
                        placeholder={t.newProdBarcodePlaceholder}
                        value={newProdBarcode}
                        onChange={(e) => setNewProdBarcode(e.target.value)}
                      />
                    </div>

                    {/* Image URL */}
                    <div className="bq-modal-form-group">
                      <label className="bq-form-label">{t.newProdImageLabel}</label>
                      <input
                        type="url"
                        className="bq-form-input"
                        placeholder={t.newProdImagePlaceholder}
                        value={newProdImage}
                        onChange={(e) => setNewProdImage(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className="bq-modal-form-group">
                    <label className="bq-form-label">{t.newProdDescLabel}</label>
                    <textarea
                      rows={2}
                      className="bq-form-textarea"
                      placeholder={t.newProdDescPlaceholder}
                      value={newProdDesc}
                      onChange={(e) => setNewProdDesc(e.target.value)}
                    />
                  </div>

                  {/* Form Actions */}
                  <div className="bq-merchant-modal__actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleCloseModal}
                    >
                      {t.cancelBtn}
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSubmitting}
                    >
                      {isSubmitting ? t.sendingBtn : t.sendProductSubmissionBtn}
                    </Button>
                  </div>
                </form>
              )}

              {/* Success View Actions */}
              {submitSuccess && (
                <div className="bq-merchant-modal__actions">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleCloseModal}
                  >
                    {lang === 'ru' ? 'Закрыть' : 'Yopish'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
