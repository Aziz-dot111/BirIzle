import React from 'react';
import { Link } from 'react-router-dom';
import { Search, ShieldCheck, Database, Layers } from 'lucide-react';
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
                <Search size={18} strokeWidth={2.5} />
              </div>
              <span className="bq-footer__brand-title">BirQidir</span>
            </Link>
            <p className="bq-footer__desc">
              O‘zbekistonda tovar va xizmatlarni qidirish, narxlarni solishtirish va yaqin atrofdagi
              do‘konlarni topish uchun universal milliy marketplace.
            </p>
            <div className="bq-footer__badge">
              1-Bosqich: Loyiha poydevori &amp; Firebase
            </div>
          </div>

          {/* Col 1: Products */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Mahsulotlar</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('categories-section')}>
                  Barcha toifalar
                </button>
              </li>
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('comparison-section')}>
                  Narx taqqoslash
                </button>
              </li>
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('stores-section')}>
                  Yaqin do‘konlar
                </button>
              </li>
            </ul>
          </div>

          {/* Col 2: Services */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Xizmatlar</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('services-section')}>
                  Usta xizmatlari
                </button>
              </li>
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('services-section')}>
                  Telefon ta’miri
                </button>
              </li>
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('services-section')}>
                  Sartaroshxona va salon
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Business & Portal */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Biznes</h4>
            <ul className="bq-footer__nav-list">
              <li>
                <button type="button" className="bq-footer__btn-link" onClick={() => scrollTo('business-section')}>
                  Biznes portali
                </button>
              </li>
              <li>
                <Link to="/login" className="bq-footer__link">
                  Tizimga kirish
                </Link>
              </li>
              <li>
                <Link to="/register" className="bq-footer__link">
                  Ro‘yxatdan o‘tish
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Status & Help */}
          <div className="bq-footer__col">
            <h4 className="bq-footer__heading">Yordam &amp; Holat</h4>
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
                  <div className="bq-footer__status-val">Firestore Deny-by-default</div>
                </div>
              </div>

              <div className="bq-footer__status-row">
                <Layers size={15} className="text-blue" />
                <div>
                  <div className="bq-footer__status-label">Mijozlarni qo‘llash</div>
                  <div className="bq-footer__status-val">Aloqa kanallari 2-bosqichda</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="bq-footer__bottom">
          <p className="bq-footer__copy">
            &copy; {currentYear} BirQidir universal platformasi. Barcha huquqlar himoyalangan.
          </p>
          <div className="bq-footer__security-badge">
            <ShieldCheck size={14} />
            <span>Xavfsiz ma’lumotlar arxitekturasi</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
