import React, { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/common/Button';
import './Header.css';

export const Header: React.FC = () => {
  const { user, profile, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setMobileMenuOpen(false);
  };

  const closeMenu = () => setMobileMenuOpen(false);

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

  return (
    <header className="bq-header">
      {/* Main Top Header Bar */}
      <div className="container bq-header__container">
        {/* Left: Brand */}
        <Link to="/" className="bq-header__brand" onClick={closeMenu}>
          <div className="bq-header__logo-badge">
            <Search size={20} strokeWidth={2.5} />
          </div>
          <div className="bq-header__brand-text">
            <span className="bq-header__title">BirQidir</span>
            <span className="bq-header__tagline">Universal bozor</span>
          </div>
        </Link>

        {/* Center: Desktop Quick Nav */}
        <nav className="bq-header__nav" aria-label="Asosiy navigatsiya">
          <button
            type="button"
            className="bq-header__link"
            onClick={() => scrollToSection('categories-section')}
          >
            <ShoppingBag size={16} />
            <span>Mahsulotlar</span>
          </button>

          <button
            type="button"
            className="bq-header__link"
            onClick={() => scrollToSection('services-section')}
          >
            <Wrench size={16} />
            <span>Xizmatlar</span>
          </button>

          <button
            type="button"
            className="bq-header__link"
            onClick={() => scrollToSection('comparison-section')}
          >
            <Scale size={16} />
            <span>Narx solishtirish</span>
          </button>

          <button
            type="button"
            className="bq-header__link"
            onClick={() => scrollToSection('stores-section')}
          >
            <Store size={16} />
            <span>Yaqin do‘konlar</span>
          </button>

          <button
            type="button"
            className="bq-header__link bq-header__link--business"
            onClick={() => scrollToSection('business-section')}
          >
            <Briefcase size={16} />
            <span>Biznes uchun</span>
          </button>
        </nav>

        {/* Right: Auth Controls */}
        <div className="bq-header__actions">
          {user ? (
            <div className="bq-header__user-menu">
              <Link to="/profile" className="bq-header__profile-btn">
                <div className="bq-header__avatar">
                  <UserIcon size={16} />
                </div>
                <span className="bq-header__user-name">
                  {profile?.displayName || user.displayName || user.email?.split('@')[0]}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                leftIcon={<LogOut size={15} />}
                title="Tizimdan chiqish"
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

        {/* Mobile Hamburger Toggle */}
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

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="bq-header__mobile-menu animate-fade-in">
          <nav className="bq-header__mobile-nav">
            <button
              type="button"
              className="bq-header__mobile-link"
              onClick={() => scrollToSection('categories-section')}
            >
              <ShoppingBag size={18} />
              <span>Mahsulotlar katalogi</span>
            </button>
            <button
              type="button"
              className="bq-header__mobile-link"
              onClick={() => scrollToSection('services-section')}
            >
              <Wrench size={18} />
              <span>Xizmatlar va ustalar</span>
            </button>
            <button
              type="button"
              className="bq-header__mobile-link"
              onClick={() => scrollToSection('comparison-section')}
            >
              <Scale size={18} />
              <span>Narxlarni solishtirish</span>
            </button>
            <button
              type="button"
              className="bq-header__mobile-link"
              onClick={() => scrollToSection('stores-section')}
            >
              <Store size={18} />
              <span>Yaqin do‘konlar</span>
            </button>
            <button
              type="button"
              className="bq-header__mobile-link"
              onClick={() => scrollToSection('business-section')}
            >
              <Briefcase size={18} />
              <span>Biznes portali</span>
            </button>
          </nav>

          <div className="bq-header__mobile-auth">
            {user ? (
              <>
                <Link to="/profile" className="bq-header__mobile-profile" onClick={closeMenu}>
                  <div className="bq-header__avatar">
                    <UserIcon size={18} />
                  </div>
                  <span>{profile?.displayName || user.displayName || user.email}</span>
                </Link>
                <Button variant="outline" size="md" onClick={handleLogout} className="bq-header__mobile-btn">
                  Chiqish
                </Button>
              </>
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
      )}
    </header>
  );
};
