import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ShoppingBag,
  Store as StoreIcon,
  MapPin,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Mail,
  Minus,
  Plus,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { createOrder } from '@/services/firebase/orders';
import type { ProductItem, StoreProductOffer, Order } from '@/types';
import type { MapLanguage } from '@/utils/mapI18n';
import './CustomerOrderModal.css';

export interface CustomerOrderModalProps {
  isOpen: boolean;
  product: ProductItem | null;
  offer: StoreProductOffer | null;
  lang?: MapLanguage;
  onClose: () => void;
  onSuccess?: (order: Order) => void;
}

export const CustomerOrderModal: React.FC<CustomerOrderModalProps> = ({
  isOpen,
  product,
  offer,
  lang = 'uz',
  onClose,
  onSuccess,
}) => {
  const { user, isEmailVerified, sendVerification } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerNote, setCustomerNote] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Pre-fill user profile info if available
  useEffect(() => {
    if (user) {
      if (user.displayName) setCustomerName(user.displayName);
      if (user.phoneNumber) setCustomerPhone(user.phoneNumber);
    }
  }, [user]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setQuantity(1);
      setCustomerNote('');
      setSubmitError(null);
      setCreatedOrder(null);
      setResendSent(false);
    }
  }, [isOpen]);

  if (!isOpen || !product || !offer) return null;

  const unitPrice = offer.price;
  const currency = offer.currency || 'UZS';
  const totalAmount = unitPrice * quantity;

  const formatPrice = (amount: number) => {
    return (
      new Intl.NumberFormat(lang === 'ru' ? 'ru-RU' : 'uz-UZ').format(amount) +
      ` ${currency}`
    );
  };

  const handleDecreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncreaseQuantity = () => {
    if (quantity < 99) setQuantity(quantity + 1);
  };

  const handleSendVerification = async () => {
    setResendLoading(true);
    try {
      const res = await sendVerification();
      if (res.success) setResendSent(true);
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !offer) return;

    if (!customerName.trim() || customerName.trim().length < 2) {
      setSubmitError(
        lang === 'ru'
          ? 'Введите ваше имя (минимум 2 символа).'
          : 'Ismingizni kiriting (kamida 2 ta belgi).'
      );
      return;
    }

    const phoneRegex = /^\+?[0-9\s\-()]{7,20}$/;
    if (!phoneRegex.test(customerPhone.trim())) {
      setSubmitError(
        lang === 'ru'
          ? 'Введите корректный номер телефона (например: +998 90 123 45 67).'
          : 'To‘g‘ri telefon raqami kiriting (masalan: +998 90 123 45 67).'
      );
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const res = await createOrder({
        storeId: offer.storeId,
        productId: product.id,
        offerId: offer.id,
        variantId: offer.variantId,
        quantity,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerNote: customerNote.trim() || undefined,
      });

      if (res.error) {
        setSubmitError(res.error);
      } else if (res.data) {
        setCreatedOrder(res.data);
        if (onSuccess) onSuccess(res.data);
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Xatolik yuz berdi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bq-modal-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="bq-customer-order-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="order-modal-title"
      >
        {/* Modal Head */}
        <div className="bq-customer-order-modal__head">
          <div className="flex items-center gap-2">
            <ShoppingBag size={18} className="text-emerald" />
            <h3 id="order-modal-title" className="font-bold text-slate-900">
              {lang === 'ru' ? 'Запрос в магазин' : 'Do‘konga so‘rov yuborish'}
            </h3>
          </div>
          <button
            type="button"
            className="bq-modal-close-btn"
            onClick={onClose}
            aria-label="Yopish"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="bq-customer-order-modal__body">
          {/* Summary Card */}
          <div className="bq-order-summary-card">
            <div className="bq-order-summary-row">
              <span className="bq-order-summary-label">
                {lang === 'ru' ? 'Товар:' : 'Mahsulot:'}
              </span>
              <strong className="bq-order-summary-value text-slate-900">
                {product.name}
              </strong>
            </div>

            <div className="bq-order-summary-row">
              <span className="bq-order-summary-label">
                {lang === 'ru' ? 'Магазин:' : 'Do‘kon:'}
              </span>
              <div className="flex items-center gap-1.5">
                <StoreIcon size={14} className="text-emerald flex-shrink-0" />
                <span className="font-semibold text-slate-800">{offer.storeName}</span>
              </div>
            </div>

            <div className="bq-order-summary-row">
              <span className="bq-order-summary-label">
                {lang === 'ru' ? 'Адрес:' : 'Manzil:'}
              </span>
              <div className="flex items-center gap-1 text-slate-600 text-xs">
                <MapPin size={12} className="text-slate-400 flex-shrink-0" />
                <span>
                  {offer.storeCity}, {offer.storeAddress}
                </span>
              </div>
            </div>

            <div className="bq-order-summary-row bq-order-summary-row--price">
              <span className="bq-order-summary-label">
                {lang === 'ru' ? 'Цена за единицу:' : 'Birlik narxi:'}
              </span>
              <strong className="bq-order-unit-price">{formatPrice(unitPrice)}</strong>
            </div>
          </div>

          {/* Unauthenticated User Barrier */}
          {!user && (
            <div className="bq-order-barrier-card" role="alert">
              <AlertCircle size={22} className="text-amber flex-shrink-0" />
              <div>
                <h4>
                  {lang === 'ru'
                    ? 'Требуется авторизация'
                    : 'Tizimga kirish talab etiladi'}
                </h4>
                <p>
                  {lang === 'ru'
                    ? 'Чтобы отправить запрос в магазин, войдите в свой аккаунт OneShop.'
                    : 'Do‘konga so‘rov yuborish uchun OneShop akkauntingizga kiring.'}
                </p>
                <Link to="/login" onClick={onClose}>
                  <Button variant="primary" size="sm" style={{ marginTop: '0.65rem' }}>
                    {lang === 'ru' ? 'Войти в аккаунт' : 'Tizimga kirish'}
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Email Not Verified Barrier */}
          {user && !isEmailVerified && (
            <div className="bq-order-barrier-card" role="alert">
              <AlertTriangle size={22} className="text-amber flex-shrink-0" />
              <div>
                <h4>
                  {lang === 'ru'
                    ? 'Подтвердите электронную почту'
                    : 'Pochtangizni tasdiqlang'}
                </h4>
                <p>
                  {lang === 'ru'
                    ? 'Для защиты от спама заказы принимаются только с подтвержденного email-адреса.'
                    : 'Spam va soxta buyurtmalardan himoyalanish uchun elektron pochtangiz tasdiqlangan bo‘lishi shart.'}
                </p>
                <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={handleSendVerification}
                    isLoading={resendLoading}
                    disabled={resendSent}
                    leftIcon={<Mail size={13} />}
                  >
                    {resendSent
                      ? lang === 'ru' ? 'Письмо отправлено' : 'Xat yuborildi'
                      : lang === 'ru' ? 'Отправить подтверждение' : 'Tasdiqlash xatini yuborish'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Error Notice */}
          {submitError && (
            <div className="bq-order-alert bq-order-alert--error" role="alert">
              <AlertCircle size={16} className="text-rose flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Success State */}
          {createdOrder && (
            <div className="bq-order-success-card animate-fade-in" role="status">
              <CheckCircle2 size={44} className="text-emerald" />
              <h4>
                {lang === 'ru' ? 'Запрос успешно отправлен!' : 'So‘rovingiz qabul qilindi!'}
              </h4>
              <p>
                {lang === 'ru'
                  ? 'Менеджер магазина свяжется с вами по указанному телефону для подтверждения деталей.'
                  : 'Do‘kon xodimi tez orada ko‘rsatilgan telefon raqami orqali siz bilan bog‘lanadi.'}
              </p>
              <div className="bq-order-success-details">
                <span>
                  {lang === 'ru' ? 'Номер заказа:' : 'Buyurtma raqami:'}{' '}
                  <code>{createdOrder.id}</code>
                </span>
                <span>
                  {lang === 'ru' ? 'Итоговая сумма:' : 'Jami summa:'}{' '}
                  <strong>{formatPrice(createdOrder.totalAmount || totalAmount)}</strong>
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={onClose}
                style={{ marginTop: '1rem' }}
              >
                {lang === 'ru' ? 'Понятно' : 'Tushunarli'}
              </Button>
            </div>
          )}

          {/* Order Form (Only for Authenticated and Verified Users) */}
          {user && isEmailVerified && !createdOrder && (
            <form onSubmit={handleSubmit} className="bq-order-form">
              {/* Quantity Stepper */}
              <div className="bq-order-form-group">
                <label className="bq-form-label">
                  {lang === 'ru' ? 'Количество (1-99):' : 'Miqdor (1-99):'}
                </label>
                <div className="bq-order-stepper">
                  <button
                    type="button"
                    className="bq-stepper-btn"
                    onClick={handleDecreaseQuantity}
                    disabled={quantity <= 1}
                    aria-label="Kamaytirish"
                  >
                    <Minus size={14} />
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={quantity}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= 99) setQuantity(v);
                    }}
                    className="bq-stepper-input"
                  />
                  <button
                    type="button"
                    className="bq-stepper-btn"
                    onClick={handleIncreaseQuantity}
                    disabled={quantity >= 99}
                    aria-label="Ko'paytirish"
                  >
                    <Plus size={14} />
                  </button>
                  <div className="bq-order-total-pill">
                    <span>{lang === 'ru' ? 'Итого:' : 'Jami:'}</span>
                    <strong>{formatPrice(totalAmount)}</strong>
                  </div>
                </div>
              </div>

              {/* Customer Name */}
              <div className="bq-order-form-group">
                <label className="bq-form-label">
                  {lang === 'ru' ? 'Ваше имя *' : 'Ismingiz *'}
                </label>
                <input
                  type="text"
                  required
                  className="bq-form-input font-medium"
                  placeholder={lang === 'ru' ? 'Например: Азамат' : 'Masalan: Azamat'}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>

              {/* Customer Phone */}
              <div className="bq-order-form-group">
                <label className="bq-form-label">
                  {lang === 'ru' ? 'Номер телефона *' : 'Telefon raqamingiz *'}
                </label>
                <input
                  type="tel"
                  required
                  className="bq-form-input font-medium"
                  placeholder="+998 90 123 45 67"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
              </div>

              {/* Customer Note */}
              <div className="bq-order-form-group">
                <label className="bq-form-label">
                  {lang === 'ru'
                    ? 'Примечание к заказу (необязательно)'
                    : 'Buyurtmaga izoh (ixtiyoriy)'}
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  className="bq-form-textarea"
                  placeholder={
                    lang === 'ru'
                      ? 'Например: Предпочтительное время звонка или доставки...'
                      : 'Masalan: Yetkazib berish vaqti yoki qo‘shimcha eslatmalar...'
                  }
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                />
              </div>

              {/* Modal Actions */}
              <div className="bq-customer-order-modal__actions">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {lang === 'ru' ? 'Отмена' : 'Bekor qilish'}
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting}
                  leftIcon={<ShoppingBag size={14} />}
                >
                  {isSubmitting
                    ? lang === 'ru' ? 'Отправка...' : 'Yuborilmoqda...'
                    : lang === 'ru' ? 'Отправить запрос' : 'So‘rovni yuborish'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

