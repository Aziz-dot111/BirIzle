import { describe, it, expect, vi, beforeEach } from 'vitest';
import { executeGeolocationDetection } from './useGeolocation';
import { CITY_CENTROIDS, isValidCoordinates } from '@/utils/geo';

describe('useGeolocation & executeGeolocationDetection', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('successfully returns GPS coordinates on high-accuracy Stage 1', async () => {
    const mockPosition = {
      coords: {
        latitude: 42.4619,
        longitude: 59.6166,
      },
    } as unknown as GeolocationPosition;

    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn((success) => {
        success(mockPosition);
      }),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, true);

    expect(result.coords).toEqual({ lat: 42.4619, lng: 59.6166 });
    expect(result.errorType).toBeNull();
    expect(result.errorMessage).toBeNull();
    expect(mockGeoApi.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('handles PERMISSION_DENIED without retrying Stage 2', async () => {
    const permError: GeolocationPositionError = {
      code: 1, // PERMISSION_DENIED
      message: 'User denied geolocation prompt',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn((_success, error) => {
        if (error) error(permError);
      }),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, true);

    expect(result.coords).toBeNull();
    expect(result.errorType).toBe('PERMISSION_DENIED');
    expect(result.errorMessage).toContain('Joylashuv ruxsati rad etildi');
    // Must NOT retry Stage 2 on permission rejection!
    expect(mockGeoApi.getCurrentPosition).toHaveBeenCalledTimes(1);
  });

  it('falls back to Stage 2 (low accuracy) when Stage 1 times out, and succeeds if Stage 2 provides coords', async () => {
    const timeoutError: GeolocationPositionError = {
      code: 3, // TIMEOUT
      message: 'GPS timeout',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const fallbackPosition = {
      coords: {
        latitude: 42.4552,
        longitude: 59.612,
      },
    } as unknown as GeolocationPosition;

    let attemptCount = 0;
    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn((success, error, options) => {
        attemptCount++;
        if (attemptCount === 1) {
          // Stage 1: High accuracy fails with TIMEOUT
          expect(options?.enableHighAccuracy).toBe(true);
          if (error) error(timeoutError);
        } else {
          // Stage 2: Fallback with low accuracy succeeds
          expect(options?.enableHighAccuracy).toBe(false);
          success(fallbackPosition);
        }
      }),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, true);

    expect(attemptCount).toBe(2);
    expect(result.coords).toEqual({ lat: 42.4552, lng: 59.612 });
    expect(result.errorType).toBeNull();
  });

  it('returns TIMEOUT error if both Stage 1 and Stage 2 time out', async () => {
    const timeoutError: GeolocationPositionError = {
      code: 3, // TIMEOUT
      message: 'Stage timed out',
      PERMISSION_DENIED: 1,
      POSITION_UNAVAILABLE: 2,
      TIMEOUT: 3,
    };

    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn((_success, error) => {
        if (error) error(timeoutError);
      }),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, true);

    expect(result.coords).toBeNull();
    expect(result.errorType).toBe('TIMEOUT');
    expect(result.errorMessage).toContain('aniqlash vaqti tugadi');
  });

  it('rejects unsecure contexts with INSECURE_CONTEXT error', async () => {
    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn(),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, false);

    expect(result.coords).toBeNull();
    expect(result.errorType).toBe('INSECURE_CONTEXT');
    expect(mockGeoApi.getCurrentPosition).not.toHaveBeenCalled();
  });

  it('returns NOT_SUPPORTED if geolocation API is absent', async () => {
    const result = await executeGeolocationDetection(undefined, true);

    expect(result.coords).toBeNull();
    expect(result.errorType).toBe('NOT_SUPPORTED');
  });

  it('disallows (0, 0) Null Island coordinates returned by erratic GPS', async () => {
    const invalidPosition = {
      coords: {
        latitude: 0,
        longitude: 0,
      },
    } as unknown as GeolocationPosition;

    const mockGeoApi: Partial<Geolocation> = {
      getCurrentPosition: vi.fn((success) => {
        success(invalidPosition);
      }),
    };

    const result = await executeGeolocationDetection(mockGeoApi as Geolocation, true);

    expect(result.coords).toBeNull();
    expect(result.errorType).toBe('POSITION_UNAVAILABLE');
    expect(result.errorMessage).toContain('noto‘g‘ri bo‘lib chiqdi');
  });

  it('supports regional fallback via CITY_CENTROIDS when user declines GPS', () => {
    const nukusCentroid = CITY_CENTROIDS.Nukus;
    expect(isValidCoordinates(nukusCentroid)).toBe(true);
    expect(nukusCentroid.lat).toBeCloseTo(42.4619, 3);
    expect(nukusCentroid.lng).toBeCloseTo(59.6166, 3);

    const xojayliCentroid = CITY_CENTROIDS['Xo‘jayli'];
    expect(isValidCoordinates(xojayliCentroid)).toBe(true);
  });
});
