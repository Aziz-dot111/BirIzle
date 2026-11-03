import React, { useState } from 'react';
import {
  Sparkles,
  PackageSearch,
  Scale,
  Store,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import type { ProductItem } from '@/types';
import './FeaturedProductsSection.css';

interface FeaturedProductsSectionProps {
  products?: ProductItem[];
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'smartphones', label: 'Smartfonlar' },
  { id: 'computers', label: 'Kompyuterlar' },
  { id: 'appliances', label: 'Maishiy texnika' },
];

export const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({
  products = [],
}) => {
  const [activeTab, setActiveTab] = useState('all');
  const [showConcept, setShowConcept] = useState(false);

  // Filter products if real products exist
  const filteredProducts = activeTab === 'all'
    ? products
    : products.filter((p) => p.category.toLowerCase() === activeTab.toLowerCase());

  const scrollToBusiness = () => {
    const el = document.getElementById('business-section');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section id="featured-products-section" className="bq-featured-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header">
          <div className="bq-section-tag">
            <Sparkles size={14} />
            <span>Ommabop takliflar</span>
          </div>
          <h2 className="bq-section-title">Ommabop mahsulotlar va narxlar</h2>
          <p className="bq-section-desc">
            O‘zbekiston bo‘ylab eng ko‘p qidirilayotgan mahsulotlar va ularning eng ma’qul narxlari.
          </p>
        </div>

        {/* Category Filter Tabs */}
        <div className="bq-featured-tabs" role="tablist" aria-label="Mahsulot toifalari">
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`bq-featured-tab ${activeTab === tab.id ? 'bq-featured-tab--active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area: Real Products OR Honest Empty State */}
        {filteredProducts.length > 0 ? (
          <div className="bq-featured-grid">
            {filteredProducts.map((product) => (
              <Card key={product.id} variant="default" hoverable padding="none" className="bq-product-card">
                <div className="bq-product-card__thumb">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} />
                  ) : (
                    <PackageSearch size={32} className="text-slate-400" />
                  )}
                  <span className="bq-product-card__category">{product.category}</span>
                </div>
                <div className="bq-product-card__body">
                  <h3 className="bq-product-card__name">{product.name}</h3>
                  <div className="bq-product-card__price-row">
                    <span className="bq-product-card__price-label">Eng arzon:</span>
                    <span className="bq-product-card__price">
                      {product.minPrice !== undefined
                        ? `${product.minPrice.toLocaleString('uz-UZ')} so‘m`
                        : 'Narx belgilanmoqda'}
                    </span>
                  </div>
                  <div className="bq-product-card__footer">
                    <span className="bq-product-card__sellers">
                      <Store size={14} />
                      <span>{product.sellerCount ?? 0} ta do‘konda</span>
                    </span>
                    <Button variant="ghost" size="sm" rightIcon={<ArrowRight size={14} />}>
                      Solishtirish
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bq-empty-products-wrapper">
            <div className="bq-empty-products-card">
              <div className="bq-empty-products-icon">
                <PackageSearch size={28} />
              </div>
              <h3 className="bq-empty-products-title">Mahsulotlar katalogi shakllantirilmoqda</h3>
              <p className="bq-empty-products-desc">
                Hozirda BirQidir platformasida rasmiy do‘konlar va sotuvchilar ro‘yxatdan o‘tib, o‘z tovar
                inventarlarini kiritishmoqda. Yangi do‘konlar qo‘shilgach, real narxlar va eng ma’qul
                takliflar ushbu bo‘limda avtomatik ravishda paydo bo‘ladi.
              </p>
              <div className="bq-empty-products-actions">
                <Button
                  variant="primary"
                  size="md"
                  onClick={scrollToBusiness}
                  rightIcon={<ArrowRight size={15} />}
                >
                  Sotuvchimisiz? Tovarlarni joylashtiring
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => setShowConcept(!showConcept)}
                  rightIcon={showConcept ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                >
                  {showConcept ? 'Namunani yopish' : 'Katalog qanday ko‘rinadi? (Konsept namuna)'}
                </Button>
              </div>
            </div>

            {/* Collapsible Illustrative Concept Preview */}
            {showConcept && (
              <div className="bq-concept-preview-box animate-fade-in">
                <div className="bq-concept-preview-header">
                  <span className="bq-concept-preview-badge">
                    <Sparkles size={14} /> Namuna / Konsept — 2-bosqichda ulanadi
                  </span>
                  <span className="bq-concept-preview-note">
                    Real do‘konlar inventari ulanganida mahsulot kartochkalari shunday ko‘rinishda aks etadi:
                  </span>
                </div>

                <div className="bq-concept-grid">
                  <div className="bq-concept-card">
                    <div className="bq-concept-card__thumb">
                      <div className="bq-concept-icon-box">
                        <Scale size={24} />
                      </div>
                      <span className="bq-concept-tag">Smartfonlar</span>
                    </div>
                    <div className="bq-concept-card__body">
                      <div className="bq-concept-title">Smartfon 128GB (Flagman seriyasi)</div>
                      <div className="bq-concept-price-range">
                        <span className="bq-concept-price-label">Narx diapazoni:</span>
                        <span className="bq-concept-price">4 200 000 — 4 950 000 so‘m</span>
                      </div>
                      <div className="bq-concept-footer">
                        <span className="bq-concept-seller-count">
                          <Store size={13} /> 12 ta do‘konda mavjud
                        </span>
                        <span className="bq-concept-status-pill">Narxlar solishtirilgan</span>
                      </div>
                    </div>
                  </div>

                  <div className="bq-concept-card">
                    <div className="bq-concept-card__thumb">
                      <div className="bq-concept-icon-box">
                        <Scale size={24} />
                      </div>
                      <span className="bq-concept-tag">Noutbuklar</span>
                    </div>
                    <div className="bq-concept-card__body">
                      <div className="bq-concept-title">Ultrabuk 14&quot; M2 16/512GB</div>
                      <div className="bq-concept-price-range">
                        <span className="bq-concept-price-label">Narx diapazoni:</span>
                        <span className="bq-concept-price">12 400 000 — 13 800 000 so‘m</span>
                      </div>
                      <div className="bq-concept-footer">
                        <span className="bq-concept-seller-count">
                          <Store size={13} /> 8 ta do‘konda mavjud
                        </span>
                        <span className="bq-concept-status-pill">Narxlar solishtirilgan</span>
                      </div>
                    </div>
                  </div>

                  <div className="bq-concept-card">
                    <div className="bq-concept-card__thumb">
                      <div className="bq-concept-icon-box">
                        <Scale size={24} />
                      </div>
                      <span className="bq-concept-tag">Maishiy texnika</span>
                    </div>
                    <div className="bq-concept-card__body">
                      <div className="bq-concept-title">Inverter Kir yuvish mashinasi 7kg</div>
                      <div className="bq-concept-price-range">
                        <span className="bq-concept-price-label">Narx diapazoni:</span>
                        <span className="bq-concept-price">3 850 000 — 4 400 000 so‘m</span>
                      </div>
                      <div className="bq-concept-footer">
                        <span className="bq-concept-seller-count">
                          <Store size={13} /> 6 ta do‘konda mavjud
                        </span>
                        <span className="bq-concept-status-pill">Narxlar solishtirilgan</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bq-concept-disclaimer">
                  <ExternalLink size={13} />
                  <span>
                    Eslatma: Bu illyustrativ namunadir. Haqiqiy tovarlar va do‘konlar narxlari 2-bosqichda ulanadi.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
