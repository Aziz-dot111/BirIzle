import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  PackageSearch,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { ProductCard } from '@/components/common/ProductCard';
import { Button } from '@/components/common/Button';
import { getProducts } from '@/services/firebase/catalog';
import type { ProductItem } from '@/types';
import './FeaturedProductsSection.css';

interface FeaturedProductsSectionProps {
  products?: ProductItem[];
}

const CATEGORY_TABS = [
  { id: 'all', label: 'Barchasi' },
  { id: 'phones', label: 'Smartfonlar' },
  { id: 'electronics', label: 'Elektronika' },
  { id: 'computers', label: 'Kompyuterlar' },
  { id: 'appliances', label: 'Maishiy texnika' },
];

export const FeaturedProductsSection: React.FC<FeaturedProductsSectionProps> = ({
  products: initialProducts,
}) => {
  const [products, setProducts] = useState<ProductItem[]>(initialProducts || []);
  const [loading, setLoading] = useState<boolean>(!initialProducts || initialProducts.length === 0);
  const [activeTab, setActiveTab] = useState('all');

  // Load real catalog data from Firestore / catalog service
  useEffect(() => {
    if (initialProducts && initialProducts.length > 0) {
      setProducts(initialProducts);
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);

    getProducts({ includeDemo: true, limitCount: 16 })
      .then((res) => {
        if (!isMounted) return;
        if (res.data && res.data.length > 0) {
          setProducts(res.data);
        } else {
          setProducts([]);
        }
      })
      .catch((err) => {
        console.warn('[OneShop Catalog] failed to load featured products:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [initialProducts]);

  // Filter products by active tab
  const filteredProducts = activeTab === 'all'
    ? products
    : products.filter((p) => {
        const cat = p.category.toLowerCase();
        const tab = activeTab.toLowerCase();
        return cat === tab || (tab === 'phones' && cat.includes('phone')) || (tab === 'appliances' && cat.includes('appliance'));
      });

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
        <div className="bq-featured-header-row">
          <div className="bq-section-header" style={{ marginBottom: 0 }}>
            <div className="bq-section-tag">
              <Sparkles size={14} className="inline-icon text-purple" />
              <span>Ommabop takliflar</span>
            </div>
            <h2 className="bq-section-title">Ommabop mahsulotlar va narxlar</h2>
            <p className="bq-section-desc">
              O‘zbekiston bo‘ylab eng ko‘p qidirilayotgan mahsulotlar va do‘konlardagi eng yaxshi narxlar.
            </p>
          </div>

          <Link to="/search" className="bq-featured-view-all">
            <span>Barcha tovarlar</span>
            <ArrowRight size={16} />
          </Link>
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

        {/* Loading Skeletons */}
        {loading && (
          <div className="bq-featured-grid">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="bq-product-card-skeleton">
                <div className="bq-product-card-skeleton__thumb" />
                <div className="bq-product-card-skeleton__body">
                  <div className="bq-product-card-skeleton__line" style={{ width: '40%' }} />
                  <div className="bq-product-card-skeleton__line" style={{ width: '85%' }} />
                  <div className="bq-product-card-skeleton__line" style={{ width: '65%' }} />
                  <div className="bq-product-card-skeleton__line" style={{ width: '50%', marginTop: 'auto' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Content Area: Real Products */}
        {!loading && filteredProducts.length > 0 && (
          <div className="bq-featured-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {/* Empty State if truly no products */}
        {!loading && filteredProducts.length === 0 && (
          <div className="bq-empty-products-wrapper">
            <div className="bq-empty-products-card">
              <div className="bq-empty-products-icon">
                <PackageSearch size={28} />
              </div>
              <h3 className="bq-empty-products-title">Bu toifada tovarlar mavjud emas</h3>
              <p className="bq-empty-products-desc">
                Tanlangan toifa bo‘yicha hozircha mahsulotlar topilmadi. Barcha toifadagi tovarlarni ko‘rish uchun katalogga o‘ting.
              </p>
              <div className="bq-empty-products-actions">
                <Link to="/search">
                  <Button variant="primary" size="md" leftIcon={<Layers size={16} />}>
                    Barcha tovarlarni ko‘rish
                  </Button>
                </Link>
                <Button variant="secondary" size="md" onClick={scrollToBusiness}>
                  Sotuvchimisiz? Tovarlarni joylashtiring
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
