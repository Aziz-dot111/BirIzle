import React, { useState } from 'react';
import { Search, MapPin, X, Info } from 'lucide-react';
import { Button } from '@/components/common/Button';
import './SearchBar.css';

const SUGGESTIONS = ['Telefon', 'Noutbuk', 'Maishiy texnika', 'Telefon ta’miri'];

export const SearchBar: React.FC = () => {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'all' | 'products' | 'services'>('all');
  const [region, setRegion] = useState('Toshkent');
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [lastSearchedTerm, setLastSearchedTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLastSearchedTerm(query.trim());
    setInfoModalOpen(true);
  };

  const handleSuggestionClick = (term: string) => {
    setQuery(term);
    setLastSearchedTerm(term);
    setInfoModalOpen(true);
  };

  return (
    <div className="bq-search-container">
      {/* Scope Switcher: All, Products, Services */}
      <div className="bq-search-scope-tabs" role="tablist" aria-label="Qidiruv toifasi">
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'all'}
          className={`bq-search-tab ${scope === 'all' ? 'bq-search-tab--active' : ''}`}
          onClick={() => setScope('all')}
        >
          Barcha bo‘limlar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'products'}
          className={`bq-search-tab ${scope === 'products' ? 'bq-search-tab--active' : ''}`}
          onClick={() => setScope('products')}
        >
          Mahsulotlar
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={scope === 'services'}
          className={`bq-search-tab ${scope === 'services' ? 'bq-search-tab--active' : ''}`}
          onClick={() => setScope('services')}
        >
          Xizmatlar
        </button>
      </div>

      {/* Main Search Bar Form */}
      <form className="bq-main-search-bar" onSubmit={handleSearch}>
        {/* Region Selector */}
        <div className="bq-main-search-bar__region">
          <MapPin size={17} className="bq-main-search-bar__icon" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bq-main-search-bar__region-select"
            aria-label="Hududni tanlang"
          >
            <option value="Toshkent">Toshkent</option>
            <option value="Samarqand">Samarqand</option>
            <option value="Buxoro">Buxoro</option>
            <option value="Andijon">Andijon</option>
            <option value="Fargona">Farg‘ona</option>
            <option value="Namangan">Namangan</option>
            <option value="Butun O‘zbekiston">Barcha hududlar</option>
          </select>
        </div>

        <div className="bq-main-search-bar__divider" />

        {/* Input */}
        <div className="bq-main-search-bar__input-wrap">
          <Search size={19} className="bq-main-search-bar__icon" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Mahsulot yoki xizmat qidiring..."
            className="bq-main-search-bar__input"
            aria-label="Mahsulot yoki xizmat qidirish"
          />
        </div>

        {/* Action Button */}
        <Button
          type="submit"
          variant="primary"
          size="md"
          className="bq-main-search-bar__submit"
          leftIcon={<Search size={17} />}
        >
          Qidirish
        </Button>
      </form>

      {/* Suggestions Row */}
      <div className="bq-search-suggestions-row">
        <span className="bq-search-suggestions-label">Tavsiyalar:</span>
        <div className="bq-search-suggestions-chips">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="bq-search-chip"
              onClick={() => handleSuggestionClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Honest Stage Notice Modal */}
      {infoModalOpen && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setInfoModalOpen(false)}>
          <div
            className="bq-search-notice-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="search-notice-title"
          >
            <button
              type="button"
              className="bq-search-notice-modal__close"
              onClick={() => setInfoModalOpen(false)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className="bq-search-notice-modal__head">
              <div className="bq-search-notice-modal__icon">
                <Info size={22} />
              </div>
              <div>
                <h3 id="search-notice-title" className="bq-search-notice-modal__title">
                  Qidiruv ma’lumotlar bazasi
                </h3>
                <p className="bq-search-notice-modal__subtitle">
                  So‘rov: <strong>&ldquo;{lastSearchedTerm}&rdquo;</strong> ({region})
                </p>
              </div>
            </div>

            <div className="bq-search-notice-modal__body">
              <p>
                BirQidir platformasining haqiqiy tovarlar katalogi va narxlarni taqqoslash ma’lumotlar
                bazasi keyingi bosqichda bosqichma-bosqich ulanadi.
              </p>
              <p className="bq-search-notice-modal__note">
                Hozirda foydalanuvchi hisoblari, xavfsiz Firestore qoidalari va poydevor arxitekturasi
                faol holatda.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setInfoModalOpen(false)}
              className="bq-search-notice-modal__btn"
            >
              Tushunarli
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
