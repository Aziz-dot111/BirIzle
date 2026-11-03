import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  Edit3,
  Check,
  LogOut,
  AlertTriangle,
  RefreshCw,
  PartyPopper,
  MailCheck,
  Send,
  ShieldCheck,
  Heart,
  Clock,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import './ProfilePage.css';

type ProfileTab = 'info' | 'favorites' | 'history';

export const ProfilePage: React.FC = () => {
  const {
    user,
    profile,
    logout,
    isEmailVerified,
    sendVerification,
    reloadUser,
    updateDisplayName,
    retryCreateProfile,
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { history: searchHistory, removeFromHistory, clearHistory } = useSearchHistory();
  const { favoriteProducts, favoriteStores, totalFavorites } = useFavorites();

  const [activeTab, setActiveTab] = useState<ProfileTab>('info');
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    text: string;
    type: 'success' | 'error';
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const isNewlyRegistered = Boolean(
    (location.state as { newlyRegistered?: boolean })?.newlyRegistered
  );

  useEffect(() => {
    if (profile?.displayName || user?.displayName) {
      setDisplayName(profile?.displayName || user?.displayName || '');
    }
  }, [profile?.displayName, user?.displayName]);

  // 60-second cooldown timer for resending verification email
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [resendCooldown]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await logout();
    navigate('/', { replace: true });
  };

  const handleResendEmail = async () => {
    if (resendCooldown > 0) return;
    setIsResendingEmail(true);
    setStatusMessage(null);
    const res = await sendVerification();
    setIsResendingEmail(false);
    if (res.success) {
      setResendCooldown(60);
      setStatusMessage({
        text: "Tasdiqlash havolasi elektron pochtangizga qayta yuborildi. Iltimos, pochtangizni tekshiring.",
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: res.error || "Xatni yuborishda xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.",
        type: 'error',
      });
    }
  };

  const handleCheckVerification = async () => {
    setIsCheckingVerification(true);
    setStatusMessage(null);
    const res = await reloadUser();
    setIsCheckingVerification(false);
    if (res.isVerified) {
      setStatusMessage({
        text: "Tabriklaymiz! Elektron pochtangiz tasdiqlandi va profilingiz to'liq faollashtirildi.",
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: "Elektron pochta hali tasdiqlanmagan. Iltimos, pochtangizdagi havolani ochganingizdan so'ng qayta bosing.",
        type: 'error',
      });
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!isEmailVerified) {
      setStatusMessage({
        text: "Profil ma'lumotlarini tahrirlash uchun avval elektron pochtangizni tasdiqlang.",
        type: 'error',
      });
      return;
    }

    setNameError(null);
    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
      setNameError("Ism kamida 2 ta belgidan iborat bo'lishi kerak.");
      return;
    }
    if (trimmed.length > 50) {
      setNameError("Ism 50 ta belgidan oshmasligi kerak.");
      return;
    }

    setIsSaving(true);
    setStatusMessage(null);

    const res = await updateDisplayName(trimmed);
    setIsSaving(false);

    if (!res.success) {
      setStatusMessage({
        text: res.error || 'Profilni yangilashda xatolik yuz berdi.',
        type: 'error',
      });
    } else {
      setStatusMessage({
        text: 'Ism va familiya muvaffaqiyatli yangilandi!',
        type: 'success',
      });
      setIsEditing(false);
    }
  };

  const handleRetryProfile = async () => {
    setIsRetryingProfile(true);
    setStatusMessage(null);
    const res = await retryCreateProfile();
    setIsRetryingProfile(false);
    if (res.success) {
      setStatusMessage({
        text: "Profil ma'lumotlari muvaffaqiyatli tiklandi!",
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: res.error || "Profilni tiklashda xatolik yuz berdi.",
        type: 'error',
      });
    }
  };

  const formattedDate = profile?.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : user?.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('uz-UZ', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Yaqinda';

  return (
    <div className="bq-profile-page">
      <div className="container">
        <div className="bq-profile-content-wrap">
          {/* Profile Header */}
          <div className="bq-profile-header">
            <div className="bq-profile-header-left">
              <div className="bq-profile-avatar-large">
                <User size={38} />
              </div>
              <div className="bq-profile-title-group">
                <div className="bq-profile-badge-row">
                  <Badge variant="green" size="sm">
                    Faol hisob
                  </Badge>
                  {isEmailVerified ? (
                    <Badge variant="green" size="sm" icon={<ShieldCheck size={12} />}>
                      Email tasdiqlangan
                    </Badge>
                  ) : (
                    <Badge variant="amber" size="sm">
                      Email tasdiqlanmagan
                    </Badge>
                  )}
                </div>
                <h1 className="bq-profile-name">
                  {profile?.displayName || user?.displayName || 'Foydalanuvchi'}
                </h1>
                <p className="bq-profile-email">{user?.email}</p>
              </div>
            </div>

            <div className="bq-profile-header-actions">
              <Button
                variant="outline"
                size="md"
                onClick={handleLogout}
                isLoading={isLoggingOut}
                disabled={isLoggingOut}
                leftIcon={<LogOut size={16} />}
                className="bq-profile-logout-btn"
              >
                Akkauntdan chiqish
              </Button>
            </div>
          </div>

          {/* Email Verification Alert Banner */}
          {!isEmailVerified && (
            <div className="bq-profile-alert bq-profile-alert--warning animate-fade-in" role="alert">
              <div className="bq-verify-banner-content">
                <div className="bq-verify-banner-text">
                  <div className="bq-verify-banner-title">
                    <MailCheck size={18} />
                    <span>Elektron pochta manzilingiz hali tasdiqlanmagan</span>
                  </div>
                  <p className="bq-verify-banner-desc">
                    Profilingizni xavfsiz boshqarish va to'liq imkoniyatlardan foydalanish uchun
                    elektron pochtangizga yuborilgan tasdiqlash havolasini bosing.
                  </p>
                </div>
                <div className="bq-verify-banner-actions">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleCheckVerification}
                    isLoading={isCheckingVerification}
                    leftIcon={<RefreshCw size={14} />}
                  >
                    Havolani bosdim (Holatni yangilash)
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendEmail}
                    isLoading={isResendingEmail}
                    disabled={resendCooldown > 0 || isResendingEmail}
                    leftIcon={<Send size={14} />}
                  >
                    {resendCooldown > 0 ? `${resendCooldown}s kuting` : 'Xatni qayta yuborish'}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {isNewlyRegistered && (
            <div
              className="bq-profile-alert bq-profile-alert--success"
              role="status"
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
            >
              <PartyPopper size={20} />
              <span>
                Tabriklaymiz! BirQidir platformasida yangi akkauntingiz muvaffaqiyatli yaratildi.
              </span>
            </div>
          )}

          {/* Missing Profile Warning & Recovery */}
          {!profile && isEmailVerified && (
            <div
              className="bq-profile-alert bq-profile-alert--error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <AlertTriangle size={20} />
                <span>
                  Profil ma'lumotlarini yuklashda uzilish yuz berdi. Iltimos, ma'lumotlarni
                  yangilab ko'ring.
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRetryProfile}
                isLoading={isRetryingProfile}
                leftIcon={<RefreshCw size={14} />}
              >
                Ma'lumotlarni tiklash
              </Button>
            </div>
          )}

          {statusMessage && (
            <div
              className={`bq-profile-alert ${
                statusMessage.type === 'success'
                  ? 'bq-profile-alert--success'
                  : 'bq-profile-alert--error'
              }`}
              role="alert"
            >
              {statusMessage.text}
            </div>
          )}

          {/* Profile Tabs */}
          <div className="bq-profile-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'info'}
              className={`bq-profile-tab ${activeTab === 'info' ? 'bq-profile-tab--active' : ''}`}
              onClick={() => setActiveTab('info')}
            >
              <User size={16} />
              Ma'lumotlar
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'favorites'}
              className={`bq-profile-tab ${activeTab === 'favorites' ? 'bq-profile-tab--active' : ''}`}
              onClick={() => setActiveTab('favorites')}
            >
              <Heart size={16} />
              Saqlangan
              {totalFavorites > 0 && (
                <span className="bq-profile-tab__badge">{totalFavorites}</span>
              )}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'history'}
              className={`bq-profile-tab ${
                activeTab === 'history' ? 'bq-profile-tab--active' : ''
              }`}
              onClick={() => setActiveTab('history')}
            >
              <Clock size={16} />
              Qidiruv tarixi
              {searchHistory.length > 0 && (
                <span className="bq-profile-tab__badge">{searchHistory.length}</span>
              )}
            </button>
          </div>

          {/* TAB: Personal Information */}
          {activeTab === 'info' && (
            <Card variant="default" padding="lg" className="bq-profile-card animate-fade-in">
              <div className="bq-profile-card__head">
                <h2 className="bq-profile-card__title">Shaxsiy ma'lumotlar</h2>
                {!isEditing && (
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit3 size={15} />}
                    onClick={() => {
                      if (!isEmailVerified) {
                        setStatusMessage({
                          text: "Profilni tahrirlash uchun avval elektron pochtangizni tasdiqlang.",
                          type: 'error',
                        });
                        return;
                      }
                      setDisplayName(profile?.displayName || user?.displayName || '');
                      setNameError(null);
                      setIsEditing(true);
                    }}
                  >
                    Tahrirlash
                  </Button>
                )}
              </div>

              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="bq-profile-edit-form">
                  <Input
                    label="Ism va familiya"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (nameError) setNameError(null);
                    }}
                    placeholder="Ismingizni kiriting"
                    error={nameError || undefined}
                    required
                    autoFocus
                  />
                  <div className="bq-profile-edit-actions">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDisplayName(profile?.displayName || user?.displayName || '');
                        setNameError(null);
                        setIsEditing(false);
                      }}
                      disabled={isSaving}
                    >
                      Bekor qilish
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="sm"
                      isLoading={isSaving}
                      disabled={isSaving}
                      leftIcon={<Check size={16} />}
                    >
                      Saqlash
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="bq-profile-info-list">
                  <div className="bq-profile-info-item">
                    <div className="bq-profile-info-label">
                      <User size={16} />
                      <span>To'liq ism</span>
                    </div>
                    <div className="bq-profile-info-val">
                      {profile?.displayName || user?.displayName || 'Kiritilmagan'}
                    </div>
                  </div>

                  <div className="bq-profile-info-item">
                    <div className="bq-profile-info-label">
                      <Mail size={16} />
                      <span>Elektron pochta</span>
                    </div>
                    <div className="bq-profile-info-val">{user?.email}</div>
                  </div>

                  <div className="bq-profile-info-item">
                    <div className="bq-profile-info-label">
                      <Calendar size={16} />
                      <span>A'zo bo'lgan sana</span>
                    </div>
                    <div className="bq-profile-info-val">{formattedDate}</div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* TAB: Favorites */}
          {activeTab === 'favorites' && (
            <div className="bq-profile-tab-content animate-fade-in">
              <div className="bq-profile-tab-content__header">
                <h2 className="bq-profile-card__title">Saqlangan</h2>
                <Link to="/favorites" className="bq-profile-tab-content__link">
                  Hammasini ko'rish
                </Link>
              </div>

              {totalFavorites === 0 ? (
                <div className="bq-profile-empty-state">
                  <Heart size={32} className="bq-profile-empty-state__icon" />
                  <p>Hali hech narsa saqlanmagan.</p>
                  <Link to="/search" className="bq-profile-empty-state__action">
                    Mahsulotlarni qidirish
                  </Link>
                </div>
              ) : (
                <>
                  <div className="bq-profile-favs-grid">
                    {favoriteProducts.slice(0, 4).map((p) => (
                      <Link
                        key={p.id}
                        to={`/search?q=${encodeURIComponent(p.name)}&scope=products`}
                        className="bq-profile-fav-chip"
                      >
                        <Search size={13} />
                        {p.name}
                      </Link>
                    ))}
                    {favoriteStores.slice(0, 4).map((s) => (
                      <span key={s.id} className="bq-profile-fav-chip bq-profile-fav-chip--store">
                        <Heart size={13} />
                        {s.name}
                      </span>
                    ))}
                  </div>
                  <Link to="/favorites" className="bq-profile-tab-content__view-all">
                    Hammasini ko'rish ({totalFavorites}) →
                  </Link>
                </>
              )}
            </div>
          )}

          {/* TAB: Search History */}
          {activeTab === 'history' && (
            <div className="bq-profile-tab-content animate-fade-in">
              <div className="bq-profile-tab-content__header">
                <h2 className="bq-profile-card__title">Qidiruv tarixi</h2>
                {searchHistory.length > 0 && (
                  <button
                    type="button"
                    className="bq-profile-tab-content__clear"
                    onClick={() => {
                      if (confirm("Qidiruv tarixini o'chirmoqchimisiz?")) clearHistory();
                    }}
                  >
                    <Trash2 size={14} />
                    Tozalash
                  </button>
                )}
              </div>

              {searchHistory.length === 0 ? (
                <div className="bq-profile-empty-state">
                  <Clock size={32} className="bq-profile-empty-state__icon" />
                  <p>Qidiruv tarixi bo'sh.</p>
                </div>
              ) : (
                <div className="bq-profile-history-list">
                  {searchHistory.map((entry) => (
                    <div key={entry.query} className="bq-profile-history-item">
                      <Link
                        to={`/search?q=${encodeURIComponent(entry.query)}&scope=products`}
                        className="bq-profile-history-item__query"
                      >
                        <Clock size={15} className="bq-profile-history-item__icon" />
                        <span>{entry.query}</span>
                      </Link>
                      <span className="bq-profile-history-item__date">
                        {new Date(entry.searchedAt).toLocaleDateString('uz-UZ', {
                          day: '2-digit',
                          month: 'short',
                        })}
                      </span>
                      <button
                        type="button"
                        className="bq-profile-history-item__remove"
                        onClick={() => removeFromHistory(entry.query)}
                        aria-label={`${entry.query}ni tarixdan o'chirish`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
