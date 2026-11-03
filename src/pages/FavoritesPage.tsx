import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Store as StoreIcon,
  Package,
  Search,
  Trash2,
  ArrowLeft,
  HeartOff,
  MapPin,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Card } from '@/components/common/Card';
import { useFavorites } from '@/hooks/useFavorites';
import './FavoritesPage.css';

type TabType = 'products' | 'stores';

export const FavoritesPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('products');
  const {
    favoriteProducts,
    favoriteStores,
    removeProductFavorite,
    removeStoreFavorite,
    clearAllFavorites,
    totalFavorites,
  } = useFavorites();

  const formatDate = (isoStr: string) => {
    try {
      return new Date(isoStr).toLocaleDateString('uz-UZ', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="bq-favorites-page">
      <div className="container">
        {/* Header */}
        <div className="bq-favorites-page__header">
          <button
            type="button"
            className="bq-favorites-page__back"
            onClick={() => navigate(-1)}
            aria-label="Orqaga"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="bq-favorites-page__title-wrap">
            <Heart size={22} className="bq-favorites-page__title-icon" />
            <h1 className="bq-favorites-page__title">Saqlangan</h1>
            {totalFavorites > 0 && (
              <span className="bq-favorites-page__count">{totalFavorites}</span>
            )}
          </div>
          {totalFavorites > 0 && (
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 size={15} />}
              onClick={() => {
                if (confirm("Barcha saqlanganllarni o'chirmoqchimisiz?")) {
                  clearAllFavorites();
                }
              }}
              className="bq-favorites-page__clear-btn"
            >
              Hammasini o'chirish
            </Button>
          )}
        </div>

        {/* Tabs */}
        <div className="bq-favorites-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'products'}
            className={`bq-favorites-tab ${activeTab === 'products' ? 'bq-favorites-tab--active' : ''}`}
            onClick={() => setActiveTab('products')}
          >
            <Package size={16} />
            Mahsulotlar
            {favoriteProducts.length > 0 && (
              <span className="bq-favorites-tab__badge">{favoriteProducts.length}</span>
            )}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'stores'}
            className={`bq-favorites-tab ${activeTab === 'stores' ? 'bq-favorites-tab--active' : ''}`}
            onClick={() => setActiveTab('stores')}
          >
            <StoreIcon size={16} />
            Do'konlar
            {favoriteStores.length > 0 && (
              <span className="bq-favorites-tab__badge">{favoriteStores.length}</span>
            )}
          </button>
        </div>

        {/* Favorite Products */}
        {activeTab === 'products' && (
          <div className="bq-favorites-content animate-fade-in">
            {favoriteProducts.length === 0 ? (
              <EmptyState
                icon={<Package size={40} />}
                title="Saqlangan mahsulotlar yo'q"
                description="Mahsulot sahifasidagi yurak tugmasini bosib, mahsulotni saqlab qo'ying."
                actionLabel="Mahsulotlarni qidirish"
                onAction={() => navigate('/search')}
              />
            ) : (
              <div className="bq-favorites-list">
                {favoriteProducts.map((product) => (
                  <Card key={product.id} variant="default" padding="md" className="bq-favorites-card">
                    <div className="bq-favorites-card__content">
                      <div className="bq-favorites-card__icon bq-favorites-card__icon--product">
                        <Package size={20} />
                      </div>
                      <div className="bq-favorites-card__info">
                        <Link to={`/product/${product.id}`} className="bq-favorites-card__title-link">
                          <div className="bq-favorites-card__name">{product.name}</div>
                        </Link>
                        {product.category && (
                          <div className="bq-favorites-card__meta">{product.category}</div>
                        )}
                        <div className="bq-favorites-card__date">
                          Saqlangan: {formatDate(product.savedAt)}
                        </div>
                      </div>
                      <div className="bq-favorites-card__actions">
                        <Link
                          to={`/product/${product.id}`}
                          className="bq-favorites-card__search-link"
                          aria-label={`${product.name} sahifasini ochish`}
                          title="Do'konlar va narxlarni ko'rish"
                        >
                          <Search size={16} />
                        </Link>
                        <button
                          type="button"
                          className="bq-favorites-card__remove"
                          onClick={() => removeProductFavorite(product.id)}
                          aria-label={`${product.name}ni saqlangandan o'chirish`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorite Stores */}
        {activeTab === 'stores' && (
          <div className="bq-favorites-content animate-fade-in">
            {favoriteStores.length === 0 ? (
              <EmptyState
                icon={<StoreIcon size={40} />}
                title="Saqlangan do'konlar yo'q"
                description="Do'kon kartasidagi yurak tugmasini bosib, do'konni saqlab qo'ying."
                actionLabel="Yaqin do'konlarni ko'rish"
                onAction={() => navigate('/')}
              />
            ) : (
              <div className="bq-favorites-list">
                {favoriteStores.map((store) => (
                  <Card key={store.id} variant="default" padding="md" className="bq-favorites-card">
                    <div className="bq-favorites-card__content">
                      <div className="bq-favorites-card__icon bq-favorites-card__icon--store">
                        <StoreIcon size={20} />
                      </div>
                      <div className="bq-favorites-card__info">
                        <div className="bq-favorites-card__name">{store.name}</div>
                        {store.city && (
                          <div className="bq-favorites-card__meta">
                            <MapPin size={13} />
                            {store.city}
                            {store.address ? `, ${store.address}` : ''}
                          </div>
                        )}
                        {store.phone && (
                          <div className="bq-favorites-card__meta">
                            <Phone size={13} />
                            {store.phone}
                          </div>
                        )}
                        <div className="bq-favorites-card__date">
                          Saqlangan: {formatDate(store.savedAt)}
                        </div>
                      </div>
                      <div className="bq-favorites-card__actions">
                        <button
                          type="button"
                          className="bq-favorites-card__remove"
                          onClick={() => removeStoreFavorite(store.id)}
                          aria-label={`${store.name}ni saqlangandan o'chirish`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ---- Empty State Component ---------------------------------------------------

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description, actionLabel, onAction }) => (
  <div className="bq-favorites-empty">
    <div className="bq-favorites-empty__icon">
      <HeartOff size={36} />
    </div>
    <div className="bq-favorites-empty__product-icon">{icon}</div>
    <h2 className="bq-favorites-empty__title">{title}</h2>
    <p className="bq-favorites-empty__desc">{description}</p>
    <Button variant="primary" size="md" onClick={onAction}>
      {actionLabel}
    </Button>
  </div>
);

