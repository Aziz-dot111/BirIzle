import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { Coordinates, Store } from '@/types';
import { isValidCoordinates, formatDistance } from '@/utils/geo';
import {
  type MapLanguage,
  getMapTexts,
  translateCategory,
  getSafeStoreName,
  buildDirectionsUrl,
} from '@/utils/mapI18n';
import './NearbyStoresMap.css';

export interface NearbyStoresMapProps {
  stores: Store[];
  userCoords?: Coordinates | null;
  selectedStoreId?: string | null;
  radiusKm?: number | null;
  onSelectStore?: (store: Store) => void;
  height?: string;
  defaultCenter?: Coordinates;
  lang?: MapLanguage;
}

const DEFAULT_NUKUS_CENTER: Coordinates = { lat: 42.4619, lng: 59.6166 };

// Create crisp SVG custom pin for User Location
function createUserPinIcon(tooltipTitle: string): L.DivIcon {
  return L.divIcon({
    className: 'bq-map-user-icon-wrapper',
    html: `
      <div class="bq-map-user-marker" title="${tooltipTitle}">
        <span class="bq-map-user-pulse"></span>
        <span class="bq-map-user-core"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  });
}

// Create custom SVG pin for Store Location with distinct colors for BirQidir vs OpenStreetMap
function createStorePinIcon(
  isSelected: boolean,
  sourceType: 'birqidir' | 'openstreetmap' = 'birqidir',
  lang: MapLanguage = 'uz',
  isCheapest: boolean = false,
  isClosest: boolean = false
): L.DivIcon {
  const isOsm = sourceType === 'openstreetmap';
  let pinClass = isOsm ? 'bq-map-store-pin bq-map-store-pin--osm' : 'bq-map-store-pin bq-map-store-pin--birqidir';
  if (isSelected) {
    pinClass += ' bq-map-store-pin--selected';
  }
  if (isCheapest) {
    pinClass += ' bq-map-store-pin--cheapest';
  } else if (isClosest) {
    pinClass += ' bq-map-store-pin--closest';
  }

  let tooltipTitle = isOsm
    ? lang === 'ru'
      ? 'Открытые данные карты OpenStreetMap'
      : 'OpenStreetMap ochiq xarita ma’lumoti'
    : lang === 'ru'
      ? 'Торговая точка BirQidir'
      : 'BirQidir savdo nuqtasi';

  if (isCheapest) {
    tooltipTitle += lang === 'ru' ? ' (Лучшая цена!)' : ' (Eng arzon taklif!)';
  } else if (isClosest) {
    tooltipTitle += lang === 'ru' ? ' (Ближайший!)' : ' (Eng yaqin!)';
  }

  return L.divIcon({
    className: 'bq-map-store-icon-wrapper',
    html: `
      <div class="${pinClass}" title="${tooltipTitle}">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          ${
            isOsm
              ? '<circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>'
              : '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline>'
          }
        </svg>
      </div>
    `,
    iconSize: [36, 42],
    iconAnchor: [18, 40],
    popupAnchor: [0, -40],
  });
}

export const NearbyStoresMap: React.FC<NearbyStoresMapProps> = ({
  stores,
  userCoords,
  selectedStoreId,
  radiusKm,
  onSelectStore,
  height = '420px',
  defaultCenter = DEFAULT_NUKUS_CENTER,
  lang = 'uz',
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusCircleRef = useRef<L.Circle | null>(null);

  const t = getMapTexts(lang);

  // 1. Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate map instances
    if (mapInstanceRef.current) return;

    const initialCenter: [number, number] =
      userCoords && isValidCoordinates(userCoords)
        ? [userCoords.lat, userCoords.lng]
        : [defaultCenter.lat, defaultCenter.lng];

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 13,
      zoomControl: true,
      attributionControl: true,
    });

    // OpenStreetMap Free Tile Layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
    }).addTo(map);

    const markersLayer = L.layerGroup().addTo(map);
    markersLayerRef.current = markersLayer;
    mapInstanceRef.current = map;

    // Invalidate size on mount after layout stabilization
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markersLayerRef.current = null;
      radiusCircleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Update Map Markers, User Pin & Radius Circle
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear previous markers
    markersLayer.clearLayers();

    if (radiusCircleRef.current) {
      map.removeLayer(radiusCircleRef.current);
      radiusCircleRef.current = null;
    }

    const boundsPoints: L.LatLngTuple[] = [];

    // Add User Marker & Radius Circle
    if (userCoords && isValidCoordinates(userCoords)) {
      const userPoint: L.LatLngTuple = [userCoords.lat, userCoords.lng];
      boundsPoints.push(userPoint);

      const userMarker = L.marker(userPoint, {
        icon: createUserPinIcon(t.myLocation),
        zIndexOffset: 1000,
      });

      userMarker.bindPopup(`
        <div class="bq-map-popup bq-map-popup--user">
          <strong>${t.myLocation}</strong>
          <p style="margin: 0.2rem 0 0; font-size: 0.8rem; color: #475569;">
            GPS: ${userCoords.lat.toFixed(4)}, ${userCoords.lng.toFixed(4)}
          </p>
        </div>
      `);

      markersLayer.addLayer(userMarker);

      // Render search radius circle if provided
      if (radiusKm && radiusKm > 0) {
        const radiusCircle = L.circle(userPoint, {
          radius: radiusKm * 1000, // convert km to meters
          color: '#059669', // Emerald 600
          weight: 1.5,
          opacity: 0.8,
          fillColor: '#10B981', // Emerald 500
          fillOpacity: 0.08,
          dashArray: '6, 6',
        }).addTo(map);

        radiusCircleRef.current = radiusCircle;
      }
    }

    // Deduplicate stores by unique ID to prevent multiple markers for the same physical store
    const uniqueStoresMap = new Map<string, Store>();
    stores.forEach((store) => {
      if (store && store.id && !uniqueStoresMap.has(store.id)) {
        uniqueStoresMap.set(store.id, store);
      }
    });
    const uniqueStores = Array.from(uniqueStoresMap.values());

    // Add Store Markers
    uniqueStores.forEach((store) => {
      if (!isValidCoordinates(store.coordinates)) return;

      const storePoint: L.LatLngTuple = [store.coordinates.lat, store.coordinates.lng];
      boundsPoints.push(storePoint);

      const isSelected = selectedStoreId === store.id;
      const isCheapest = Boolean(store.isCheapest);
      const isClosest = Boolean(store.isClosest);

      const marker = L.marker(storePoint, {
        icon: createStorePinIcon(
          isSelected,
          store.sourceType || 'birqidir',
          lang,
          isCheapest,
          isClosest
        ),
        zIndexOffset: isSelected ? 600 : isCheapest ? 500 : isClosest ? 400 : 100,
      });

      const distLabel = formatDistance(store.distanceKm, lang);
      const isOsm = store.sourceType === 'openstreetmap';
      const isRealVerified = Boolean(store.isVerified && !store.isDemo);

      const directionsUrl = buildDirectionsUrl(store.coordinates, userCoords);
      const displayName = getSafeStoreName(store.name, lang);
      const displayCategory = translateCategory(store.category, lang);

      let badgeHtml = '';
      if (isOsm) {
        badgeHtml = `<span class="bq-map-popup-source bq-map-popup-source--osm">${t.osmDataSource}</span>`;
      } else if (isRealVerified) {
        badgeHtml = `<span class="bq-map-popup-source bq-map-popup-source--birqidir" style="color: #047857; background-color: #ecfdf5;">✓ ${t.verifiedPartner}</span>`;
      } else if (store.isDemo) {
        badgeHtml = `<span class="bq-map-popup-source" style="color: #6b21a8; background-color: #f3e8ff;">📦 ${t.demoStore}</span>`;
      } else {
        badgeHtml = `<span class="bq-map-popup-source bq-map-popup-source--birqidir" style="color: #b45309; background-color: #fffbeb;">🏪 ${t.unverifiedStore}</span>`;
      }

      // Matched Product Offer section in Popup
      let offerHtml = '';
      if (store.matchedOffer) {
        const offer = store.matchedOffer;
        const formattedPrice =
          typeof offer.price === 'number' && offer.price > 0
            ? `${offer.price.toLocaleString('uz-UZ')} ${offer.currency}`
            : '';

        offerHtml = `
          <div class="bq-map-popup__offer-box">
            <div class="bq-map-popup__offer-name">📦 ${escapeHtml(offer.productName)}</div>
            ${
              formattedPrice
                ? `<div class="bq-map-popup__offer-price-row">
                    <span class="bq-map-popup__offer-price">${escapeHtml(formattedPrice)}</span>
                   </div>`
                : ''
            }
            <div class="bq-map-popup__offer-badges">
              ${isCheapest ? `<span class="bq-map-popup-badge-cheapest">🏆 ${escapeHtml(t.cheapestOfferBadge)}</span>` : ''}
              ${isClosest ? `<span class="bq-map-popup-badge-closest">📍 ${escapeHtml(t.closestStoreBadge)}</span>` : ''}
              <span class="bq-map-popup-badge-stock">${offer.inStock ? '✓ ' + escapeHtml(t.inStockLabel) : escapeHtml(t.outOfStockLabel)}</span>
            </div>
          </div>
        `;
      }

      const popupHtml = `
        <div class="bq-map-popup">
          <div class="bq-map-popup__badge-row">
            ${badgeHtml}
            <span class="bq-map-popup__category">${escapeHtml(displayCategory)}</span>
          </div>
          <div class="bq-map-popup__title">${escapeHtml(displayName)}</div>
          <div class="bq-map-popup__address">
            ${store.district ? `${escapeHtml(store.district)}, ` : ''}${escapeHtml(store.city)}, ${escapeHtml(store.address)}
          </div>
          ${offerHtml}
          ${store.distanceKm !== undefined ? `<div class="bq-map-popup__distance">📍 ${t.distanceLabel(distLabel)}</div>` : ''}
          ${store.phone ? `<a href="tel:${escapeHtml(store.phone)}" class="bq-map-popup__phone">📞 ${escapeHtml(store.phone)}</a>` : ''}
          ${store.openingHours ? `<div class="bq-map-popup__hours">⏰ ${escapeHtml(store.openingHours)}</div>` : ''}
          ${store.description ? `<div class="bq-map-popup__desc">${escapeHtml(store.description)}</div>` : ''}
          <div class="bq-map-popup__actions">
            <a href="${directionsUrl}" target="_blank" rel="noopener noreferrer" class="bq-map-popup__dir-btn">
              🧭 ${t.getDirections}
            </a>
            <a href="/store/${encodeURIComponent(store.id)}" class="bq-map-popup__store-btn">
              🏪 ${lang === 'ru' ? 'Страница магазина' : 'Do‘kon sahifasi'}
            </a>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('click', () => {
        if (onSelectStore) {
          onSelectStore(store);
        }
      });

      markersLayer.addLayer(marker);

      if (isSelected) {
        marker.openPopup();
      }
    });

    // Fit map bounds to show all markers
    if (boundsPoints.length > 1) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (boundsPoints.length === 1) {
      map.setView(boundsPoints[0], 14);
    }
  }, [stores, userCoords, selectedStoreId, radiusKm, onSelectStore, lang, t]);

  return (
    <div className="bq-map-wrapper">
      <div
        ref={mapContainerRef}
        className="bq-map-container"
        style={{ height }}
        role="region"
        aria-label={t.mapRegionAria}
      />
      <div className="bq-map-legend">
        <span className="bq-map-legend-item">
          <span className="bq-map-legend-dot bq-map-legend-dot--user"></span>
          <span>{t.myLocation}</span>
        </span>
        <span className="bq-map-legend-item">
          <span className="bq-map-legend-dot bq-map-legend-dot--store"></span>
          <span>{t.birqidirLegend}</span>
        </span>
        <span className="bq-map-legend-item">
          <span className="bq-map-legend-dot bq-map-legend-dot--osm"></span>
          <span>{t.osmLegend}</span>
        </span>
        {radiusKm && userCoords && (
          <span className="bq-map-legend-item">
            <span className="bq-map-legend-circle"></span>
            <span>{t.radiusLegend(radiusKm)}</span>
          </span>
        )}
      </div>
    </div>
  );
};

function escapeHtml(text?: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
