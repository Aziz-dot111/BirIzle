import React, { useState } from 'react';
import {
  Tv,
  Laptop,
  Smartphone,
  Shirt,
  Home,
  Package,
  Hammer,
  Wrench,
  Sparkles,
  Layers,
  ArrowRight,
  Info,
  X,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import './CategoryGrid.css';

interface CategoryItem {
  id: string;
  name: string;
  itemCountDesc: string;
  icon: React.ReactNode;
}

const CATEGORIES: CategoryItem[] = [
  {
    id: 'electronics',
    name: 'Elektronika',
    itemCountDesc: 'Televizorlar, audio va gadjetlar',
    icon: <Tv size={22} />,
  },
  {
    id: 'computers',
    name: 'Kompyuterlar',
    itemCountDesc: 'Noutbuklar, kompyuter qismlari va monitorlar',
    icon: <Laptop size={22} />,
  },
  {
    id: 'phones',
    name: 'Telefonlar',
    itemCountDesc: 'Smartfonlar, planshetlar va aksessuarlar',
    icon: <Smartphone size={22} />,
  },
  {
    id: 'clothing',
    name: 'Kiyim-kechak',
    itemCountDesc: 'Erkaklar, ayollar va bolalar liboslari',
    icon: <Shirt size={22} />,
  },
  {
    id: 'home',
    name: 'Uy jihozlari',
    itemCountDesc: 'Mebel, yoritish va interyer buyumlari',
    icon: <Home size={22} />,
  },
  {
    id: 'appliances',
    name: 'Maishiy texnika',
    itemCountDesc: 'Muzlatgich, kir yuvish va konditsioner',
    icon: <Package size={22} />,
  },
  {
    id: 'construction',
    name: 'Qurilish mollari',
    itemCountDesc: 'Asboblar, santexnika va qorishmalar',
    icon: <Hammer size={22} />,
  },
  {
    id: 'auto',
    name: 'Avto ehtiyot qismlari',
    itemCountDesc: 'Akkumulyator, moylar va ehtiyot qismlar',
    icon: <Wrench size={22} />,
  },
  {
    id: 'beauty',
    name: 'Go‘zallik va parvarish',
    itemCountDesc: 'Parfyumeriya, pardoz va shaxsiy gigiyena',
    icon: <Sparkles size={22} />,
  },
  {
    id: 'others',
    name: 'Boshqa mahsulotlar',
    itemCountDesc: 'Sport, kitoblar, kanselyariya va boshqalar',
    icon: <Layers size={22} />,
  },
];

export const CategoryGrid: React.FC = () => {
  const [selectedCat, setSelectedCat] = useState<CategoryItem | null>(null);

  return (
    <section id="categories-section" className="bq-categories-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header">
          <div className="bq-section-tag">Mahsulotlar katalogi</div>
          <h2 className="bq-section-title">Ommabop toifalar bo‘yicha ko‘rib chiqing</h2>
          <p className="bq-section-desc">
            Bozor va do‘konlardagi tovarlarni toifalar orqali oson qidiring va eng yaxshi narxlarni solishtiring.
          </p>
        </div>

        {/* 10-Item Category Grid */}
        <div className="bq-category-grid">
          {CATEGORIES.map((cat) => (
            <Card
              key={cat.id}
              variant="default"
              hoverable
              padding="md"
              className="bq-cat-card"
              onClick={() => setSelectedCat(cat)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setSelectedCat(cat)}
              }}
              aria-label={`${cat.name} toifasi`}
            >
              <div className="bq-cat-card__icon-box">
                {cat.icon}
              </div>
              <div className="bq-cat-card__content">
                <h3 className="bq-cat-card__title">{cat.name}</h3>
                <p className="bq-cat-card__desc">{cat.itemCountDesc}</p>
              </div>
              <div className="bq-cat-card__action">
                <ArrowRight size={15} className="bq-cat-card__arrow" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Honest Preview Modal */}
      {selectedCat && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setSelectedCat(null)}>
          <div
            className="bq-cat-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cat-modal-title"
          >
            <button
              type="button"
              className="bq-cat-modal__close"
              onClick={() => setSelectedCat(null)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className="bq-cat-modal__icon">
              {selectedCat.icon}
            </div>

            <h3 id="cat-modal-title" className="bq-cat-modal__title">
              {selectedCat.name}
            </h3>
            <p className="bq-cat-modal__desc">{selectedCat.itemCountDesc}</p>

            <div className="bq-cat-modal__notice">
              <div className="bq-cat-modal__notice-head">
                <Info size={16} />
                <span>Toifa qidiruvi haqida:</span>
              </div>
              <p>
                Ushbu toifadagi tovarlar ro‘yxati, do‘konlar inventari va narxlarni real vaqtda solishtirish
                keyingi 2-bosqichda mahsulotlar ma’lumotlar bazasi ulangach faollashadi.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setSelectedCat(null)}
              className="bq-cat-modal__btn"
            >
              Tushunarli
            </Button>
          </div>
        </div>
      )}
    </section>
  );
};
