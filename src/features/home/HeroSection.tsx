import React from 'react';
import { SearchBar } from './SearchBar';
import { ShieldCheck, Tag, Zap, Scale, Store, Sparkles, TrendingDown } from 'lucide-react';
import './HeroSection.css';

export const HeroSection: React.FC = () => {
  return (
    <section className="bq-hero">
      <div className="container bq-hero__container">
        {/* Left Column: Headline, Search & Value Props */}
        <div className="bq-hero__left">
          {/* Marketplace Tag */}
          <div className="bq-hero__tag">
            <Sparkles size={14} className="text-emerald inline-icon" />
            <span>O‘zbekiston universal bozori • Narxlar va do‘konlar</span>
          </div>

          {/* Headline */}
          <h1 className="bq-hero__title">
            Kerakli mahsulot va xizmatlar — <span className="bq-hero__title-accent">bir joyda.</span>
          </h1>

          {/* Value Proposition */}
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
              <Tag size={16} className="bq-hero__prop-icon" />
              <span className="bq-hero__prop-text">Shaffof narxlar</span>
            </div>
            <div className="bq-hero__prop-divider" />
            <div className="bq-hero__prop-item">
              <Zap size={16} className="bq-hero__prop-icon" />
              <span className="bq-hero__prop-text">Tezkor qidiruv</span>
            </div>
            <div className="bq-hero__prop-divider" />
            <div className="bq-hero__prop-item">
              <ShieldCheck size={16} className="bq-hero__prop-icon" />
              <span className="bq-hero__prop-text">Tekshirilgan do‘konlar</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Product Showcase Collage */}
        <div className="bq-hero__right" aria-hidden="true">
          <div className="bq-hero__visual-frame">
            {/* Visual Image */}
            <img
              src="/hero-showcase.jpg"
              alt="BirQidir marketplace mahsulotlari"
              className="bq-hero__visual-img"
              loading="eager"
            />

            {/* Floating Live Comparison Badge (Top Left) */}
            <div className="bq-hero__float-card bq-hero__float-card--top">
              <div className="bq-hero__float-icon bq-hero__float-icon--emerald">
                <Scale size={18} />
              </div>
              <div className="bq-hero__float-content">
                <div className="bq-hero__float-label">
                  <TrendingDown size={12} className="text-emerald inline-icon" /> Eng yaxshi narx
                </div>
                <div className="bq-hero__float-val">4 200 000 so‘m</div>
                <div className="bq-hero__float-sub">12 ta do‘kondan tanlandi</div>
              </div>
            </div>

            {/* Floating Nearby Store Badge (Bottom Right) */}
            <div className="bq-hero__float-card bq-hero__float-card--bottom">
              <div className="bq-hero__float-icon bq-hero__float-icon--blue">
                <Store size={18} />
              </div>
              <div className="bq-hero__float-content">
                <div className="bq-hero__float-label">Yaqin do‘konda mavjud</div>
                <div className="bq-hero__float-val">1.2 km masofada</div>
                <div className="bq-hero__float-sub">Bugun borib xarid qilish</div>
              </div>
            </div>

            {/* Floating Verified Badge (Bottom Left) */}
            <div className="bq-hero__float-pill">
              <ShieldCheck size={15} className="text-emerald" />
              <span>100% Rasmiy do‘konlar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

