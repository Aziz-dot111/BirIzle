import { useState, useCallback, useEffect } from 'react';
import type { Coordinates, GeolocationErrorType } from '@/types';
import { isValidCoordinates, CITY_CENTROIDS } from '@/utils/geo';

export type { GeolocationErrorType };

export interface GeolocationDetectionResult {
  coords: Coordinates | null;
  errorType: GeolocationErrorType | null;
  errorMessage: string | null;
}

/**
 * Executes multi-stage geolocation resolution:
 * Stage 1: High accuracy GPS attempt (6000 ms)
 * Stage 2: Low accuracy / network fallback (5000 ms) if timed out or position unavailable
 * Terminates immediately without retry on user PERMISSION_DENIED.
 * Never uploads coordinates to servers or Firestore.
 */
export async function executeGeolocationDetection(
  geoApi?: Geolocation,
  isSecure: boolean = true
): Promise<GeolocationDetectionResult> {
  // 1. Check browser support
  if (!geoApi) {
    return {
      coords: null,
      errorType: 'NOT_SUPPORTED',
      errorMessage:
        'Brauzeringizda GPS geolokatsiya qo‘llab-quvvatlanmaydi. Iltimos, hududingizni ro‘yxatdan tanlang.',
    };
  }

  // 2. Check secure context
  if (!isSecure) {
    return {
      coords: null,
      errorType: 'INSECURE_CONTEXT',
      errorMessage:
        'Geolokatsiya xavfsizlik talablariga ko‘ra faqat HTTPS yoki localhost manzilida ishlaydi.',
    };
  }

  const getPositionAttempt = (options: PositionOptions): Promise<GeolocationPosition> => {
    return new Promise<GeolocationPosition>((resolve, reject) => {
      geoApi.getCurrentPosition(resolve, reject, options);
    });
  };

  try {
    let position: GeolocationPosition;

    try {
      // Stage 1: High accuracy attempt (6000 ms)
      position = await getPositionAttempt({
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      });
    } catch (firstErr: unknown) {
      const geoErr = firstErr as GeolocationPositionError;

      // If permission was denied by the user, do not retry
      if (geoErr && geoErr.code === geoErr.PERMISSION_DENIED) {
        throw geoErr;
      }

      // If timed out or unavailable on high accuracy, attempt Stage 2 with lower accuracy
      if (geoErr && (geoErr.code === geoErr.TIMEOUT || geoErr.code === geoErr.POSITION_UNAVAILABLE)) {
        console.info(
          '[BirQidir Geolocation] High accuracy GPS timed out or unavailable. Trying network/low-accuracy fallback (5000ms)...'
        );
        position = await getPositionAttempt({
          enableHighAccuracy: false,
          timeout: 5000,
          maximumAge: 120000,
        });
      } else {
        throw firstErr;
      }
    }

    const detected: Coordinates = {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
    };

    if (!isValidCoordinates(detected)) {
      return {
        coords: null,
        errorType: 'POSITION_UNAVAILABLE',
        errorMessage: 'GPS dan olingan koordinatalar noto‘g‘ri bo‘lib chiqdi.',
      };
    }

    return {
      coords: detected,
      errorType: null,
      errorMessage: null,
    };
  } catch (err: unknown) {
    const geoErr = err as GeolocationPositionError;

    if (geoErr && typeof geoErr.code === 'number') {
      switch (geoErr.code) {
        case geoErr.PERMISSION_DENIED:
          return {
            coords: null,
            errorType: 'PERMISSION_DENIED',
            errorMessage:
              'Joylashuv ruxsati rad etildi. Brauzer sozlamalaridan geolokatsiyaga ruxsat bering yoki hududni qo‘lda tanlang.',
          };

        case geoErr.TIMEOUT:
          return {
            coords: null,
            errorType: 'TIMEOUT',
            errorMessage:
              'Joylashuvni aniqlash vaqti tugadi (tarmoq yoki GPS signali sekin). Shaharni qo‘lda tanlashingiz yoki qaytadan urinishingiz mumkin.',
          };

        case geoErr.POSITION_UNAVAILABLE:
        default:
          return {
            coords: null,
            errorType: 'POSITION_UNAVAILABLE',
            errorMessage:
              'GPS signali topilmadi yoki qurilmangiz joylashuvni aniqlay olmadi. Shaharni qo‘lda tanlashingiz mumkin.',
          };
      }
    }

    return {
      coords: null,
      errorType: 'POSITION_UNAVAILABLE',
      errorMessage:
        'Geolokatsiyani aniqlashda kutilmagan xatolik yuz berdi. Shaharni qo‘lda tanlang.',
    };
  }
}

