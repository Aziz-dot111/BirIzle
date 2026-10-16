import React from 'react';
import { SearchBar } from './SearchBar';
import { ShieldCheck, Tag, Zap } from 'lucide-react';
import './HeroSection.css';

export const HeroSection: React.FC = () => {
  return (
    <section className="bq-hero">
      <div className="container bq-hero__container">
        {/* Restrained Tag */}
        <div className="bq-hero__tag">
          O‘zbekiston universal bozori
        </div>

        {/* Headline */}
        <h1 className="bq-hero__title">
          Kerakli mahsulot va xizmatlar — <span className="bq-hero__title-accent">bir joyda.</span>
        </h1>

        {/* Supporting Text */}
        <p className="bq-hero__subtitle">
          Do‘konlarni toping, narxlarni solishtiring va o‘zingizga mos taklifni tanlang.
        </p>

        {/* Prominent Search Bar */}
        <div className="bq-hero__search-area">
          <SearchBar />
        </div>

        {/* Trust Badges - Restrained and Clean */}
        <div className="bq-hero__value-props">
          <div className="bq-hero__prop-item">
            <Tag size={17} className="bq-hero__prop-icon" />
            <span className="bq-hero__prop-text">Shaffof narxlar</span>
          </div>
          <div className="bq-hero__prop-divider" />
          <div className="bq-hero__prop-item">
            <Zap size={17} className="bq-hero__prop-icon" />
            <span className="bq-hero__prop-text">Tezkor topish</span>
          </div>
          <div className="bq-hero__prop-divider" />
          <div className="bq-hero__prop-item">
            <ShieldCheck size={17} className="bq-hero__prop-icon" />
            <span className="bq-hero__prop-text">Tekshirilgan do‘konlar</span>
          </div>
        </div>
      </div>
    </section>
  );
};
