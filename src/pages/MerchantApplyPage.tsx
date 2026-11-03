import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Store as StoreIcon,
  MapPin,
  Phone,
  Clock,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Info,
  Navigation,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { createStore } from '@/services/firebase/catalog';
import { validateStoreInput } from '@/utils/catalogValidation';
import { KARAKALPAKSTAN_DISTRICTS } from '@/utils/karakalpakstanDistricts';
import { CITY_CENTROIDS } from '@/utils/geo';
import { getMerchantTexts } from '@/utils/merchantI18n';
import { getSavedMapLanguage, type MapLanguage } from '@/utils/mapI18n';
import type { CreateStoreInput } from '@/types';
import './MerchantApplyPage.css';

const DEFAULT_CATEGORIES = [
  'Elektronika va maishiy texnika',
  'Smartfonlar va aksessuarlar',
  'Kompyuterlar va orgtexnika',
  'Supermarket va oziq-ovqat',
  'Kiyim va poyabzal',
  'Dorixona va tibbiy buyumlar',
  'Avtoservis va ehtiyot qismlar',
  'Qurilish va ta’mirlash mollari',
  'Kitob va kanselyariya',
  'Mebel va uy-ro‘zg‘or',
  'Boshqa xizmatlar',
];

export interface ApplySubmissionResult {
  successInfo: { isLive: boolean; message: string } | null;
  errorMessage: string | null;
}

