import React from 'react';
import { Link } from 'react-router-dom';
import { SearchBar } from './SearchBar';
import { ShieldCheck, Tag, Zap, Scale, Store, Sparkles, TrendingDown, Layers } from 'lucide-react';
import { Button } from '@/components/common/Button';
import './HeroSection.css';

export const HeroSection: React.FC = () => {
  return (
    <section className="bq-hero">
      <div className="container bq-hero__container">
        {/* Left Column: Headline, Search & Value Props */}
        <div className="bq-hero__left">
          {/* Marketplace Tag */}
          <div className="bq-hero__tag">
            <Sparkles size={14} className="text-purple inline-icon" />
            <span>OneShop universal bozori • O‘zbekiston</span>
          </div>

          {/* Headline */}
          <h1 className="bq-hero__title">
            Kerakli mahsulot va eng qulay narxlar — <span className="bq-hero__title-accent">OneShop’da.</span>
          </h1>

          {/* Value Proposition */}
          <p className="bq-hero__subtitle">
            Do‘konlarni toping, mahsulot narxlarini solishtiring va eng ma’qul taklifni oson tanlang.
          </p>

          {/* Prominent Search Bar */}
          <div className="bq-hero__search-area">
            <SearchBar />
          </div>

          {/* Quick CTA Actions */}
          <div className="bq-hero__cta-row">
            <Link to="/search">
              <Button variant="primary" size="md" leftIcon={<Layers size={16} />}>
                Katalogni ko‘rish
              </Button>
            </Link>
            <Link to="/map">
              <Button variant="secondary" size="md" leftIcon={<Store size={16} />}>
                Yaqin do‘konlar
              </Button>
            </Link>
          </div>

          {/* Trust Badges - Restrained and Genuine based on real platform features */}
          <div className="bq-hero__value-props">
            <div className="bq-hero__prop-item">
              <Tag size={16} className="bq-hero__prop-icon text-purple" />
              <span className="bq-hero__prop-text">Shaffof narxlar</span>
            </div>
            <div className="bq-hero__prop-divider" />
            <div className="bq-hero__prop-item">
              <Zap size={16} className="bq-hero__prop-icon text-purple" />
              <span className="bq-hero__prop-text">Tezkor qidiruv</span>
            </div>
            <div className="bq-hero__prop-divider" />
            <div className="bq-hero__prop-item">
              <ShieldCheck size={16} className="bq-hero__prop-icon text-green" />
              <span className="bq-hero__prop-text">Tekshirilgan do‘konlar</span>
            </div>
          </div>
        </div>

        {/* Right Column: Visual Product Showcase Collage */}
        <div className="bq-hero__right" aria-hidden="true">
          <div className="bq-hero__visual-frame">
            {/* Visual Image from existing assets */}
            <img
              src="/hero-showcase.jpg"
              alt="OneShop marketplace mahsulotlari"
              className="bq-hero__visual-img"
              loading="eager"
            />

            {/* Floating Live Comparison Badge (Top Left) */}
            <div className="bq-hero__float-card bq-hero__float-card--top">
              <div className="bq-hero__float-icon bq-hero__float-icon--purple">
                <Scale size={18} />
              </div>
              <div className="bq-hero__float-content">
                <div className="bq-hero__float-label">
                  <TrendingDown size={12} className="text-purple inline-icon" /> Eng yaxshi narx
                </div>
                <div className="bq-hero__float-val">Do‘konlar solishtiruvi</div>
                <div className="bq-hero__float-sub">Haqiqiy narxlar jadvali</div>
              </div>
            </div>

            {/* Floating Nearby Store Badge (Bottom Right) */}
            <div className="bq-hero__float-card bq-hero__float-card--bottom">
              <div className="bq-hero__float-icon bq-hero__float-icon--blue">
                <Store size={18} />
              </div>
              <div className="bq-hero__float-content">
                <div className="bq-hero__float-label">Do‘konlar xaritasi</div>
                <div className="bq-hero__float-val">Geolokatsiya va masofa</div>
                <div className="bq-hero__float-sub">Do‘kon bilan tezkor aloqa</div>
              </div>
            </div>

            {/* Floating Verified Badge (Bottom Left) */}
            <div className="bq-hero__float-pill">
              <ShieldCheck size={15} className="text-green" />
              <span>100% Rasmiy hamkor do‘konlar</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
