import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Calendar, Edit3, Check, LogOut, Database, Key, AlertTriangle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import { Input } from '@/components/common/Input';
import { Card } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import './ProfilePage.css';

export const ProfilePage: React.FC = () => {
  const { user, profile, logout, updateDisplayName, retryCreateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRetryingProfile, setIsRetryingProfile] = useState(false);

  useEffect(() => {
    if (profile?.displayName || user?.displayName) {
      setDisplayName(profile?.displayName || user?.displayName || '');
    }
  }, [profile?.displayName, user?.displayName]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setNameError(null);
    const trimmed = displayName.trim();

    if (trimmed.length < 2) {
      setNameError('Ism kamida 2 ta belgidan iborat bo‘lishi kerak.');
      return;
    }
    if (trimmed.length > 50) {
      setNameError('Ism 50 ta belgidan oshmasligi kerak.');
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
        text: 'Firestore profili muvaffaqiyatli tiklandi va ulandi!',
        type: 'success',
      });
    } else {
      setStatusMessage({
        text: res.error || 'Profilni tiklashda xatolik yuz berdi.',
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
        <div className="bq-profile-header">
          <div className="bq-profile-avatar-large">
            <User size={40} />
          </div>
          <div className="bq-profile-title-group">
            <div className="bq-profile-badge-row">
              <Badge variant="green" size="sm">
                Faol hisob
              </Badge>
              <Badge variant="gray" size="sm">
                2-Bosqich: Foydalanuvchi profili
              </Badge>
            </div>
            <h1 className="bq-profile-name">
              {profile?.displayName || user?.displayName || 'Foydalanuvchi'}
            </h1>
            <p className="bq-profile-email">{user?.email}</p>
          </div>
        </div>

        {/* Missing Firestore Profile Warning & Recovery */}
        {!profile && (
          <div
            className="bq-profile-alert bq-profile-alert--error"
            role="alert"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertTriangle size={20} />
              <span>
                Hisobingiz autentifikatsiyadan o‘tgan, biroq Cloud Firestore foydalanuvchi hujjati hali yaratilmagan yoki yuklanmadi.
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetryProfile}
              isLoading={isRetryingProfile}
              leftIcon={<RefreshCw size={14} />}
            >
              Hujjatni tiklash
            </Button>
          </div>
        )}

        {statusMessage && (
          <div
            className={`bq-profile-alert ${
              statusMessage.type === 'success' ? 'bq-profile-alert--success' : 'bq-profile-alert--error'
            }`}
            role="alert"
          >
            {statusMessage.text}
          </div>
        )}

        <div className="bq-profile-grid">
          {/* Personal Info Card */}
          <Card variant="default" padding="lg" className="bq-profile-card">
            <div className="bq-profile-card__head">
              <h2 className="bq-profile-card__title">Shaxsiy ma’lumotlar</h2>
              {!isEditing && (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Edit3 size={15} />}
                  onClick={() => {
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
                    <span>To‘liq ism</span>
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
                    <span>A’zo bo‘lgan sana</span>
                  </div>
                  <div className="bq-profile-info-val">{formattedDate}</div>
                </div>
              </div>
            )}
          </Card>

          {/* Security & Firestore Card */}
          <Card variant="default" padding="lg" className="bq-profile-card">
            <div className="bq-profile-card__head">
              <h2 className="bq-profile-card__title">Xavfsizlik &amp; Ma’lumotlar</h2>
              <Shield size={20} className="text-green" />
            </div>

            <div className="bq-profile-security-box">
              <div className="bq-profile-sec-row">
                <Key size={16} />
                <div>
                  <div className="bq-profile-sec-title">Firebase UID:</div>
                  <code className="bq-profile-uid">{user?.uid}</code>
                </div>
              </div>

              <div className="bq-profile-sec-row">
                <Database size={16} />
                <div>
                  <div className="bq-profile-sec-title">Cloud Firestore joylashuvi:</div>
                  <code className="bq-profile-uid">users/{user?.uid}</code>
                </div>
              </div>
            </div>

            <p className="bq-profile-security-note">
              Sizning profilingiz Firestore xavfsizlik qoidalari orqali himoyalangan. Faqat siz
              o‘zingizga tegishli hujjatni o‘qish va yangilash huquqiga egasiz.
            </p>

            <div className="bq-profile-logout-wrap">
              <Button
                variant="outline"
                size="md"
                onClick={logout}
                leftIcon={<LogOut size={16} />}
                className="bq-profile-logout-btn"
              >
                Akkauntdan chiqish
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};
