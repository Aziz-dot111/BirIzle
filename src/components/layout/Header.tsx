import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  User as UserIcon,
  LogOut,
  Store,
  Briefcase,
  Search,
  Scale,
  Home,
  Heart,
  MapPin,
  ShieldCheck,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/common/Button';
import { CITY_CENTROIDS } from '@/utils/geo';
import './Header.css';

const QUICK_CATEGORIES = [
  { id: 'phones', name: 'Smartfonlar' },
  { id: 'electronics', name: 'Elektronika' },
  { id: 'computers', name: 'Kompyuterlar' },
  { id: 'appliances', name: 'Maishiy texnika' },
  { id: 'construction', name: 'Qurilish mollari' },
  { id: 'home', name: 'Uy jihozlari' },
  { id: 'clothing', name: 'Kiyim-kechak' },
];

export const Header: React.FC = () => {
  const { user, profile, isAdmin, logout } = useAuth();
  const { totalFavorites } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [cityPickerOpen, setCityPickerOpen] = useState(false);
  const [currentCity, setCurrentCity] = useState<string>(() => {
    try {
      return localStorage.getItem('oneshop_city') || 'Nukus';
    } catch {
      return 'Nukus';
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const cityPickerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const location = useLocation();

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setCityPickerOpen(false);
  }, [location.pathname]);

  // Sync search input if URL has 'q' parameter on Search page
  useEffect(() => {
    if (location.pathname.startsWith('/search')) {
      const params = new URLSearchParams(location.search);
      const q = params.get('q');
      if (q !== null) {
        setSearchQuery(q);
      }
    }
  }, [location.pathname, location.search]);

  // Handle outside click for city picker
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (cityPickerRef.current && !cityPickerRef.current.contains(e.target as Node)) {
        setCityPickerOpen(false);
      }
    };
    if (cityPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [cityPickerOpen]);

  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const handleSelectCity = (city: string) => {
    setCurrentCity(city);
    try {
      localStorage.setItem('oneshop_city', city);
    } catch {
      // ignore localStorage quota errors
    }
    setCityPickerOpen(false);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchQuery.trim();
    if (trimmed) {
      navigate(`/search?q=${encodeURIComponent(trimmed)}&region=${encodeURIComponent(currentCity)}`);
    } else {
      navigate('/search');
    }
  };

  const scrollToSearch = useCallback(() => {
    setMobileMenuOpen(false);
    if (searchInputRef.current) {
      searchInputRef.current.focus();
      searchInputRef.current.select();
    } else {
      const heroInput = document.getElementById('main-search-input') as HTMLInputElement | null;
      if (heroInput) {
        heroInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
        heroInput.focus();
      }
    }
  }, []);

  // Keyboard shortcut Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (mobileMenuOpen) setMobileMenuOpen(false);
        if (cityPickerOpen) setCityPickerOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        scrollToSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, cityPickerOpen, scrollToSearch]);

  const scrollToSection = (sectionId: string) => {
    closeMenu();
    if (location.pathname === '/') {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(`/#${sectionId}`);
    }
  };

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Kabinet';

  const majorCities = Object.keys(CITY_CENTROIDS).slice(0, 10);

  return (
    <>
      {/* Accessibility Skip Link */}
      <a href="#header-search-input" className="skip-link">
        Asosiy qidiruvga o‘tish
      </a>

      <header className="bq-header">
        {/* A. Top Utility Bar */}
        <div className="bq-header__topbar">
          <div className="container bq-header__topbar-inner">
            {/* Location Selector */}
            <div className="bq-header__location-wrap" ref={cityPickerRef}>
              <button
                type="button"
                className="bq-header__location-btn"
                onClick={() => setCityPickerOpen(!cityPickerOpen)}
                aria-expanded={cityPickerOpen}
                aria-label={`Tanlangan shahar: ${currentCity}. O‘zgartirish uchun bosing`}
              >
                <MapPin size={14} className="bq-header__location-icon" />
                <span className="bq-header__location-city">{currentCity}</span>
                <ChevronDown size={12} className={`bq-header__chevron ${cityPickerOpen ? 'bq-header__chevron--up' : ''}`} />
              </button>

              {cityPickerOpen && (
                <div className="bq-header__city-dropdown animate-fade-in" role="dialog" aria-label="Shahar tanlash">
                  <div className="bq-header__city-header">
                    <span>Yetkazib berish va do‘konlar hududi:</span>
                  </div>
                  <div className="bq-header__city-grid">
                    {majorCities.map((city) => (
                      <button
                        key={city}
                        type="button"
                        className={`bq-header__city-option ${currentCity === city ? 'bq-header__city-option--active' : ''}`}
                        onClick={() => handleSelectCity(city)}
                      >
                        {city}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Topbar Utility Links */}
            <div className="bq-header__topbar-links">
              <NavLink to="/map" className="bq-header__topbar-link">
                <MapPin size={13} />
                <span>Do‘konlar xaritasi</span>
              </NavLink>
              <button
                type="button"
                className="bq-header__topbar-link"
                onClick={() => scrollToSection('comparison-section')}
              >
                <Scale size={13} />
                <span>Narxlarni solishtirish</span>
              </button>
              <Link to="/merchant/apply" className="bq-header__topbar-link bq-header__topbar-link--merchant">
                <Store size={13} />
                <span>OneShop’da soting</span>
              </Link>
            </div>
          </div>
        </div>

        {/* B. Main Header Row */}
        <div className="bq-header__main">
          <div className="container bq-header__main-inner">
            {/* Brand Logo & Wordmark */}
            <Link to="/" className="bq-header__brand" onClick={closeMenu} aria-label="OneShop bosh sahifasi">
              <div className="bq-header__logo-badge">
                <svg viewBox="0 0 36 36" fill="none" className="bq-header__logo-svg" aria-hidden="true">
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
              <div className="bq-header__brand-text">
                <span className="bq-header__title">OneShop</span>
                <span className="bq-header__tagline">Universal bozor</span>
              </div>
            </Link>

            {/* Catalog Button for desktop */}
            <Link to="/search" className="bq-header__catalog-btn" title="Barcha toifalar">
              <Layers size={18} />
              <span>Katalog</span>
            </Link>

            {/* Prominent Search Form */}
            <form className="bq-header__search-form" onSubmit={handleSearchSubmit} role="search">
              <div className="bq-header__search-wrapper">
                <Search size={18} className="bq-header__search-icon" aria-hidden="true" />
                <input
                  ref={searchInputRef}
                  id="header-search-input"
                  type="search"
                  className="bq-header__search-input"
                  placeholder="Mahsulot, toifa yoki brend qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  aria-label="Mahsulot yoki do‘kon qidirish"
                />
                {searchQuery && (
                  <button
                    type="button"
                    className="bq-header__search-clear"
                    onClick={() => {
                      setSearchQuery('');
                      if (searchInputRef.current) searchInputRef.current.focus();
                    }}
                    aria-label="Qidiruvni tozalash"
                  >
                    <X size={16} />
                  </button>
                )}
                <kbd className="bq-header__search-shortcut" title="Tezkor qidiruv tugmasi">
                  Ctrl K
                </kbd>
                <button type="submit" className="bq-header__search-submit" aria-label="Qidirish">
                  <Search size={18} />
                  <span className="bq-header__search-submit-text">Topish</span>
                </button>
              </div>
            </form>

            {/* Desktop Action Buttons */}
            <div className="bq-header__actions">
              {/* Favorites Link */}
              <Link to="/favorites" className="bq-header__action-item" title="Saqlanganlar" aria-label="Saqlanganlar">
                <div className="bq-header__action-icon-wrap">
                  <Heart size={20} />
                  {totalFavorites > 0 && (
                    <span className="bq-header__badge">{totalFavorites}</span>
                  )}
                </div>
                <span className="bq-header__action-label">Saqlangan</span>
              </Link>

              {/* User Account / Auth */}
              {user ? (
                <div className="bq-header__user-group">
                  {isAdmin && (
                    <Link
                      to="/admin/stores"
                      className="bq-header__role-btn bq-header__role-btn--admin"
                      title="Admin boshqaruvi"
                    >
                      <ShieldCheck size={15} />
                      <span className="bq-header__role-text">Admin</span>
                    </Link>
                  )}
                  <Link
                    to="/merchant"
                    className="bq-header__role-btn bq-header__role-btn--merchant"
                    title="Do‘kon egasi kabineti"
                  >
                    <Store size={15} />
                    <span className="bq-header__role-text">Do‘konim</span>
                  </Link>

                  <Link to="/profile" className="bq-header__user-profile" title="Shaxsiy kabinet">
                    <div className="bq-header__avatar">
                      <UserIcon size={16} />
                    </div>
                    <span className="bq-header__user-name">{displayName}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="bq-header__logout-btn"
                    title="Chiqish"
                    aria-label="Tizimdan chiqish"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="bq-header__auth-group">
                  <NavLink to="/login">
                    <Button variant="ghost" size="sm">
                      Kirish
                    </Button>
                  </NavLink>
                  <NavLink to="/register">
                    <Button variant="primary" size="sm">
                      Ro‘yxatdan o‘tish
                    </Button>
                  </NavLink>
                </div>
              )}
            </div>

            {/* Mobile Controls (Menu Toggle) */}
            <div className="bq-header__mobile-controls">
              <Link to="/favorites" className="bq-header__mobile-fav" aria-label="Saqlanganlar">
                <Heart size={20} />
                {totalFavorites > 0 && <span className="bq-header__mobile-fav-badge">{totalFavorites}</span>}
              </Link>
              <button
                type="button"
                className="bq-header__hamburger"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label={mobileMenuOpen ? 'Menyuni yopish' : 'Menyuni ochish'}
                aria-expanded={mobileMenuOpen}
              >
                {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>

          {/* Mobile Search Row (Always easily accessible) */}
          <div className="bq-header__mobile-search-row">
            <div className="container">
              <form onSubmit={handleSearchSubmit} className="bq-header__mobile-search-form">
                <Search size={16} className="bq-header__mobile-search-icon" />
                <input
                  type="search"
                  className="bq-header__mobile-search-input"
                  placeholder="Mahsulot yoki do‘kon qidiring..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Mobil qidiruv"
                />
                <button type="submit" className="bq-header__mobile-search-submit">
                  Topish
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* C. Category Navigation Bar (Desktop) */}
        <nav className="bq-header__nav-bar" aria-label="Toifalar navigatsiyasi">
          <div className="container bq-header__nav-inner">
            <Link to="/search" className="bq-header__nav-category-pill">
              <Layers size={15} />
              <span>Barcha toifalar</span>
            </Link>

            <div className="bq-header__nav-links">
              {QUICK_CATEGORIES.map((cat) => (
                <NavLink
                  key={cat.id}
                  to={`/search?category=${cat.id}`}
                  className={({ isActive }) =>
                    `bq-header__nav-link ${
                      isActive && location.search.includes(cat.id) ? 'bq-header__nav-link--active' : ''
                    }`
                  }
                >
                  {cat.name}
                </NavLink>
              ))}
              <NavLink to="/map" className="bq-header__nav-link bq-header__nav-link--highlight">
                <MapPin size={14} />
                <span>Do‘konlar xaritasi</span>
              </NavLink>
            </div>
          </div>
        </nav>

        {/* Mobile Slide-out Drawer */}
        {mobileMenuOpen && (
          <div className="bq-header__mobile-drawer-wrapper">
            <div className="bq-header__mobile-backdrop" onClick={closeMenu} aria-hidden="true" />
            <div className="bq-header__mobile-menu animate-fade-in" role="dialog" aria-modal="true" aria-label="Mobil menyu">
              <div className="bq-header__mobile-drawer-head">
                <div className="bq-header__brand-text">
                  <span className="bq-header__title">OneShop</span>
                  <span className="bq-header__tagline">Universal bozor</span>
                </div>
                <button
                  type="button"
                  className="bq-header__mobile-close-btn"
                  onClick={closeMenu}
                  aria-label="Menyuni yopish"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Mobile City Selector */}
              <div className="bq-header__mobile-location">
                <MapPin size={16} className="text-purple" />
                <span>Shahar: </span>
                <select
                  value={currentCity}
                  onChange={(e) => handleSelectCity(e.target.value)}
                  className="bq-header__mobile-city-select"
                >
                  {majorCities.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>

              {/* Navigation links */}
              <nav className="bq-header__mobile-nav">
                <Link to="/search" className="bq-header__mobile-nav-item" onClick={closeMenu}>
                  <div className="bq-header__mobile-nav-icon">
                    <Layers size={18} />
                  </div>
                  <div>
                    <span className="bq-header__mobile-nav-title">Barcha toifalar katalogi</span>
                    <span className="bq-header__mobile-nav-sub">10 ta asosiy bozor toifasi</span>
                  </div>
                </Link>

                <Link to="/map" className="bq-header__mobile-nav-item" onClick={closeMenu}>
                  <div className="bq-header__mobile-nav-icon">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <span className="bq-header__mobile-nav-title">Do‘konlar xaritasi</span>
                    <span className="bq-header__mobile-nav-sub">Yaqin savdo nuqtalari va narxlar</span>
                  </div>
                </Link>

                <Link to="/favorites" className="bq-header__mobile-nav-item" onClick={closeMenu}>
                  <div className="bq-header__mobile-nav-icon">
                    <Heart size={18} />
                  </div>
                  <div>
                    <span className="bq-header__mobile-nav-title">
                      Saqlanganlar {totalFavorites > 0 && `(${totalFavorites})`}
                    </span>
                    <span className="bq-header__mobile-nav-sub">Tanlangan mahsulot va do‘konlar</span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="bq-header__mobile-nav-item"
                  onClick={() => scrollToSection('comparison-section')}
                >
                  <div className="bq-header__mobile-nav-icon">
                    <Scale size={18} />
                  </div>
                  <div>
                    <span className="bq-header__mobile-nav-title">Narxlarni taqqoslash</span>
                    <span className="bq-header__mobile-nav-sub">Eng arzon takliflarni topish</span>
                  </div>
                </button>

                <Link to="/merchant/apply" className="bq-header__mobile-nav-item bq-header__mobile-nav-item--biz" onClick={closeMenu}>
                  <div className="bq-header__mobile-nav-icon">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <span className="bq-header__mobile-nav-title">Sotuvchilar uchun portal</span>
                    <span className="bq-header__mobile-nav-sub">OneShop hamkori bo‘ling</span>
                  </div>
                </Link>
              </nav>

              {/* Mobile Auth Area */}
              <div className="bq-header__mobile-auth">
                {user ? (
                  <div className="bq-header__mobile-user-card">
                    <Link to="/profile" className="bq-header__mobile-profile-link" onClick={closeMenu}>
                      <div className="bq-header__avatar">
                        <UserIcon size={18} />
                      </div>
                      <div className="bq-header__mobile-user-meta">
                        <span className="bq-header__mobile-user-name">{displayName}</span>
                        <span className="bq-header__mobile-user-email">{user.email}</span>
                      </div>
                    </Link>

                    <Link to="/merchant" className="bq-header__mobile-merchant-link" onClick={closeMenu}>
                      <Store size={15} />
                      <span>Do‘kon egasi kabineti</span>
                    </Link>

                    {isAdmin && (
                      <Link
                        to="/admin/stores"
                        className="bq-header__mobile-merchant-link bq-header__mobile-merchant-link--admin"
                        onClick={closeMenu}
                      >
                        <ShieldCheck size={15} />
                        <span>Admin paneli</span>
                      </Link>
                    )}

                    <Button variant="outline" size="sm" onClick={handleLogout} className="bq-header__mobile-logout-btn">
                      Chiqish
                    </Button>
                  </div>
                ) : (
                  <div className="bq-header__mobile-auth-grid">
                    <Link to="/login" onClick={closeMenu} style={{ width: '100%' }}>
                      <Button variant="outline" size="md" style={{ width: '100%' }}>
                        Kirish
                      </Button>
                    </Link>
                    <Link to="/register" onClick={closeMenu} style={{ width: '100%' }}>
                      <Button variant="primary" size="md" style={{ width: '100%' }}>
                        Ro‘yxatdan o‘tish
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Modern Compact Mobile Bottom Navigation Bar: Customer 5-section architecture */}
      <nav className="bq-bottom-bar" aria-label="Mobil tezkor navigatsiya">
        <Link to="/" className={`bq-bottom-bar__item ${location.pathname === '/' ? 'bq-bottom-bar__item--active' : ''}`}>
          <Home size={19} />
          <span>Bosh sahifa</span>
        </Link>
        <Link
          to="/search"
          className={`bq-bottom-bar__item ${location.pathname.startsWith('/search') ? 'bq-bottom-bar__item--active' : ''}`}
        >
          <Search size={19} />
          <span>Qidiruv</span>
        </Link>
        <Link
          to="/map"
          className={`bq-bottom-bar__item bq-bottom-bar__item--center ${location.pathname === '/map' ? 'bq-bottom-bar__item--active' : ''}`}
          aria-label="Do‘konlar xaritasi"
        >
          <div className="bq-bottom-bar__search-fab">
            <MapPin size={20} />
          </div>
          <span>Xarita</span>
        </Link>
        <Link
          to="/favorites"
          className={`bq-bottom-bar__item ${location.pathname === '/favorites' ? 'bq-bottom-bar__item--active' : ''}`}
        >
          <Heart size={19} />
          <span>Saqlangan</span>
          {totalFavorites > 0 && (
            <span className="bq-bottom-bar__badge">{totalFavorites}</span>
          )}
        </Link>
        <Link
          to={user ? '/profile' : '/login'}
          className={`bq-bottom-bar__item ${location.pathname === '/profile' || location.pathname === '/login' ? 'bq-bottom-bar__item--active' : ''}`}
        >
          <UserIcon size={19} />
          <span>{user ? 'Profil' : 'Kirish'}</span>
        </Link>
      </nav>
    </>
  );
};
