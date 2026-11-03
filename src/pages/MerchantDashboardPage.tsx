import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Store as StoreIcon,
  Plus,
  ShieldCheck,
  Clock,
  MapPin,
  Phone,
  AlertTriangle,
  RefreshCw,
  Mail,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { MerchantOffersList } from '@/features/merchant/MerchantOffersList';
import { getStoresByOwner } from '@/services/firebase/catalog';
import { getMerchantTexts } from '@/utils/merchantI18n';
import { getSavedMapLanguage, type MapLanguage } from '@/utils/mapI18n';
import type { Store } from '@/types';
import './MerchantDashboardPage.css';

export const MerchantDashboardPage: React.FC = () => {
  const { user, isEmailVerified, sendVerification, reloadUser } = useAuth();

  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [reloadingUser, setReloadingUser] = useState(false);

  const lang: MapLanguage = getSavedMapLanguage();
  const t = getMerchantTexts(lang);

  const fetchStores = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getStoresByOwner(user.uid);
      if (res.error) {
        setError(res.error);
        setStores([]);
      } else {
        const userStores = res.data || [];
        setStores(userStores);
        if (userStores.length > 0 && !selectedStore) {
          setSelectedStore(userStores[0]);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Do‘konlarni yuklashda xatolik yuz berdi.');
      setStores([]);
    } finally {
      setLoading(false);
    }
  }, [user, selectedStore]);

  useEffect(() => {
    if (user && isEmailVerified) {
      fetchStores();
    } else {
      setLoading(false);
    }
  }, [user, isEmailVerified, fetchStores]);

  const handleSendVerification = async () => {
    setResendLoading(true);
    setResendMessage(null);
    try {
      const res = await sendVerification();
      if (res.success) {
        setResendMessage({ type: 'success', text: t.verificationSent });
      } else {
        setResendMessage({ type: 'error', text: res.error || t.verificationError });
      }
    } catch {
      setResendMessage({ type: 'error', text: t.verificationError });
    } finally {
      setResendLoading(false);
    }
  };

  const handleReloadUser = async () => {
    setReloadingUser(true);
    setResendMessage(null);
    try {
      const res = await reloadUser();
      if (res.isVerified) {
        setResendMessage({
          type: 'success',
          text: lang === 'ru' ? 'Email успешно подтвержден!' : 'Elektron pochta muvaffaqiyatli tasdiqlandi!',
        });
      } else {
        setResendMessage({
          type: 'error',
          text:
            lang === 'ru'
              ? 'Email еще не подтвержден. Проверьте почтовый ящик и перейдите по ссылке.'
              : 'Pochta hali tasdiqlanmagan. Iltimos, pochtangizdagi havolani bosing.',
        });
      }
    } finally {
      setReloadingUser(false);
    }
  };

  return (
    <div className="bq-merchant-page">
      <div className="container">
        {/* Page Top Header */}
        <div className="bq-merchant-header">
          <div>
            <div className="bq-merchant-tag">
              <StoreIcon size={14} />
              <span>{lang === 'ru' ? 'Бизнес-кабинет' : 'Biznes kabineti'}</span>
            </div>
            <h1 className="bq-merchant-title">{t.dashboardTitle}</h1>
            <p className="bq-merchant-subtitle">{t.dashboardSubtitle}</p>
          </div>

          {isEmailVerified && (
            <Link to="/merchant/apply">
              <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
                {t.applyButton}
              </Button>
            </Link>
          )}
        </div>

        {/* Email Verification Warning Barrier */}
        {!isEmailVerified && (
          <div className="bq-merchant-verify-card animate-fade-in" role="alert">
            <div className="bq-merchant-verify-icon">
              <AlertTriangle size={24} />
            </div>
            <div className="bq-merchant-verify-content">
              <h3>{t.emailNotVerifiedTitle}</h3>
              <p>{t.emailNotVerifiedDesc}</p>
              <div className="bq-merchant-verify-email">
                <Mail size={15} />
                <span>{user?.email}</span>
              </div>

              {resendMessage && (
                <div
                  className={`bq-merchant-verify-notice bq-merchant-verify-notice--${resendMessage.type}`}
                >
                  {resendMessage.type === 'success' ? (
                    <CheckCircle2 size={15} />
                  ) : (
                    <AlertTriangle size={15} />
                  )}
                  <span>{resendMessage.text}</span>
                </div>
              )}

              <div className="bq-merchant-verify-actions">
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleSendVerification}
                  isLoading={resendLoading}
                  leftIcon={<Mail size={14} />}
                >
                  {t.resendVerificationBtn}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleReloadUser}
                  isLoading={reloadingUser}
                  leftIcon={<RefreshCw size={14} />}
                >
                  {t.refreshStatusBtn}
                </Button>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    {lang === 'ru' ? 'Мой профиль' : 'Mening profilim'}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Main Stores Content Area (When Email is Verified) */}
        {isEmailVerified && (
          <>
            {/* Loading */}
            {loading && (
              <div className="bq-merchant-loading animate-fade-in">
                <div className="bq-spinner" />
                <p>{t.loadingStores}</p>
              </div>
            )}

            {/* Error */}
            {!loading && error && (
              <div className="bq-merchant-error animate-fade-in" role="alert">
                <AlertTriangle size={20} className="text-rose" />
                <div>
                  <h4>{lang === 'ru' ? 'Ошибка загрузки' : 'Yuklashda xatolik'}</h4>
                  <p>{error}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={fetchStores}>
                  {lang === 'ru' ? 'Повторить' : 'Qayta urinish'}
                </Button>
              </div>
            )}

            {/* Empty State: No stores registered */}
            {!loading && !error && stores.length === 0 && (
              <div className="bq-merchant-empty-card animate-fade-in">
                <div className="bq-merchant-empty-icon">
                  <StoreIcon size={44} />
                </div>
                <h3>{t.noStoresTitle}</h3>
                <p>{t.noStoresDesc}</p>
                <Link to="/merchant/apply">
                  <Button variant="primary" size="md" leftIcon={<Plus size={16} />}>
                    {t.applyButton}
                  </Button>
                </Link>
              </div>
            )}

            {/* Stores List and Selected Store Offers */}
            {!loading && !error && stores.length > 0 && (
              <div className="bq-merchant-dashboard-layout animate-fade-in">
                {/* Stores Column / Selection */}
                <div className="bq-merchant-stores-col">
                  <div className="bq-merchant-section-bar">
                    <h2 className="bq-merchant-col-title">{t.myStores} ({stores.length})</h2>
                    <Link to="/merchant/apply">
                      <Button variant="outline" size="sm" leftIcon={<Plus size={13} />}>
                        {lang === 'ru' ? 'Добавить' : 'Qo‘shish'}
                      </Button>
                    </Link>
                  </div>

                  <div className="bq-merchant-stores-grid">
                    {stores.map((st) => {
                      const isSelected = selectedStore?.id === st.id;
                      const isRealVerified = Boolean(st.isVerified && !st.isDemo);

                      return (
                        <div
                          key={st.id}
                          className={`bq-merchant-store-item ${
                            isSelected ? 'bq-merchant-store-item--selected' : ''
                          }`}
                          onClick={() => setSelectedStore(st)}
                        >
                          <div className="bq-merchant-store-item__head">
                            <h4 className="bq-merchant-store-item__name">{st.name}</h4>
                            <div className="bq-merchant-store-badges">
                              {isRealVerified ? (
                                <span className="bq-store-status-badge bq-store-status-badge--verified">
                                  <ShieldCheck size={11} />
                                  <span>{t.verifiedBadge}</span>
                                </span>
                              ) : (
                                <span className="bq-store-status-badge bq-store-status-badge--pending">
                                  <Clock size={11} />
                                  <span>{t.pendingBadge}</span>
                                </span>
                              )}

                              <span
                                className={`bq-store-status-badge bq-store-status-badge--${st.status || 'pending'}`}
                              >
                                {st.status === 'active'
                                  ? t.activeStatus
                                  : st.status === 'archived'
                                    ? t.archivedStatus
                                    : t.pendingStatus}
                              </span>
                            </div>
                          </div>

                          <div className="bq-merchant-store-item__body">
                            <div className="bq-merchant-meta-line">
                              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
                              <span>
                                {st.district ? `${st.district}, ` : ''}{st.city}, {st.address}
                              </span>
                            </div>
                            {st.phone && (
                              <div className="bq-merchant-meta-line">
                                <Phone size={13} className="text-slate-400 flex-shrink-0" />
                                <span>{st.phone}</span>
                              </div>
                            )}
                            <div className="bq-merchant-meta-line">
                              <span className="bq-merchant-cat-pill">{st.category}</span>
                              {st.openingHours && (
                                <span className="bq-merchant-hours-text">⏰ {st.openingHours}</span>
                              )}
                            </div>
                          </div>

                          <div className="bq-merchant-store-item__foot">
                            <span className="bq-merchant-select-prompt">
                              {isSelected ? `✓ ${t.selectedStoreBadge}` : t.selectStorePrompt}
                            </span>
                            <ChevronRight size={15} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected Store Inventory & Offers Detail */}
                {selectedStore && (
                  <div className="bq-merchant-details-col">
                    <MerchantOffersList store={selectedStore} lang={lang} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
