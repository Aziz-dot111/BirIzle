import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates } from '@/types';
import { isValidCoordinates } from '@/utils/geo';
import { MapPin, Navigation, RotateCcw, AlertCircle } from 'lucide-react';
import './MapLocationPicker.css';

export interface MapLocationPickerProps {
  value: Coordinates;
  onChange: (coords: Coordinates) => void;
  height?: string;
  disabled?: boolean;
}

const DEFAULT_NUKUS_CENTER: Coordinates = { lat: 42.4619, lng: 59.6166 };

// Custom SVG Pin for Location Picker with draggable indicator
function createLocationPickerPin(): L.DivIcon {
  return L.divIcon({
    className: 'bq-picker-pin-wrapper',
    html: `
      <div class="bq-picker-pin" title="Do‘kon joylashuvini tanlash uchun pinni suring">
        <svg class="bq-picker-pin-svg" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/>
        </svg>
      </div>
    `,
    iconSize: [38, 46],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44],
  });
}

export const MapLocationPicker: React.FC<MapLocationPickerProps> = ({
  value,
  onChange,
  height = '340px',
  disabled = false,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Local text input states to allow natural editing of digits and decimals
  const [latInput, setLatInput] = useState<string>(
    isValidCoordinates(value) ? value.lat.toFixed(6) : DEFAULT_NUKUS_CENTER.lat.toFixed(6)
  );
  const [lngInput, setLngInput] = useState<string>(
    isValidCoordinates(value) ? value.lng.toFixed(6) : DEFAULT_NUKUS_CENTER.lng.toFixed(6)
  );
  const [coordError, setCoordError] = useState<string | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsNotice, setGpsNotice] = useState<string | null>(null);

  // Sync inputs when external value changes
  useEffect(() => {
    if (isValidCoordinates(value)) {
      setLatInput(value.lat.toFixed(6));
      setLngInput(value.lng.toFixed(6));
      setCoordError(null);

      // Move existing marker if map is initialized
      if (markerRef.current) {
        const curLatLng = markerRef.current.getLatLng();
        if (
          Math.abs(curLatLng.lat - value.lat) > 0.00001 ||
          Math.abs(curLatLng.lng - value.lng) > 0.00001
        ) {
          markerRef.current.setLatLng([value.lat, value.lng]);
        }
      }
    }
  }, [value]);

  // Update marker position and notify parent
  const updateCoordinates = useCallback(
    (newCoords: Coordinates, panMap = false) => {
      if (!isValidCoordinates(newCoords)) {
        setCoordError('Koordinatalar haqiqiy sonlar bo‘lishi va chegaralarga mos kelishi kerak.');
        return;
      }

      setCoordError(null);
      setLatInput(newCoords.lat.toFixed(6));
      setLngInput(newCoords.lng.toFixed(6));
      onChange(newCoords);

      if (markerRef.current) {
        markerRef.current.setLatLng([newCoords.lat, newCoords.lng]);
      }
      if (panMap && mapInstanceRef.current) {
        mapInstanceRef.current.panTo([newCoords.lat, newCoords.lng]);
      }
    },
    [onChange]
  );

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialCoords: [number, number] = isValidCoordinates(value)
      ? [value.lat, value.lng]
      : [DEFAULT_NUKUS_CENTER.lat, DEFAULT_NUKUS_CENTER.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCoords,
      zoom: 14,
      zoomControl: true,
      attributionControl: true,
      scrollWheelZoom: false, // Prevent page scroll entrapment on mobile
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    // Create Draggable Marker
    const marker = L.marker(initialCoords, {
      icon: createLocationPickerPin(),
      draggable: !disabled,
    }).addTo(map);

    // Marker drag event
    marker.on('dragend', () => {
      const pos = marker.getLatLng();
      updateCoordinates({ lat: pos.lat, lng: pos.lng });
    });

    // Map click event: place marker on clicked point
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (disabled) return;
      updateCoordinates({ lat: e.latlng.lat, lng: e.latlng.lng });
    });

    mapInstanceRef.current = map;
    markerRef.current = marker;

    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync disabled state to marker
  useEffect(() => {
    if (markerRef.current && markerRef.current.dragging) {
      if (disabled) {
        markerRef.current.dragging.disable();
      } else {
        markerRef.current.dragging.enable();
      }
    }
  }, [disabled]);

  // Handle manual coordinate input blur/submit
  const handleManualCoordSubmit = () => {
    const parsedLat = parseFloat(latInput);
    const parsedLng = parseFloat(lngInput);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      setCoordError('Koordinatalar haqiqiy sonlar bo‘lishi kerak (masalan: 42.4619).');
      return;
    }

    if (parsedLat < -90 || parsedLat > 90) {
      setCoordError('Kenglik (Latitude) -90 va +90 daraja oralig‘ida bo‘lishi shart.');
      return;
    }

    if (parsedLng < -180 || parsedLng > 180) {
      setCoordError('Uzunlik (Longitude) -180 va +180 daraja oralig‘ida bo‘lishi shart.');
      return;
    }

    const newCoords: Coordinates = { lat: parsedLat, lng: parsedLng };
    updateCoordinates(newCoords, true);
  };

  // Reset to Nukus center
  const handleResetToNukus = () => {
    if (disabled) return;
    updateCoordinates(DEFAULT_NUKUS_CENTER, true);
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([DEFAULT_NUKUS_CENTER.lat, DEFAULT_NUKUS_CENTER.lng], 14);
    }
  };

  // Pan to Admin GPS location WITHOUT overriding store coordinates
  const handlePanToAdminGPS = () => {
    if (!navigator.geolocation) {
      setGpsNotice('Brauzeringiz geolokatsiyani qo‘llab-quvvatlamaydi.');
      return;
    }

    setGpsLoading(true);
    setGpsNotice(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLoading(false);
        const { latitude, longitude } = pos.coords;
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16);
          setGpsNotice(
            'Xarita sizning joylashuvingizga surildi. Do‘kon joylashuvini belgilash uchun xaritaga bosing yoki pinni suring.'
          );
          setTimeout(() => setGpsNotice(null), 6000);
        }
      },
      (err) => {
        setGpsLoading(false);
        setGpsNotice(`GPS joylashuvni aniqlab bo‘lmadi (${err.message}).`);
        setTimeout(() => setGpsNotice(null), 5000);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  return (
    <div className="bq-location-picker">
      <div className="bq-location-picker__map-wrap" style={{ height }}>
        <div ref={mapContainerRef} className="bq-location-picker__map" style={{ height }} />

        {/* Informative Hint Badge */}
        <div className="bq-location-picker__hint">
          <MapPin size={14} />
          <span>Xaritaga bosib yoki qizil pinni surib koordinata tanlang</span>
        </div>

        {/* Quick Map Controls (Center & GPS View) */}
        <div className="bq-location-picker__quick-actions">
          <button
            type="button"
            className="bq-location-picker__btn-pill"
            onClick={handleResetToNukus}
            disabled={disabled}
            title="Nukus shahar markaziga qaytarish"
          >
            <RotateCcw size={13} />
            <span>Nukus markazi</span>
          </button>

          <button
            type="button"
            className="bq-location-picker__btn-pill"
            onClick={handlePanToAdminGPS}
            disabled={disabled || gpsLoading}
            title="Xaritani hozirgi GPS hududingizga surish (pinni o‘zgartirmaydi)"
          >
            <Navigation size={13} />
            <span>{gpsLoading ? 'GPS aniqlanmoqda...' : 'GPS hududiga o‘tish'}</span>
          </button>
        </div>
      </div>

      {/* GPS Notice notification */}
      {gpsNotice && (
        <div
          style={{
            fontSize: '0.8rem',
            backgroundColor: '#EFF6FF',
            color: '#1E40AF',
            border: '1px solid #BFDBFE',
            padding: '0.45rem 0.75rem',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <AlertCircle size={14} />
          <span>{gpsNotice}</span>
        </div>
      )}

      {/* Lat / Lng Manual Input Fields */}
      <div className="bq-location-picker__inputs-row">
        <div className="bq-location-picker__field">
          <label className="bq-location-picker__label" htmlFor="bq-picker-lat">
            <span>Kenglik (Latitude)</span>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>[-90 ... +90]</span>
          </label>
          <input
            id="bq-picker-lat"
            type="number"
            step="any"
            className={`bq-location-picker__input ${coordError ? 'bq-location-picker__input--error' : ''}`}
            value={latInput}
            onChange={(e) => setLatInput(e.target.value)}
            onBlur={handleManualCoordSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleManualCoordSubmit()}
            disabled={disabled}
            placeholder="42.4619"
          />
        </div>

        <div className="bq-location-picker__field">
          <label className="bq-location-picker__label" htmlFor="bq-picker-lng">
            <span>Uzunlik (Longitude)</span>
            <span style={{ fontSize: '0.75rem', color: '#64748B' }}>[-180 ... +180]</span>
          </label>
          <input
            id="bq-picker-lng"
            type="number"
            step="any"
            className={`bq-location-picker__input ${coordError ? 'bq-location-picker__input--error' : ''}`}
            value={lngInput}
            onChange={(e) => setLngInput(e.target.value)}
            onBlur={handleManualCoordSubmit}
            onKeyDown={(e) => e.key === 'Enter' && handleManualCoordSubmit()}
            disabled={disabled}
            placeholder="59.6166"
          />
        </div>
      </div>

      {coordError && <div className="bq-location-picker__error-text">{coordError}</div>}

      {/* Coordinate status readout */}
      <div className="bq-location-picker__status-bar">
        <span>Tanlangan nuqta:</span>
        <span className="bq-location-picker__coords-badge">
          {isValidCoordinates(value)
            ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}`
            : 'Belgilanmagan'}
        </span>
      </div>
    </div>
  );
};
