import React from 'react';
import { Link } from 'react-router-dom';
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
} from 'lucide-react';
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
    itemCountDesc: 'Televizorlar, audio va aqlli gadjetlar',
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
  return (
    <section id="categories-section" className="bq-categories-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header">
          <div className="bq-section-tag">
            <Layers size={14} className="inline-icon" />
            <span>Mahsulotlar katalogi</span>
          </div>
          <h2 className="bq-section-title">Ommabop toifalar bo‘yicha ko‘rib chiqing</h2>
          <p className="bq-section-desc">
            Bozor va do‘konlardagi tovarlarni toifalar orqali oson qidiring va eng yaxshi narxlarni solishtiring.
          </p>
        </div>

        {/* 10-Item Category Grid */}
        <div className="bq-category-grid">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              to={`/search?category=${encodeURIComponent(cat.id)}`}
              className="bq-cat-card"
              aria-label={`${cat.name} toifasi: ${cat.itemCountDesc}`}
            >
              <div className="bq-cat-card__icon-box">
                {cat.icon}
              </div>
              <div className="bq-cat-card__content">
                <h3 className="bq-cat-card__title">{cat.name}</h3>
                <p className="bq-cat-card__desc">{cat.itemCountDesc}</p>
              </div>
              <div className="bq-cat-card__action" aria-hidden="true">
                <ArrowRight size={16} className="bq-cat-card__arrow" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
