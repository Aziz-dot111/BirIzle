import React, { useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  MapPin,
  Search,
  ArrowLeft,
  ChevronRight,
} from 'lucide-react';
import { NearbyStoresSection } from '@/features/home/NearbyStoresSection';
import { getSavedMapLanguage } from '@/utils/mapI18n';
import './MapPage.css';

export const MapPage: React.FC = () => {
  const [searchParams] = useSearchParams();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || searchParams.get('cat') || '';
  const district = searchParams.get('district') || '';
  const storeId = searchParams.get('storeId') || null;
  const viewParam = searchParams.get('view') as 'both' | 'map' | 'list' | null;

  const lang = useMemo(() => getSavedMapLanguage(), []);

  return (
    <div className="bq-map-page">
      <div className="container">
        {/* Breadcrumb Navigation */}
        <nav className="bq-map-page__breadcrumbs" aria-label="Breadcrumb">
          <Link to="/" className="bq-breadcrumb-link">
            {lang === 'ru' ? 'Главная' : 'Bosh sahifa'}
          </Link>
          <ChevronRight size={14} className="bq-breadcrumb-separator" />
          <span className="bq-breadcrumb-current" aria-current="page">
            {lang === 'ru' ? 'Карта магазинов' : 'Do‘konlar xaritasi'}
          </span>
        </nav>

        {/* Page Top Banner */}
        <div className="bq-map-page__hero animate-fade-in">
          <div className="bq-map-page__hero-main">
            <div className="bq-map-page__badge">
              <MapPin size={14} />
              <span>{lang === 'ru' ? 'Интерактивная карта' : 'Interaktiv xarita'}</span>
            </div>
            <h1 className="bq-map-page__title">
              {lang === 'ru' ? 'Карта магазинов и торговых точек' : 'Do‘konlar va savdo nuqtalari xaritasi'}
            </h1>
            <p className="bq-map-page__desc">
              {lang === 'ru'
                ? 'Находите ближайшие магазины, официальных партнеров OneShop и точки продаж на карте Нукуса и Каракалпакстана с реальными ценами и расстояниями.'
                : 'Nukus shahri va butun Qoraqalpog‘iston bo‘ylab do‘konlar, OneShop rasmiy hamkorlari va savdo nuqtalarini xaritada qidiring, eng arzon narxlar va masofalarni aniqlang.'}
            </p>
          </div>

          {/* Context Sync Info (e.g. redirected from Search with query) */}
          {query.trim() && (
            <div className="bq-map-page__query-notice animate-fade-in">
              <div className="bq-map-page__query-notice-left">
                <Search size={16} className="text-emerald" />
                <span>
                  {lang === 'ru' ? 'Поиск товара на карте:' : 'Mahsulot qidiruvi bo‘yicha:'}{' '}
                  <strong>&ldquo;{query}&rdquo;</strong>
                </span>
              </div>
              <Link
                to={`/search?q=${encodeURIComponent(query)}&scope=products`}
                className="bq-map-page__back-search-link"
              >
                <ArrowLeft size={14} />
                <span>{lang === 'ru' ? 'В каталог товаров' : 'Tovarlar ro‘yxatiga qaytish'}</span>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Main Map & Stores Section: Map-First layout */}
      <div className="bq-map-page__section-wrap">
        <NearbyStoresSection
          initialSearchQuery={query}
          initialCategory={category}
          initialDistrict={district}
          initialStoreId={storeId}
          defaultViewMode={viewParam || 'map'}
          isFullPage={true}
        />
      </div>
    </div>
  );
};
