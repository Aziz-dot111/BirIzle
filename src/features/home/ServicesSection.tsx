import React, { useState } from 'react';
import {
  Wrench,
  Smartphone,
  Scissors,
  GraduationCap,
  Sparkles,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import './ServicesSection.css';

interface ServiceCategory {
  id: string;
  name: string;
  desc: string;
  examples: string[];
  icon: React.ReactNode;
}

const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'craftsmen',
    name: 'Usta xizmatlari',
    desc: 'Santexniklar, elektriklar, konditsioner va maishiy texnika ta’mirlash ustalari.',
    examples: ['Santexnika', 'Elektromontaj', 'Konditsioner o‘rnatish'],
    icon: <Wrench size={22} />,
  },
  {
    id: 'phone-repair',
    name: 'Telefon ta’miri',
    desc: 'Ekran almashtirish, batareya, dasturiy tiklash va servis markazlari.',
    examples: ['Ekran almashtirish', 'Akkumulyator', 'Dasturiy xizmat'],
    icon: <Smartphone size={22} />,
  },
  {
    id: 'salon-beauty',
    name: 'Sartaroshxona va go‘zallik',
    desc: 'Erkaklar va ayollar salonlari, stilistlar, manikyur va vizaj xizmatlari.',
    examples: ['Sartarosh', 'Go‘zallik saloni', 'Kosmetolog'],
    icon: <Scissors size={22} />,
  },
  {
    id: 'education',
    name: 'Ta’lim va repetitorlar',
    desc: 'Chet tillari, maktab fanlari, IT dasturlash va kasbiy tayyorlov kurslari.',
    examples: ['Ingliz tili', 'Matematika', 'Dasturlash asoslari'],
    icon: <GraduationCap size={22} />,
  },
  {
    id: 'other-services',
    name: 'Boshqa xizmatlar',
    desc: 'Uy tozalash (klining), yuk tashish, mebel yig‘ish va professional fotosessiya.',
    examples: ['Klining', 'Yuk tashish', 'Foto va videotasvir'],
    icon: <Sparkles size={22} />,
  },
];

export const ServicesSection: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceCategory | null>(null);

  return (
    <section id="services-section" className="bq-services-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header">
          <div className="bq-section-tag">Xizmatlar va ustalar</div>
          <h2 className="bq-section-title">Malakali mutaxassislar va servis xizmatlari</h2>
          <p className="bq-section-desc">
            BirQidir nafaqat tovarlar, balki kundalik hayotdagi zarur xizmatlarni topish va ularning
            narxlarini solishtirish imkoniyatini taqdim etadi.
          </p>
        </div>

        {/* Services Grid */}
        <div className="bq-services-grid">
          {SERVICE_CATEGORIES.map((srv) => (
            <Card
              key={srv.id}
              variant="default"
              hoverable
              padding="md"
              className="bq-service-category-card"
              onClick={() => setSelectedService(srv)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedService(srv);
                }
              }}
              aria-label={`${srv.name} xizmatlari`}
            >
              <div className="bq-service-category-card__header">
                <div className="bq-service-category-card__icon">{srv.icon}</div>
                <span className="bq-service-category-card__stage">3-Bosqich</span>
              </div>

              <h3 className="bq-service-category-card__title">{srv.name}</h3>
              <p className="bq-service-category-card__desc">{srv.desc}</p>

              <div className="bq-service-category-card__chips">
                {srv.examples.map((ex) => (
                  <span key={ex} className="bq-service-chip">
                    {ex}
                  </span>
                ))}
              </div>

              <div className="bq-service-category-card__footer">
                <span className="bq-service-category-card__link">Xizmatlarni ko‘rish</span>
                <ArrowRight size={14} className="bq-service-arrow" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Honest Service Notice Modal */}
      {selectedService && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setSelectedService(null)}>
          <div
            className="bq-service-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-modal-title"
          >
            <button
              type="button"
              className="bq-service-modal__close"
              onClick={() => setSelectedService(null)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className="bq-service-modal__icon">{selectedService.icon}</div>

            <h3 id="service-modal-title" className="bq-service-modal__title">
              {selectedService.name}
            </h3>
            <p className="bq-service-modal__desc">{selectedService.desc}</p>

            <div className="bq-service-modal__notice">
              <div className="bq-service-modal__notice-head">
                <Info size={16} />
                <span>Xizmatlar bazasi haqida:</span>
              </div>
              <p>
                Ustalar va xizmat ko‘rsatuvchi korxonalar profilini yaratish, reytinglar va buyurtma
                berish tizimi 3-bosqichda to‘liq ishga tushiriladi.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedService(null)}
              className="bq-service-modal__btn"
            >
              Tushunarli
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