export interface GeolocationState {
  coords: Coordinates | null;
  isLocating: boolean;
  errorType: GeolocationErrorType | null;
  errorMessage: string | null;
  source: 'gps' | 'manual' | null;
  activeCity: string | null;
  detectLocation: () => Promise<Coordinates | null>;
  setManualCity: (cityName: string) => Coordinates | null;
  clearLocation: () => void;
}

const STORAGE_KEY = 'bq_user_location';

/**
 * Custom React hook managing browser geolocation with friendly localized error messages,
 * manual city fallback, and session-only memory.
 * Never uploads coordinates to Firestore or external servers without explicit user actions.
 */
export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<Coordinates | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isValidCoordinates(parsed?.coords)) {
          return parsed.coords;
        }
      }
    } catch {
      // Ignore sessionStorage parsing errors
    }
    return null;
  });

  const [source, setSource] = useState<'gps' | 'manual' | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.source || null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [activeCity, setActiveCity] = useState<string | null>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.activeCity || null;
      }
    } catch {
      // Ignore
    }
    return null;
  });

  const [isLocating, setIsLocating] = useState(false);
  const [errorType, setErrorType] = useState<GeolocationErrorType | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync session storage
  useEffect(() => {
    try {
      if (coords) {
        sessionStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ coords, source, activeCity })
        );
      } else {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }, [coords, source, activeCity]);

  /**
   * Triggers device GPS query via navigator.geolocation.getCurrentPosition
   * Only called on explicit user action (e.g. clicking the "Joylashuvimni aniqlash" button).
   */
  const detectLocation = useCallback(async (): Promise<Coordinates | null> => {
    setErrorType(null);
    setErrorMessage(null);

    // Check secure context
    const isLocalhost =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '[::1]');
    const isSecure =
      typeof window !== 'undefined' &&
      (window.isSecureContext || window.location.protocol === 'https:' || isLocalhost);

    setIsLocating(true);
    const result = await executeGeolocationDetection(
      typeof navigator !== 'undefined' ? navigator.geolocation : undefined,
      isSecure
    );
    setIsLocating(false);

    if (result.coords) {
      setCoords(result.coords);
      setSource('gps');
      setActiveCity(null);
      setErrorType(null);
      setErrorMessage(null);
      return result.coords;
    }

    setErrorType(result.errorType);
    setErrorMessage(result.errorMessage);
    return null;
  }, []);

  /**
   * Sets user's reference location to a regional city centroid
   * when GPS is unavailable or declined by user.
   */
  const setManualCity = useCallback((cityName: string): Coordinates | null => {
    const cityCoord = CITY_CENTROIDS[cityName];
    if (cityCoord && isValidCoordinates(cityCoord)) {
      setCoords(cityCoord);
      setSource('manual');
      setActiveCity(cityName);
      setErrorType(null);
      setErrorMessage(null);
      return cityCoord;
    }
    return null;
  }, []);

  /**
   * Clears currently stored user location
   */
  const clearLocation = useCallback(() => {
    setCoords(null);
    setSource(null);
    setActiveCity(null);
    setErrorType(null);
    setErrorMessage(null);
  }, []);

  return {
    coords,
    isLocating,
    errorType,
    errorMessage,
    source,
    activeCity,
    detectLocation,
    setManualCity,
    clearLocation,
  };
}
