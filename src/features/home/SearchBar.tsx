import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  MapPin,
  X,
  Info,
  Sparkles,
  Clock,
  Trash2,
  Tag,
  Layers,
  ArrowRight,
  Package,
} from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useSearchHistory } from '@/hooks/useSearchHistory';
import {
  getSearchSuggestions,
  type SearchSuggestionsResult,
  type SearchSuggestionItem,
} from '@/services/firebase/catalog';
import './SearchBar.css';

const SUGGESTIONS = ['Smartfon', 'Konditsioner', 'Noutbuk', 'Maishiy texnika'];

export interface SearchBarProps {
  initialQuery?: string;
  initialRegion?: string;
  initialScope?: 'all' | 'products' | 'services';
  onSearch?: (query: string, region: string, scope: 'all' | 'products' | 'services') => void;
  autoFocus?: boolean;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  initialQuery = '',
  initialRegion = 'Nukus',
  initialScope = 'all',
  onSearch,
  autoFocus = false,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState(initialQuery);
  const [scope, setScope] = useState<'all' | 'products' | 'services'>(initialScope);
  const [region, setRegion] = useState(initialRegion);
  const [servicesNoticeOpen, setServicesNoticeOpen] = useState(false);

  // Suggestions state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestionsResult>({
    products: [],
    brands: [],
    categories: [],
    totalMatches: 0,
  });
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { history, addToHistory, removeFromHistory, clearHistory } = useSearchHistory();

  // Sync state if initialQuery changes from URL
  useEffect(() => {
    if (initialQuery !== undefined) {
      setQuery(initialQuery);
    }
  }, [initialQuery]);

  useEffect(() => {
    if (initialRegion) {
      setRegion(initialRegion);
    }
  }, [initialRegion]);

  useEffect(() => {
    if (initialScope) {
      setScope(initialScope);
    }
  }, [initialScope]);

  // Debounced suggestion fetching
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSuggestions({
        products: [],
        brands: [],
        categories: [],
        totalMatches: 0,
      });
      setLoadingSuggestions(false);
      setActiveIndex(-1);
      return;
    }

    setLoadingSuggestions(true);
    const timer = setTimeout(async () => {
      try {
        const result = await getSearchSuggestions(trimmed, { limit: 5 });
        setSuggestions(result);
        setActiveIndex(-1);
      } catch (err) {
        console.warn('[BirQidir SearchBar] suggestions error:', err);
      } finally {
        setLoadingSuggestions(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Flattened navigable items for keyboard navigation (Arrow Up / Down / Enter)
  const isQueryEmpty = query.trim().length === 0;

  const navigableItems = useMemo<SearchSuggestionItem[]>(() => {
    if (isQueryEmpty) {
      return history.map((entry) => ({
        type: 'product' as const, // reuse type structure for navigation
        id: `history_${entry.query}`,
        title: entry.query,
        query: entry.query,
      }));
    }

    const items: SearchSuggestionItem[] = [];
    suggestions.products.forEach((p) => items.push(p));
    suggestions.brands.forEach((b) => items.push(b));
    suggestions.categories.forEach((c) => items.push(c));
    return items;
  }, [isQueryEmpty, history, suggestions]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const executeSearch = useCallback(
    (searchTerm: string, targetScope = scope, targetRegion = region) => {
      const trimmed = searchTerm.trim();
      if (!trimmed) return;

      if (targetScope === 'services') {
        setServicesNoticeOpen(true);
        return;
      }

      // Record in history
      addToHistory(trimmed);
      setDropdownOpen(false);
      setActiveIndex(-1);

      if (onSearch) {
        onSearch(trimmed, targetRegion, targetScope);
      } else {
        const params = new URLSearchParams({
          q: trimmed,
          region: targetRegion,
          scope: targetScope,
        });
        navigate(`/search?${params.toString()}`);
      }
    },
    [scope, region, addToHistory, onSearch, navigate]
  );

  const handleSelectSuggestion = useCallback(
    (item: SearchSuggestionItem) => {
      if (item.type === 'product') {
        addToHistory(item.title);
        setDropdownOpen(false);
        setActiveIndex(-1);
        // Direct product detail view or query search
        navigate(`/product/${item.id}`);
      } else if (item.type === 'brand') {
        const brandName = item.brand || item.title;
        addToHistory(brandName);
        setDropdownOpen(false);
        setActiveIndex(-1);
        navigate(`/search?brands=${encodeURIComponent(brandName)}&region=${encodeURIComponent(region)}`);
      } else if (item.type === 'category') {
        const catKey = item.category || '';
        addToHistory(item.title);
        setDropdownOpen(false);
        setActiveIndex(-1);
        navigate(`/search?category=${encodeURIComponent(catKey)}&region=${encodeURIComponent(region)}`);
      } else {
        executeSearch(item.query);
      }
    },
    [addToHistory, navigate, region, executeSearch]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      if (servicesNoticeOpen) setServicesNoticeOpen(false);
      if (dropdownOpen) {
        setDropdownOpen(false);
        setActiveIndex(-1);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (!dropdownOpen) {
        setDropdownOpen(true);
        setActiveIndex(0);
        return;
      }
      if (navigableItems.length > 0) {
        setActiveIndex((prev) => (prev < navigableItems.length - 1 ? prev + 1 : 0));
      }
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (!dropdownOpen) {
        setDropdownOpen(true);
        setActiveIndex(navigableItems.length - 1);
        return;
      }
      if (navigableItems.length > 0) {
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : navigableItems.length - 1));
      }
      return;
    }

    if (e.key === 'Enter') {
      if (dropdownOpen && activeIndex >= 0 && activeIndex < navigableItems.length) {
        e.preventDefault();
        const selected = navigableItems[activeIndex];
        if (isQueryEmpty) {
          executeSearch(selected.query);
        } else {
          handleSelectSuggestion(selected);
        }
      }
      // Otherwise form onSubmit will trigger
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeSearch(query);
  };

  const handleSuggestionChipClick = (term: string) => {
    setQuery(term);
    executeSearch(term, 'products');
  };

  const handleClear = () => {
    setQuery('');
    setDropdownOpen(false);
    setActiveIndex(-1);
    if (inputRef.current) inputRef.current.focus();
  };

  const handleHistoryItemClick = (term: string) => {
    setQuery(term);
    executeSearch(term, scope);
  };

  const hasSuggestions =
    suggestions.products.length > 0 ||
    suggestions.brands.length > 0 ||
    suggestions.categories.length > 0;

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
      <form className="bq-main-search-bar" onSubmit={handleSubmit}>
        {/* Region Selector */}
        <div className="bq-main-search-bar__region">
          <MapPin size={17} className="bq-main-search-bar__icon text-emerald" aria-hidden="true" />
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="bq-main-search-bar__region-select"
            aria-label="Hududni tanlang"
          >
            <option value="Nukus">Nukus</option>
            <option value="Toshkent">Toshkent</option>
            <option value="Samarqand">Samarqand</option>
            <option value="Buxoro">Buxoro</option>
            <option value="Andijon">Andijon</option>
            <option value="Fargona">Farg‘ona</option>
            <option value="Namangan">Namangan</option>
            <option value="Butun O‘zbekiston">Barcha hududlar</option>
          </select>
        </div>

        <div className="bq-main-search-bar__divider" aria-hidden="true" />

        {/* Input Wrap */}
        <div className="bq-main-search-bar__input-wrap">
          <Search size={18} className="bq-main-search-bar__icon" aria-hidden="true" />
          <input
            id="main-search-input"
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder="Mahsulot yoki tovar qidiring..."
            className="bq-main-search-bar__input"
            aria-label="Mahsulot yoki tovar qidirish"
            autoComplete="off"
            autoFocus={autoFocus}
          />
          {query.trim().length > 0 && (
            <button
              type="button"
              className="bq-main-search-bar__clear"
              onClick={handleClear}
              aria-label="Qidiruv matnini tozalash"
            >
              <X size={16} />
            </button>
          )}

          {/* Unified Dropdown: Recent History OR Smart Suggestions */}
          {dropdownOpen && (
            <div
              ref={dropdownRef}
              className="bq-search-history-dropdown bq-search-suggestions-dropdown"
              role="listbox"
              aria-label="Qidiruv tavsiyalari va tarixi"
            >
              {/* STATE 1: Empty Query -> Search History */}
              {isQueryEmpty && (
                <>
                  {history.length > 0 ? (
                    <>
                      <div className="bq-search-history-dropdown__header">
                        <span className="bq-search-history-dropdown__label">
                          <Clock size={13} />
                          Oxirgi qidiruvlar
                        </span>
                        <button
                          type="button"
                          className="bq-search-history-dropdown__clear-all"
                          onClick={(e) => {
                            e.stopPropagation();
                            clearHistory();
                          }}
                          aria-label="Tarixni tozalash"
                        >
                          <Trash2 size={13} />
                          Tozalash
                        </button>
                      </div>
                      {history.map((entry, idx) => {
                        const isFocused = activeIndex === idx;
                        return (
                          <div
                            key={entry.query}
                            className={`bq-search-history-item ${isFocused ? 'bq-search-item--active' : ''}`}
                            role="option"
                            aria-selected={isFocused}
                          >
                            <button
                              type="button"
                              className="bq-search-history-item__query"
                              onClick={() => handleHistoryItemClick(entry.query)}
                            >
                              <Clock size={14} className="bq-search-history-item__icon" />
                              <span>{entry.query}</span>
                            </button>
                            <button
                              type="button"
                              className="bq-search-history-item__remove"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFromHistory(entry.query);
                              }}
                              aria-label={`${entry.query} ni o'chirish`}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <div className="bq-search-empty-prompt">
                      <Sparkles size={16} className="text-emerald" />
                      <span>Mahsulot yoki brend nomini yozing...</span>
                    </div>
                  )}
                </>
              )}

              {/* STATE 2: Non-Empty Query -> Smart Suggestions */}
              {!isQueryEmpty && (
                <>
                  {loadingSuggestions && (
                    <div className="bq-search-loading-bar">
                      <span className="bq-search-spinner" />
                      <span>Tavsiyalar qidirilmoqda...</span>
                    </div>
                  )}

                  {!loadingSuggestions && !hasSuggestions && (
                    <div className="bq-search-no-suggestions">
                      <span>Mos mahsulot yoki brend topilmadi</span>
                      <button
                        type="button"
                        className="bq-search-enter-hint"
                        onClick={() => executeSearch(query)}
                      >
                        &ldquo;{query}&rdquo; bo‘yicha to‘liq qidirish <ArrowRight size={13} />
                      </button>
                    </div>
                  )}

                  {/* Section 1: Matching Products */}
                  {suggestions.products.length > 0 && (
                    <div className="bq-suggestion-section">
                      <div className="bq-suggestion-section__title">
                        <Package size={13} />
                        Mahsulotlar
                      </div>
                      {suggestions.products.map((item) => {
                        const globalIdx = navigableItems.findIndex((x) => x.id === item.id);
                        const isFocused = activeIndex === globalIdx;
                        return (
                          <div
                            key={item.id}
                            className={`bq-suggestion-item bq-suggestion-item--product ${
                              isFocused ? 'bq-search-item--active' : ''
                            }`}
                            role="option"
                            aria-selected={isFocused}
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                          >
                            <div className="bq-suggestion-thumb">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.title} />
                              ) : (
                                <Package size={18} className="text-slate-400" />
                              )}
                            </div>
                            <div className="bq-suggestion-details">
                              <span className="bq-suggestion-name">{item.title}</span>
                              <span className="bq-suggestion-sub">{item.subtitle}</span>
                            </div>
                            {item.minPrice !== undefined && (
                              <div className="bq-suggestion-price">
                                {item.minPrice.toLocaleString('uz-UZ')} so‘m dan
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 2: Matching Brands */}
                  {suggestions.brands.length > 0 && (
                    <div className="bq-suggestion-section">
                      <div className="bq-suggestion-section__title">
                        <Tag size={13} />
                        Brendlar
                      </div>
                      {suggestions.brands.map((item) => {
                        const globalIdx = navigableItems.findIndex((x) => x.id === item.id);
                        const isFocused = activeIndex === globalIdx;
                        return (
                          <div
                            key={item.id}
                            className={`bq-suggestion-item ${
                              isFocused ? 'bq-search-item--active' : ''
                            }`}
                            role="option"
                            aria-selected={isFocused}
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                          >
                            <div className="bq-suggestion-icon bq-suggestion-icon--brand">
                              <Tag size={15} />
                            </div>
                            <div className="bq-suggestion-details">
                              <span className="bq-suggestion-name">{item.title}</span>
                              <span className="bq-suggestion-sub">{item.subtitle}</span>
                            </div>
                            <span className="bq-suggestion-badge">Brend</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Section 3: Matching Categories */}
                  {suggestions.categories.length > 0 && (
                    <div className="bq-suggestion-section">
                      <div className="bq-suggestion-section__title">
                        <Layers size={13} />
                        Toifalar
                      </div>
                      {suggestions.categories.map((item) => {
                        const globalIdx = navigableItems.findIndex((x) => x.id === item.id);
                        const isFocused = activeIndex === globalIdx;
                        return (
                          <div
                            key={item.id}
                            className={`bq-suggestion-item ${
                              isFocused ? 'bq-search-item--active' : ''
                            }`}
                            role="option"
                            aria-selected={isFocused}
                            onClick={() => handleSelectSuggestion(item)}
                            onMouseEnter={() => setActiveIndex(globalIdx)}
                          >
                            <div className="bq-suggestion-icon bq-suggestion-icon--category">
                              <Layers size={15} />
                            </div>
                            <div className="bq-suggestion-details">
                              <span className="bq-suggestion-name">{item.title}</span>
                              <span className="bq-suggestion-sub">{item.subtitle}</span>
                            </div>
                            <span className="bq-suggestion-badge">Toifa</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Footer / Match Summary */}
                  {hasSuggestions && (
                    <div className="bq-suggestion-footer">
                      <button
                        type="button"
                        className="bq-suggestion-footer__action"
                        onClick={() => executeSearch(query)}
                      >
                        <span>
                          &ldquo;{query}&rdquo; bo‘yicha barcha natijalarni ko‘rish ({suggestions.totalMatches} ta)
                        </span>
                        <ArrowRight size={13} />
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
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

      {/* Quick Suggestions Row */}
      <div className="bq-search-suggestions-row">
        <span className="bq-search-suggestions-label">
          <Sparkles size={13} className="inline-icon text-emerald" /> Tavsiyalar:
        </span>
        <div className="bq-search-suggestions-chips">
          {SUGGESTIONS.map((item) => (
            <button
              key={item}
              type="button"
              className="bq-search-chip"
              onClick={() => handleSuggestionChipClick(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Services Stage Notice Modal */}
      {servicesNoticeOpen && (
        <div className="bq-modal-backdrop animate-fade-in" onClick={() => setServicesNoticeOpen(false)}>
          <div
            className="bq-search-notice-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="services-notice-title"
          >
            <button
              type="button"
              className="bq-search-notice-modal__close"
              onClick={() => setServicesNoticeOpen(false)}
              aria-label="Yopish"
            >
              <X size={18} />
            </button>

            <div className="bq-search-notice-modal__head">
              <div className="bq-search-notice-modal__icon">
                <Info size={22} />
              </div>
              <div>
                <h3 id="services-notice-title" className="bq-search-notice-modal__title">
                  Xizmatlar moduli
                </h3>
                <p className="bq-search-notice-modal__subtitle">
                  Ustalar va xizmat ko‘rsatuvchilar katalogi
                </p>
              </div>
            </div>

            <div className="bq-search-notice-modal__body">
              <p>
                Ustalar, texnik ta’mirlash va maishiy xizmatlar qidiruvi rejamizning 4-bosqichida ulanadi.
              </p>
              <div className="bq-search-notice-modal__status-box">
                <span className="bq-search-notice-modal__badge">1-va 2-bosqich faol</span>
                <p>
                  Hozirda Nukus shahri va boshqa hududlar bo‘yicha tovarlar katalogi, do‘konlar va narxlarni taqqoslash tizimi faol ishlamoqda.
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setServicesNoticeOpen(false);
                setScope('products');
              }}
              className="bq-search-notice-modal__btn"
            >
              Mahsulotlarni qidirish
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
