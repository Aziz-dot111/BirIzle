import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Menu,
  X,
  User as UserIcon,
  LogOut,
  ShoppingBag,
  Wrench,
  Store,
  Briefcase,
  Search,
  Scale,
  Home,
  Heart,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useFavorites } from '@/hooks/useFavorites';
import { Button } from '@/components/common/Button';
import './Header.css';

export const Header: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const { totalFavorites } = useFavorites();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const closeMenu = () => setMobileMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

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

  const scrollToSearch = React.useCallback(() => {
    setMobileMenuOpen(false);
    if (location.pathname === '/') {
      const input = document.getElementById('main-search-input') as HTMLInputElement | null;
      if (input) {
        input.scrollIntoView({ behavior: 'smooth', block: 'center' });
        input.focus();
      }
    } else {
      navigate('/');
      setTimeout(() => {
        const input = document.getElementById('main-search-input') as HTMLInputElement | null;
        if (input) {
          input.scrollIntoView({ behavior: 'smooth', block: 'center' });
          input.focus();
        }
      }, 120);
    }
  }, [location.pathname, navigate]);

  // Handle escape key to close mobile menu & Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        scrollToSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, scrollToSearch]);

  const displayName = profile?.displayName || user?.displayName || user?.email?.split('@')[0] || 'Kabinet';

  return (
    <>
      {/* Accessibility Skip Link */}
      <a href="#main-search-input" className="skip-link">
        Asosiy qidiruvga o‘tish
      </a>

      <header className="bq-header">
        <div className="container bq-header__container">
          {/* Brand Logo & Wordmark */}
          <Link to="/" className="bq-header__brand" onClick={closeMenu} aria-label="BirQidir bosh sahifasi">
            <div className="bq-header__logo-badge">
              <svg viewBox="0 0 32 32" fill="none" className="bq-header__logo-svg" aria-hidden="true">
                <rect width="32" height="32" rx="8" fill="#047857" />
                <circle cx="14" cy="14" r="6" stroke="#FFFFFF" strokeWidth="2.5" />
                <path d="M18.5 18.5L24 24" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="14" cy="14" r="2.5" fill="#34D399" />
              </svg>
            </div>
            <div className="bq-header__brand-text">
              <span className="bq-header__title">BirQidir</span>
              <span className="bq-header__tagline">Universal bozor</span>
            </div>
          </Link>

          {/* Desktop Search Entry Point (Trigger) */}
          <div
            className="bq-header__search-entry"
            onClick={scrollToSearch}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                scrollToSearch();
              }
            }}
            aria-label="Mahsulot yoki xizmat qidirish. Tezkor qidirish uchun bosing"
          >
            <Search size={16} className="bq-header__search-entry-icon" aria-hidden="true" />
            <span className="bq-header__search-entry-text">Mahsulot yoki xizmat qidiring...</span>
            <kbd className="bq-header__search-shortcut" title="Tezkor qidiruv tugmasi">
              Ctrl K
            </kbd>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="bq-header__nav" aria-label="Bosh navigatsiya">
            <button
              type="button"
              className="bq-header__link"
              onClick={() => scrollToSection('categories-section')}
            >
              <ShoppingBag size={16} aria-hidden="true" />
              <span>Mahsulotlar</span>
            </button>

            <button
              type="button"
              className="bq-header__link"
              onClick={() => scrollToSection('services-section')}
            >
              <Wrench size={16} aria-hidden="true" />
              <span>Xizmatlar</span>
            </button>

            <button
              type="button"
              className="bq-header__link"
              onClick={() => scrollToSection('comparison-section')}
            >
              <Scale size={16} aria-hidden="true" />
              <span>Narxlar</span>
            </button>

            <button
              type="button"
              className="bq-header__link"
              onClick={() => scrollToSection('stores-section')}
            >
              <Store size={16} aria-hidden="true" />
              <span>Yaqin do‘konlar</span>
            </button>

            <button
              type="button"
              className="bq-header__link bq-header__link--business"
              onClick={() => scrollToSection('business-section')}
            >
              <Briefcase size={15} aria-hidden="true" />
              <span>Biznes uchun</span>
            </button>
          </nav>

          {/* Desktop Auth Controls */}
          <div className="bq-header__actions">
            <Link to="/favorites" className="bq-header__fav-link" title="Saqlanganlar" aria-label="Saqlanganlar">
              <Heart size={18} />
              {totalFavorites > 0 && (
                <span className="bq-header__fav-badge">{totalFavorites}</span>
              )}
            </Link>
            {user ? (
              <div className="bq-header__user-menu">
                <Link to="/merchant" className="bq-header__merchant-btn" title="Do‘kon egasi kabineti">
                  <Store size={14} />
                  <span>Do‘konim</span>
                </Link>
                <Link to="/profile" className="bq-header__profile-btn" title="Shaxsiy kabinet">
                  <div className="bq-header__avatar" aria-hidden="true">
                    <UserIcon size={15} />
                  </div>
                  <span className="bq-header__user-name">{displayName}</span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  leftIcon={<LogOut size={15} />}
                  title="Tizimdan chiqish"
                  aria-label="Tizimdan chiqish"
                >
                  Chiqish
                </Button>
              </div>
            ) : (
              <div className="bq-header__auth-buttons">
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

          {/* Mobile Header Right Controls: Compact Search + Menu */}
          <div className="bq-header__mobile-controls">
            <button
              type="button"
              className="bq-header__mobile-icon-btn"
              onClick={scrollToSearch}
              aria-label="Qidiruvga o‘tish"
            >
              <Search size={20} />
            </button>
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

        {/* Mobile Slide-Out Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="bq-header__mobile-drawer-wrapper">
            <div className="bq-header__mobile-backdrop" onClick={closeMenu} aria-hidden="true" />
            <div className="bq-header__mobile-menu animate-fade-in" role="dialog" aria-modal="true" aria-label="Mobil menyu">
              <div className="bq-header__mobile-drawer-head">
                <div className="bq-header__mobile-drawer-brand">
                  <span className="bq-header__title">BirQidir</span>
                  <span className="bq-header__tagline">Navigatsiya</span>
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

              <div className="bq-header__mobile-search-box" onClick={scrollToSearch}>
                <Search size={16} className="text-emerald" />
                <span>Mahsulot yoki xizmat qidirish...</span>
              </div>

              <nav className="bq-header__mobile-nav">
                <button
                  type="button"
                  className="bq-header__mobile-link"
                  onClick={() => scrollToSection('categories-section')}
                >
                  <div className="bq-header__mobile-link-icon">
                    <ShoppingBag size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">Mahsulotlar katalogi</span>
                    <span className="bq-header__mobile-link-sub">10 ta asosiy toifa</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="bq-header__mobile-link"
                  onClick={() => scrollToSection('services-section')}
                >
                  <div className="bq-header__mobile-link-icon">
                    <Wrench size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">Xizmatlar va ustalar</span>
                    <span className="bq-header__mobile-link-sub">Ta’mirlash, go‘zallik va repetitorlar</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="bq-header__mobile-link"
                  onClick={() => scrollToSection('comparison-section')}
                >
                  <div className="bq-header__mobile-link-icon">
                    <Scale size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">Narxlarni taqqoslash</span>
                    <span className="bq-header__mobile-link-sub">Eng arzon takliflarni topish</span>
                  </div>
                </button>

                <button
                  type="button"
                  className="bq-header__mobile-link"
                  onClick={() => scrollToSection('stores-section')}
                >
                  <div className="bq-header__mobile-link-icon">
                    <Store size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">Yaqin do‘konlar</span>
                    <span className="bq-header__mobile-link-sub">Mahalliy savdo nuqtalari</span>
                  </div>
                </button>

                <Link
                  to="/favorites"
                  className="bq-header__mobile-link"
                  onClick={closeMenu}
                >
                  <div className="bq-header__mobile-link-icon">
                    <Heart size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">
                      Saqlanganlar {totalFavorites > 0 && `(${totalFavorites})`}
                    </span>
                    <span className="bq-header__mobile-link-sub">Tanlangan mahsulot va do‘konlar</span>
                  </div>
                </Link>

                <button
                  type="button"
                  className="bq-header__mobile-link bq-header__mobile-link--biz"
                  onClick={() => scrollToSection('business-section')}
                >
                  <div className="bq-header__mobile-link-icon">
                    <Briefcase size={18} />
                  </div>
                  <div className="bq-header__mobile-link-text">
                    <span className="bq-header__mobile-link-title">Biznes portali</span>
                    <span className="bq-header__mobile-link-sub">Sotuvchilar uchun</span>
                  </div>
                </button>
              </nav>

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
                    <Button variant="outline" size="sm" onClick={handleLogout} className="bq-header__mobile-btn">
                      Chiqish
                    </Button>
                  </div>
                ) : (
                  <div className="bq-header__mobile-auth-grid">
                    <Link to="/login" onClick={closeMenu}>
                      <Button variant="outline" size="md" className="bq-header__mobile-btn">
                        Kirish
                      </Button>
                    </Link>
                    <Link to="/register" onClick={closeMenu}>
                      <Button variant="primary" size="md" className="bq-header__mobile-btn">
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

      {/* Modern Compact Mobile Bottom Navigation Bar */}
      <nav className="bq-bottom-bar" aria-label="Mobil tezkor navigatsiya">
        <Link to="/" className={`bq-bottom-bar__item ${location.pathname === '/' ? 'bq-bottom-bar__item--active' : ''}`}>
          <Home size={19} />
          <span>Bosh sahifa</span>
        </Link>
        <button
          type="button"
          className="bq-bottom-bar__item"
          onClick={() => scrollToSection('categories-section')}
        >
          <ShoppingBag size={19} />
          <span>Katalog</span>
        </button>
        <button
          type="button"
          className="bq-bottom-bar__item bq-bottom-bar__item--center"
          onClick={scrollToSearch}
          aria-label="Tezkor qidiruv"
        >
          <div className="bq-bottom-bar__search-fab">
            <Search size={20} />
          </div>
          <span>Qidirish</span>
        </button>
        <button
          type="button"
          className="bq-bottom-bar__item"
          onClick={() => scrollToSection('services-section')}
        >
          <Wrench size={19} />
          <span>Xizmatlar</span>
        </button>
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

