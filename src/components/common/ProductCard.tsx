import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, PackageSearch, Store } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import type { ProductItem } from '@/types';
import './ProductCard.css';

export interface ProductCardProps {
  product: ProductItem;
  className?: string;
  onCompareClick?: (product: ProductItem) => void;
  showCategory?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  className = '',
  onCompareClick,
  showCategory = true,
}) => {
  const { isProductFavorite, toggleProductFavorite } = useFavorites();
  const isFav = isProductFavorite(product.id);

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleProductFavorite(product);
  };

  const hasValidPrice = typeof product.minPrice === 'number' && product.minPrice > 0;
  const hasMultiplePrices =
    typeof product.maxPrice === 'number' &&
    typeof product.minPrice === 'number' &&
    product.maxPrice > product.minPrice &&
    product.minPrice > 0;

  // Genuine discount or price difference percentage across stores
  const savingsPercent = hasMultiplePrices && product.maxPrice
    ? Math.round(((product.maxPrice - product.minPrice!) / product.maxPrice) * 100)
    : null;

  const sellerCount = product.sellerCount ?? 0;

  return (
    <article className={`bq-product-card ${className}`}>
      {/* Thumbnail Area */}
      <div className="bq-product-card__thumb-wrap">
        <Link
          to={`/product/${product.id}`}
          className="bq-product-card__img-link"
          aria-label={product.name}
        >
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="bq-product-card__img"
              loading="lazy"
            />
          ) : (
            <div className="bq-product-card__no-img" aria-hidden="true">
              <PackageSearch size={36} className="bq-product-card__placeholder-icon" />
            </div>
          )}
        </Link>

        {/* Favorite Button */}
        <button
          type="button"
          className={`bq-product-card__fav-btn ${isFav ? 'bq-product-card__fav-btn--active' : ''}`}
          onClick={handleFavoriteClick}
          aria-label={isFav ? "Saqlanganlardan o‘chirish" : "Saqlanganlarga qo‘shish"}
          title={isFav ? "Saqlanganlardan o‘chirish" : "Saqlanganlarga qo‘shish"}
        >
          <Heart size={18} fill={isFav ? '#E5484D' : 'none'} color={isFav ? '#E5484D' : '#72758A'} />
        </button>

        {/* Badges Overlay */}
        <div className="bq-product-card__badges">
          {savingsPercent !== null && savingsPercent >= 5 && (
            <span className="bq-product-card__discount-badge">
              -{savingsPercent}% tejamkor
            </span>
          )}
          {product.brand && (
            <span className="bq-product-card__brand-badge">{product.brand}</span>
          )}
        </div>
      </div>

      {/* Body Area */}
      <div className="bq-product-card__body">
        {showCategory && product.category && (
          <span className="bq-product-card__category">{product.category}</span>
        )}

        <h3 className="bq-product-card__name">
          <Link to={`/product/${product.id}`} className="bq-product-card__title-link">
            {product.name}
          </Link>
        </h3>

        {/* Variant Info if present */}
        {(product.variant?.storage || product.variant?.color || product.variant?.ram) && (
          <div className="bq-product-card__variant-info">
            {[product.variant.storage, product.variant.ram, product.variant.color]
              .filter(Boolean)
              .join(' • ')}
          </div>
        )}

        {/* Price Hierarchy */}
        <div className="bq-product-card__price-box">
          {hasValidPrice ? (
            <>
              <div className="bq-product-card__price-row">
                <span className="bq-product-card__price-val">
                  {product.minPrice!.toLocaleString('uz-UZ')} so‘m
                </span>
                {hasMultiplePrices && (
                  <span className="bq-product-card__old-price">
                    {product.maxPrice!.toLocaleString('uz-UZ')} so‘m
                  </span>
                )}
              </div>
              <span className="bq-product-card__price-caption">
                {sellerCount > 1 ? "Eng past narx" : "Narxi"}
              </span>
            </>
          ) : (
            <div className="bq-product-card__price-pending">Narx belgilanmoqda</div>
          )}
        </div>

        {/* Card Footer: Sellers Count & Quick Action */}
        <div className="bq-product-card__footer">
          <div className="bq-product-card__sellers">
            <Store size={14} className="bq-product-card__sellers-icon" />
            <span>
              {sellerCount > 0 ? `${sellerCount} ta do‘konda` : 'Takliflar mavjud'}
            </span>
          </div>

          {onCompareClick ? (
            <button
              type="button"
              className="bq-product-card__action-btn"
              onClick={(e) => {
                e.preventDefault();
                onCompareClick(product);
              }}
            >
              Solishtirish
            </button>
          ) : (
            <Link to={`/product/${product.id}`} className="bq-product-card__action-link">
              Ko‘rish
            </Link>
          )}
        </div>
      </div>
    </article>
  );
};