/**
 * Pure handler for processing createStore responses.
 * SECURITY GUARANTEE: Never sets successInfo when res.data is missing or res.error exists.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function handleCreateStoreResult(
  res: { data: unknown | null; error: string | null },
  t: { successDesc: string; rulesDeniedError: string }
): ApplySubmissionResult {
  if (res.data) {
    return {
      successInfo: { isLive: true, message: t.successDesc },
      errorMessage: null,
    };
  }

  const isPermissionIssue =
    Boolean(res.error) &&
    (res.error!.toLowerCase().includes('ruxsat') ||
      res.error!.toLowerCase().includes('permission') ||
      res.error!.toLowerCase().includes('rad etildi'));

  return {
    successInfo: null,
    errorMessage: isPermissionIssue ? t.rulesDeniedError : (res.error || 'Xatolik yuz berdi.'),
  };
}

export const MerchantApplyPage: React.FC = () => {
  const { user, isEmailVerified } = useAuth();
  const navigate = useNavigate();

  const lang: MapLanguage = getSavedMapLanguage();
  const t = getMerchantTexts(lang);

  // Form Fields State
  const [name, setName] = useState('');
  const [city, setCity] = useState('Nukus');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('+998 ');
  const [category, setCategory] = useState(DEFAULT_CATEGORIES[0]);
  const [placeType, setPlaceType] = useState<'store' | 'service' | 'pharmacy' | 'workshop' | 'market'>('store');
  const [openingHours, setOpeningHours] = useState('09:00 - 20:00');
  const [lat, setLat] = useState('42.4619');
  const [lng, setLng] = useState('59.6166');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');

  // UI status state
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ isLive: boolean; message: string } | null>(null);
  const [detectingGps, setDetectingGps] = useState(false);

  // Auto-fill coordinates from city centroid
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    const centroid = CITY_CENTROIDS[newCity];
    if (centroid) {
      setLat(centroid.lat.toString());
      setLng(centroid.lng.toString());
    }
  };

  // Get current device GPS coordinates safely
  const handleDetectCoordinates = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setErrorMessage(
        lang === 'ru'
          ? 'Геолокация не поддерживается вашим браузером.'
          : 'Brauzeringizda GPS geolokatsiya qo‘llab-quvvatlanmaydi.'
      );
      return;
    }

    setDetectingGps(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setDetectingGps(false);
      },
      () => {
        setDetectingGps(false);
        setErrorMessage(
          lang === 'ru'
            ? 'Не удалось определить GPS координаты. Укажите вручную.'
            : 'GPS koordinatalarini aniqlab bo‘lmadi. Qo‘lda kiriting.'
        );
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessInfo(null);

    if (!user) {
      setErrorMessage(
        lang === 'ru' ? 'Вы должны войти в систему.' : 'Ariza yuborish uchun tizimga kiring.'
      );
      return;
    }

    if (!isEmailVerified) {
      setErrorMessage(t.emailNotVerifiedDesc);
      return;
    }

    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);

    const inputData: CreateStoreInput = {
      name: name.trim(),
      city: city.trim(),
      district: district.trim() || undefined,
      address: address.trim(),
      coordinates: { lat: latNum, lng: lngNum },
      category: category.trim(),
      phone: phone.trim(),
      openingHours: openingHours.trim(),
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      placeType,
    };

    // Client-side strict validation
    const validation = validateStoreInput(inputData);
    if (!validation.isValid) {
      setErrorMessage(validation.error || 'Iltimos, barcha majburiy maydonlarni to‘g‘ri to‘ldiring.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await createStore(inputData);
      const outcome = handleCreateStoreResult(res, t);
      setSuccessInfo(outcome.successInfo);
      setErrorMessage(outcome.errorMessage);
    } catch (err) {
      setSuccessInfo(null);
      setErrorMessage(err instanceof Error ? err.message : 'Kutilmagan xatolik yuz berdi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bq-apply-page">
      <div className="container">
        {/* Navigation Breadcrumb / Back Link */}
        <div className="bq-apply-back-wrap">
          <Link to="/merchant" className="bq-apply-back-link">
            <ArrowLeft size={16} />
            <span>{t.backToDashboard}</span>
          </Link>
        </div>

        {/* Header */}
        <div className="bq-apply-header">
          <div className="bq-apply-tag">
            <ShieldCheck size={14} />
            <span>{lang === 'ru' ? 'Регистрация магазина' : 'Do‘kon ro‘yxatdan o‘tkazish'}</span>
          </div>
          <h1 className="bq-apply-title">{t.applyTitle}</h1>
          <p className="bq-apply-subtitle">{t.applySubtitle}</p>
        </div>

        {/* Email verification alert if unverified */}
        {!isEmailVerified && (
          <div className="bq-apply-alert bq-apply-alert--warning" role="alert">
            <AlertCircle size={20} className="flex-shrink-0" />
            <div>
              <h4>{t.emailNotVerifiedTitle}</h4>
              <p>{t.emailNotVerifiedDesc}</p>
              <Link to="/merchant">
                <Button variant="secondary" size="sm" style={{ marginTop: '0.5rem' }}>
                  {t.backToDashboard}
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Success Message Banner */}
        {successInfo && (
          <div className="bq-apply-alert bq-apply-alert--success animate-fade-in" role="status">
            <CheckCircle2 size={24} className="flex-shrink-0 text-emerald" />
            <div>
              <h3>{t.successTitle}</h3>
              <p>{successInfo.message}</p>
              <div style={{ marginTop: '1rem' }}>
                <Button variant="primary" size="sm" onClick={() => navigate('/merchant')}>
                  {t.backToDashboard}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Application Form */}
        {isEmailVerified && !successInfo && (
          <form className="bq-apply-form-card" onSubmit={handleSubmit} noValidate>
            {/* Security notice banner */}
            <div className="bq-apply-security-banner">
              <Info size={16} className="text-emerald flex-shrink-0" />
              <div>
                <strong>{t.securityNoticeTitle}: </strong>
                <span>{t.securityNoticeText}</span>
              </div>
            </div>

            {/* Error display */}
            {errorMessage && (
              <div className="bq-apply-error-banner animate-fade-in" role="alert">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="bq-apply-grid">
              {/* Store Name */}
              <div className="bq-form-group bq-form-group--full">
                <label htmlFor="store-name-input" className="bq-form-label">
                  {t.nameLabel} <span className="text-rose">*</span>
                </label>
                <div className="bq-input-icon-wrap">
                  <StoreIcon size={16} className="bq-input-icon" />
                  <input
                    id="store-name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t.namePlaceholder}
                    className="bq-form-input"
                    required
                    maxLength={100}
                  />
                </div>
              </div>

              {/* City */}
              <div className="bq-form-group">
                <label htmlFor="store-city-select" className="bq-form-label">
                  {t.cityLabel} <span className="text-rose">*</span>
                </label>
                <select
                  id="store-city-select"
                  value={city}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="bq-form-select"
                  required
                >
                  {Object.keys(CITY_CENTROIDS).map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* District */}
              <div className="bq-form-group">
                <label htmlFor="store-district-select" className="bq-form-label">
                  {t.districtLabel}
                </label>
                <select
                  id="store-district-select"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="bq-form-select"
                >
                  <option value="">{t.districtPlaceholder}</option>
                  {KARAKALPAKSTAN_DISTRICTS.map((d) => (
                    <option key={d.id} value={d.name}>
                      {lang === 'ru' ? d.nameRu : d.nameUz}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Address */}
              <div className="bq-form-group bq-form-group--full">
                <label htmlFor="store-address-input" className="bq-form-label">
                  {t.addressLabel} <span className="text-rose">*</span>
                </label>
                <div className="bq-input-icon-wrap">
                  <MapPin size={16} className="bq-input-icon" />
                  <input
                    id="store-address-input"
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t.addressPlaceholder}
                    className="bq-form-input"
                    required
                  />
                </div>
              </div>

              {/* Phone */}
              <div className="bq-form-group">
                <label htmlFor="store-phone-input" className="bq-form-label">
                  {t.phoneLabel} <span className="text-rose">*</span>
                </label>
                <div className="bq-input-icon-wrap">
                  <Phone size={16} className="bq-input-icon" />
                  <input
                    id="store-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.phonePlaceholder}
                    className="bq-form-input"
                    required
                  />
                </div>
              </div>

              {/* Category */}
              <div className="bq-form-group">
                <label htmlFor="store-category-select" className="bq-form-label">
                  {t.categoryLabel} <span className="text-rose">*</span>
                </label>
                <select
                  id="store-category-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bq-form-select"
                  required
                >
                  {DEFAULT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Place Type */}
              <div className="bq-form-group">
                <label htmlFor="store-type-select" className="bq-form-label">
                  {t.placeTypeLabel}
                </label>
                <select
                  id="store-type-select"
                  value={placeType}
                  onChange={(e) =>
                    setPlaceType(e.target.value as 'store' | 'service' | 'pharmacy' | 'workshop' | 'market')
                  }
                  className="bq-form-select"
                >
                  <option value="store">{lang === 'ru' ? 'Магазин' : 'Do‘kon'}</option>
                  <option value="service">{lang === 'ru' ? 'Сервис / Услуги' : 'Xizmat ko‘rsatish'}</option>
                  <option value="pharmacy">{lang === 'ru' ? 'Аптека' : 'Dorixona'}</option>
                  <option value="workshop">{lang === 'ru' ? 'Мастерская' : 'Ustaxona'}</option>
                  <option value="market">{lang === 'ru' ? 'Рынок / Торговый ряд' : 'Bozor / Savdo qatori'}</option>
                </select>
              </div>

              {/* Opening Hours */}
              <div className="bq-form-group">
                <label htmlFor="store-hours-input" className="bq-form-label">
                  {t.hoursLabel} <span className="text-rose">*</span>
                </label>
                <div className="bq-input-icon-wrap">
                  <Clock size={16} className="bq-input-icon" />
                  <input
                    id="store-hours-input"
                    type="text"
                    value={openingHours}
                    onChange={(e) => setOpeningHours(e.target.value)}
                    placeholder={t.hoursPlaceholder}
                    className="bq-form-input"
                    required
                  />
                </div>
              </div>

              {/* Coordinates */}
              <div className="bq-form-group bq-form-group--full">
                <div className="flex items-center justify-between mb-1">
                  <label className="bq-form-label mb-0">
                    {t.coordsLabel} <span className="text-rose">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDetectCoordinates}
                    isLoading={detectingGps}
                    leftIcon={<Navigation size={13} />}
                  >
                    {t.getGpsCoordsBtn}
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="any"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="Latitude (Kenglik)"
                    className="bq-form-input"
                    aria-label="Latitude"
                    required
                  />
                  <input
                    type="number"
                    step="any"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="Longitude (Uzunlik)"
                    className="bq-form-input"
                    aria-label="Longitude"
                    required
                  />
                </div>
                <span className="bq-form-hint">{t.coordsHelp}</span>
              </div>

              {/* Website */}
              <div className="bq-form-group bq-form-group--full">
                <label htmlFor="store-website-input" className="bq-form-label">
                  {t.websiteLabel}
                </label>
                <input
                  id="store-website-input"
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder={t.websitePlaceholder}
                  className="bq-form-input"
                />
              </div>

              {/* Description */}
              <div className="bq-form-group bq-form-group--full">
                <label htmlFor="store-desc-input" className="bq-form-label">
                  {t.descriptionLabel}
                </label>
                <textarea
                  id="store-desc-input"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.descriptionPlaceholder}
                  className="bq-form-textarea"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="bq-apply-form-actions">
              <Link to="/merchant">
                <Button type="button" variant="ghost">
                  {lang === 'ru' ? 'Отмена' : 'Bekor qilish'}
                </Button>
              </Link>
              <Button type="submit" variant="primary" size="md" isLoading={submitting}>
                {submitting ? t.submittingBtn : t.submitBtn}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
