import React, { useState } from 'react';
import {
  Navigation,
  MapPin,
  AlertCircle,
  X,
  Compass,
  CheckCircle2,
} from 'lucide-react';
import { Button } from './Button';
import { useGeolocation } from '@/hooks/useGeolocation';
import { CITY_CENTROIDS } from '@/utils/geo';
import {
  type MapLanguage,
  getMapTexts,
  getSavedMapLanguage,
  getGeolocationErrorMessage,
} from '@/utils/mapI18n';
import type { Coordinates } from '@/types';
import './LocationControl.css';

export interface LocationControlProps {
  userCoords?: Coordinates | null;
  onLocationChange?: (coords: Coordinates | null, source: 'gps' | 'manual' | null, cityName?: string) => void;
  radiusKm?: number | null;
  onRadiusChange?: (radius: number | null) => void;
  showRadiusFilter?: boolean;
  className?: string;
  lang?: MapLanguage;
}

export const LocationControl: React.FC<LocationControlProps> = ({
  userCoords,
  onLocationChange,
  radiusKm = null,
  onRadiusChange,
  showRadiusFilter = true,
  className = '',
  lang,
}) => {
  const currentLang = lang || getSavedMapLanguage();
  const t = getMapTexts(currentLang);
  const geo = useGeolocation();
  const [selectedCity, setSelectedCity] = useState<string>('Nukus');
  const [showCityPicker, setShowCityPicker] = useState(false);

  const radiusOptions = [
    { value: 1, label: currentLang === 'ru' ? '1 км' : '1 km' },
    { value: 5, label: currentLang === 'ru' ? '5 км' : '5 km' },
    { value: 10, label: currentLang === 'ru' ? '10 км' : '10 km' },
    { value: 25, label: currentLang === 'ru' ? '25 км' : '25 km' },
    { value: null, label: t.radiusAll },
  ];

  const activeCoords = userCoords ?? geo.coords;

  const handleDetectGPS = async () => {
    setShowCityPicker(false);
    const coords = await geo.detectLocation();
    if (coords && onLocationChange) {
      onLocationChange(coords, 'gps');
    }
  };

  const handleSelectCity = (cityName: string) => {
    setSelectedCity(cityName);
    const coords = geo.setManualCity(cityName);
    if (coords && onLocationChange) {
      onLocationChange(coords, 'manual', cityName);
    }
  };

  const handleClear = () => {
    geo.clearLocation();
    if (onLocationChange) {
      onLocationChange(null, null);
    }
  };

  return (
    <div className={`bq-location-control ${className}`}>
      {/* Top action bar: GPS Button & Status */}
      <div className="bq-location-control__top">
        <div className="bq-location-control__left">
          <Button
            type="button"
            variant={activeCoords && geo.source === 'gps' ? 'secondary' : 'primary'}
            size="sm"
            onClick={handleDetectGPS}
            isLoading={geo.isLocating}
            leftIcon={<Navigation size={15} />}
            className="bq-location-gps-btn"
          >
            {geo.isLocating ? t.detectingLocation : t.detectLocation}
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowCityPicker((prev) => !prev)}
            leftIcon={<MapPin size={15} />}
            className="bq-location-city-btn"
          >
            {showCityPicker ? t.closeCitySelect : t.selectCity}
          </Button>
        </div>

        {/* Active Location Indicator */}
        {activeCoords && (
          <div className="bq-location-active-badge animate-fade-in">
            <CheckCircle2 size={14} className="text-emerald" />
            <span className="bq-location-active-text">
              {geo.source === 'gps'
                ? `GPS: ${activeCoords.lat.toFixed(2)}, ${activeCoords.lng.toFixed(2)}`
                : `${geo.activeCity || selectedCity}`}
            </span>
            <button
              type="button"
              onClick={handleClear}
              className="bq-location-clear-btn"
              title={t.clearLocationTitle}
              aria-label={t.clearLocationAria}
            >
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Manual City Picker Dropdown / Selector */}
      {showCityPicker && (
        <div className="bq-location-city-picker animate-fade-in">
          <span className="bq-location-city-picker__label">
            <Compass size={13} /> {t.selectCityLabel}
          </span>
          <div className="bq-location-city-chips">
            {Object.keys(CITY_CENTROIDS).map((city) => (
              <button
                key={city}
                type="button"
                className={`bq-location-city-chip ${
                  selectedCity === city && geo.source === 'manual'
                    ? 'bq-location-city-chip--active'
                    : ''
                }`}
                onClick={() => handleSelectCity(city)}
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Alert Display */}
      {(geo.errorMessage || geo.errorType) && (
        <div className="bq-location-error-alert animate-fade-in" role="alert">
          <div className="bq-location-error-icon">
            <AlertCircle size={16} />
          </div>
          <div className="bq-location-error-content">
            <p className="bq-location-error-text">
              {getGeolocationErrorMessage(geo.errorType, currentLang) || geo.errorMessage}
            </p>
            <div style={{ marginTop: '0.5rem' }}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setShowCityPicker(true)}
                leftIcon={<MapPin size={14} />}
              >
                {t.selectCityFromList}
              </Button>
            </div>
          </div>
          <button
            type="button"
            className="bq-location-error-dismiss"
            onClick={geo.clearLocation}
            aria-label={t.closeCitySelect}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Radius Filters (1 km, 5 km, 10 km, 25 km, All) */}
      {showRadiusFilter && activeCoords && onRadiusChange && (
        <div className="bq-location-radius-row animate-fade-in">
          <span className="bq-location-radius-label">
            <Compass size={13} /> {t.searchRadiusLabel}
          </span>
          <div className="bq-location-radius-pills" role="radiogroup" aria-label={t.searchRadiusLabel}>
            {radiusOptions.map((opt) => {
              const isActive = radiusKm === opt.value;
              return (
                <button
                  key={opt.label}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  className={`bq-radius-pill ${isActive ? 'bq-radius-pill--active' : ''}`}
                  onClick={() => onRadiusChange(opt.value)}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
