import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Database, Layers, MapPin, Store, Heart } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import './Footer.css';

export const Footer: React.FC = () => {
  const { isConfigured, configStatus } = useAuth();
  const currentYear = new Date().getFullYear();

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <footer className="bq-footer">
      <div className="container">
        {/* Main Footer Columns */}
        <div className="bq-footer__top">
          {/* Brand Info */}
          <div className="bq-footer__brand-col">
            <Link to="/" className="bq-footer__brand">
              <div className="bq-footer__logo-badge">
                <svg viewBox="0 0 36 36" fill="none" className="bq-footer__logo-svg" aria-hidden="true">
                  <rect width="36" height="36" rx="10" fill="#5B3DF5" />
                  <path
                    d="M11 14C11 12.3431 12.3431 11 14 11H22C23.6569 11 25 12.3431 25 14V25C25 26.6569 23.6569 28 22 28H14C12.3431 28 11 26.6569 11 25V14Z"
                    fill="white"
                    fillOpacity="0.2"
                  />
                  <path
                    d="M14 14V13C14 10.7909 15.7909 9 18 9C20.2091 9 22 10.7909 22 13V14"
                    stroke="white"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="18" cy="20" r="3" fill="#FFFFFF" />
                  <path d="M12 28L24 28" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
              <span className="bq-footer__brand-title">OneShop</span>
            </Link>
            <p className="bq-footer__desc">
              O‘zbekistonda tovarlarni topish, narxlarni solishtirish va yaqin atrofdagi rasmiy do‘konlardan qulay xarid qilish uchun zamonaviy universal marketplace.
            </p>
            <div className="bq-footer__badge">
              OneShop platformasi &amp; Firebase xavfsiz tizimi
            </div>
          </div>

          {/* Col 1: Products & Catalog */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Xaridorlarga</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <Link to="/search" className="bq-footer__link">
                  Barcha toifalar
                </Link>
              </li>
              <li>
                <Link to="/map" className="bq-footer__link">
                  <MapPin size={13} className="inline-icon" /> Do‘konlar xaritasi
                </Link>
              </li>
              <li>
                <Link to="/favorites" className="bq-footer__link">
                  <Heart size={13} className="inline-icon" /> Saqlangan mahsulotlar
                </Link>
              </li>
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('comparison-section')}>
                  Narxlarni taqqoslash
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Categories */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Ommabop toifalar</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <Link to="/search?category=phones" className="bq-footer__link">
                  Smartfonlar va gadjetlar
                </Link>
              </li>
              <li>
                <Link to="/search?category=electronics" className="bq-footer__link">
                  Elektronika va TV
                </Link>
              </li>
              <li>
                <Link to="/search?category=appliances" className="bq-footer__link">
                  Maishiy texnika
                </Link>
              </li>
              <li>
                <Link to="/search?category=computers" className="bq-footer__link">
                  Kompyuter texnikasi
                </Link>
              </li>
              <li>
                <Link to="/search?category=construction" className="bq-footer__link">
                  Qurilish mollari
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Business & Partners */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Biznes uchun</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <Link to="/merchant/apply" className="bq-footer__link">
                  <Store size={13} className="inline-icon" /> Sotuvchi sifatida qo‘shilish
                </Link>
              </li>
              <li>
                <Link to="/merchant" className="bq-footer__link">
                  Do‘kon boshqaruvi
                </Link>
              </li>
              <li>
                <Link to="/login" className="bq-footer__link">
                  Kabinetga kirish
                </Link>
              </li>
              <li>
                <Link to="/register" className="bq-footer__link">
                  Ro‘yxatdan o‘tish
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform & Security */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Tizim holati</h4>
            <div className="bq-footer__status-card">
              <div className="bq-footer__status-row">
                <Database size={15} className={isConfigured ? 'text-green' : 'text-amber'} />
                <div>
                  <div className="bq-footer__status-label">Firebase Auth &amp; DB</div>
                  <div className="bq-footer__status-val">
                    {isConfigured ? `Ulangan (${configStatus.projectId || 'faol'})` : 'Sozlash kutilmoqda'}
                  </div>
                </div>
              </div>

              <div className="bq-footer__status-row">
                <ShieldCheck size={15} className="text-green" />
                <div>
                  <div className="bq-footer__status-label">Xavfsizlik</div>
                  <div className="bq-footer__status-val">Himoyalangan ma’lumotlar</div>
                </div>
              </div>

              <div className="bq-footer__status-row">
                <Layers size={15} className="text-purple" />
                <div>
                  <div className="bq-footer__status-label">OneShop arxitekturasi</div>
                  <div className="bq-footer__status-val">Yuqori tezlik va aniqlik</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bq-footer__bottom">
          <p className="bq-footer__copy">
            &copy; {currentYear} OneShop universal platformasi. Barcha huquqlar himoyalangan.
          </p>
          <div className="bq-footer__security-badge">
            <ShieldCheck size={14} className="text-purple" />
            <span>Shaffof narxlar va ishonchli do‘konlar</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
