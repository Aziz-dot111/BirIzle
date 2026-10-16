import React, { useState } from 'react';
import { Building2, TrendingUp, Store, BarChart3, ArrowRight, Info, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import './BusinessCtaSection.css';

export const BusinessCtaSection: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <section id="business-section" className="bq-business-cta-section">
      <div className="container">
        <div className="bq-business-cta-card">
          <div className="bq-business-cta-content">
            <div className="bq-business-tag">
              <Store size={14} />
              <span>Sotuvchilar va biznes egalari uchun</span>
            </div>

            <h2 className="bq-business-title">
              Biznesingizni BirQidir’da rivojlantiring.
            </h2>

            <p className="bq-business-desc">
              Mahsulotlaringizni joylashtiring, do‘koningizni taniting va biznesingizni boshqaring.
            </p>

            {/* 3 Pillars */}
            <div className="bq-business-pillars">
              <div className="bq-business-pillar-item">
                <div className="bq-pillar-icon">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <h3 className="bq-pillar-title">Yangi mijozlar oqimi</h3>
                  <p className="bq-pillar-desc">Hududiy va narx qidiruvi orqali do‘koningizga xaridorlarni jalb qiling.</p>
                </div>
              </div>

              <div className="bq-business-pillar-item">
                <div className="bq-pillar-icon">
                  <Store size={16} />
                </div>
                <div>
                  <h3 className="bq-pillar-title">Onlayn do‘kon vitrinasi</h3>
                  <p className="bq-pillar-desc">Mahsulot katalogi, aloqa ma’lumotlari va ish tartibini e’lon qiling.</p>
                </div>
              </div>

              <div className="bq-business-pillar-item">
                <div className="bq-pillar-icon">
                  <BarChart3 size={16} />
                </div>
                <div>
                  <h3 className="bq-pillar-title">Savdo va zaxira boshqaruvi</h3>
                  <p className="bq-pillar-desc">Ombor, kassa va narxlarni boshqarish uchun qulay biznes kabineti.</p>
                </div>
              </div>
            </div>

            {/* CTA Action */}
            <div className="bq-business-actions">
              <Button
                variant="primary"
                size="lg"
                onClick={() => setModalOpen(true)}
                rightIcon={<ArrowRight size={17} />}
                className="bq-business-btn"
              >
                Biznes uchun
              </Button>
              <span className="bq-business-stage-note">
                Sotuvchilar kabineti 4-bosqichda to‘liq ulanadi
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Honest Roadmap Notice Modal */}
      {modalOpen && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setModalOpen(false)}>
          <div
            className="bq-biz-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="biz-modal-title"
          >
            <button
              type="button"
              className="bq-biz-modal__close"
              onClick={() => setModalOpen(false)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className="bq-biz-modal__icon">
              <Building2 size={24} />
            </div>

            <h3 id="biz-modal-title" className="bq-biz-modal__title">
              BirQidir Biznes Portali
            </h3>

            <p className="bq-biz-modal__desc">
              Sotuvchilar va xizmat ko‘rsatuvchi korxonalar uchun maxsus boshqaruv paneli
              loyihaning 4-bosqichida ishga tushiriladi.
            </p>

            <div className="bq-biz-modal__plan">
              <div className="bq-biz-modal__plan-head">
                <Info size={16} />
                <span>Rejalashtirilgan imkoniyatlar:</span>
              </div>
              <ul className="bq-biz-modal__plan-list">
                <li>• Do‘kon profili va rasmiy verifikatsiyadan o‘tish</li>
                <li>• Mahsulotlar katalogini Excel yoki 1C orqali yuklash</li>
                <li>• Narxlar va zaxiralarni real vaqtda yangilash</li>
                <li>• Xaridorlar statistikasi va savdo dinamikasi tahlili</li>
              </ul>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setModalOpen(false)}
              className="bq-biz-modal__btn"
            >
              Tushunarli
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
