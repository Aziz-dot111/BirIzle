import React from 'react';
import {
  MapPin,
  CheckCircle,
  Clock,
  Phone,
  Navigation,
  Layers,
  Map,
  ShieldCheck,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import './NearbyStoresSection.css';

export const NearbyStoresSection: React.FC = () => {
  return (
    <section id="stores-section" className="bq-stores-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header">
          <div className="bq-section-tag">
            <MapPin size={14} />
            <span>Mahalliy do‘konlar</span>
          </div>
          <h2 className="bq-section-title">Yaqin atrofdagi do‘konlar va servis markazlari</h2>
          <p className="bq-section-desc">
            Xaridingizni tezlashtirish uchun o‘zingizga eng yaqin joylashgan savdo nuqtalarini toping,
            tovarlar mavjudligini tekshiring va bevosita borib xarid qiling.
          </p>
        </div>

        {/* 6 Capabilities Cards */}
        <div className="bq-stores-capabilities-grid">
          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <ShieldCheck size={20} />
            </div>
            <h3 className="bq-capability-title">Tekshirilgan biznes maqomi</h3>
            <p className="bq-capability-desc">
              Har bir do‘kon soliq va yuridik ma’lumotlari bo‘yicha tekshirilib, verifikatsiya belgisi beriladi.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <Navigation size={20} />
            </div>
            <h3 className="bq-capability-title">Masofani aniqlash</h3>
            <p className="bq-capability-desc">
              Siz turgan joyga nisbatan eng yaqin do‘konlar masofa (km) tartibida saralanadi.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <Layers size={20} />
            </div>
            <h3 className="bq-capability-title">Omborda tovar mavjudligi</h3>
            <p className="bq-capability-desc">
              Do‘konga borishdan oldin kerakli mahsulot zaxirada bor yoki yo‘qligini onlayn biling.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <Phone size={20} />
            </div>
            <h3 className="bq-capability-title">To‘g‘ridan-to‘g‘ri aloqa</h3>
            <p className="bq-capability-desc">
              Do‘kon sotuvchilari bilan telefon yoki Telegram orqali to‘g‘ridan-to‘g‘ri bog‘lanish.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <Clock size={20} />
            </div>
            <h3 className="bq-capability-title">Ish vaqti va manzillar</h3>
            <p className="bq-capability-desc">
              Dam olish kunlari va tanaffuslarsiz ishlaydigan do‘konlar jadvali aniq ko‘rsatiladi.
            </p>
          </Card>

          <Card variant="default" padding="md" className="bq-capability-card">
            <div className="bq-capability-icon">
              <Map size={20} />
            </div>
            <h3 className="bq-capability-title">Interaktiv xarita</h3>
            <p className="bq-capability-desc">
              Shahar xaritasida barcha do‘konlar va xizmat ko‘rsatuvchi nuqtalar lokatsiyasini ko‘rish.
            </p>
          </Card>
        </div>

        {/* Clean Honest Status Box */}
        <div className="bq-stores-status-box">
          <div className="bq-stores-status-icon">
            <CheckCircle size={20} />
          </div>
          <div className="bq-stores-status-text">
            <strong>Bosqich holati:</strong> Geolokatsiya va interaktiv xarita moduli 4-bosqichda
            do‘konlar reyestri bilan birgalikda ulanadi. Hozirda soxta do‘konlar ko‘rsatilmaydi.
          </div>
        </div>
      </div>
    </section>
  );
};
