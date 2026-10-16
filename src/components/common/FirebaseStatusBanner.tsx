import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Database, X } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import './FirebaseStatusBanner.css';

export const FirebaseStatusBanner: React.FC = () => {
  const { isConfigured, configStatus } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // In production, we don't display debug banners unless needed
  const isDev = import.meta.env.DEV;

  if (isDismissed || (!isDev && isConfigured)) {
    return null;
  }

  return (
    <div className={`bq-firebase-banner ${isConfigured ? 'bq-firebase-banner--ready' : 'bq-firebase-banner--unconfigured'}`}>
      <div className="container bq-firebase-banner__inner">
        <div className="bq-firebase-banner__left">
          {isConfigured ? (
            <CheckCircle2 size={18} className="bq-firebase-banner__icon text-green" />
          ) : (
            <AlertTriangle size={18} className="bq-firebase-banner__icon text-amber" />
          )}
          <span className="bq-firebase-banner__message">
            {isConfigured ? (
              <>
                <strong>Firebase:</strong> Sozlangan {configStatus.projectId && `(Loyiha: ${configStatus.projectId})`}
              </>
            ) : (
              <>
                <strong>1-Bosqich Statusi:</strong> Firebase sozlamalari kutilmoqda. Sayt qisman rejimda ishlamoqda.
              </>
            )}
          </span>
        </div>

        <div className="bq-firebase-banner__actions">
          {!isConfigured && (
            <button
              type="button"
              className="bq-firebase-banner__details-btn"
              onClick={() => setIsOpen(!isOpen)}
              aria-expanded={isOpen}
            >
              <Database size={14} />
              <span>{isOpen ? 'Yashirish' : 'Yo‘riqnoma'}</span>
              {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          )}

          <button
            type="button"
            className="bq-firebase-banner__close"
            onClick={() => setIsDismissed(true)}
            aria-label="Ogohlantirishni yopish"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isConfigured && isOpen && (
        <div className="container bq-firebase-banner__details">
          <p className="bq-firebase-banner__details-desc">
            Autentifikatsiya va Firestore ishlashi uchun <code>.env.example</code> faylidan nusxa olib,
            <code>.env.local</code> nomli fayl yarating va quyidagi o‘zgaruvchilarni Firebase konsolidan ko‘chirib joylang:
          </p>
          <ul className="bq-firebase-banner__keys-list">
            {configStatus.missingKeys.map((key) => (
              <li key={key}>
                <code>{key}</code>
              </li>
            ))}
          </ul>
          <p className="bq-firebase-banner__details-note">
            Eslatma: Bosh sahifa va barcha vizual interfeys Firebase sozlanmasdan ham to‘liq ishlaydi.
          </p>
        </div>
      )}
    </div>
  );
};
