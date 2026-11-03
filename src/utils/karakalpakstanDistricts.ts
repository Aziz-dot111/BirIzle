import type { Coordinates } from '@/types';
import { normalizeSearchQuery } from './textNormalization';

export interface KarakalpakstanDistrict {
  id: string;
  name: string;
  nameUz: string;
  nameKaa: string;
  nameRu: string;
  centerCoordinates: Coordinates;
  type: 'city' | 'district';
  bounds?: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
}

/**
 * Official administrative divisions of the Republic of Karakalpakstan (16 entities: 1 republican city + 15 districts/cities)
 */
export const KARAKALPAKSTAN_DISTRICTS: KarakalpakstanDistrict[] = [
  {
    id: 'nukus',
    name: 'Nukus shahri',
    nameUz: 'Nukus shahri',
    nameKaa: 'Nókis qalası',
    nameRu: 'город Нукус',
    centerCoordinates: { lat: 42.4619, lng: 59.6166 },
    type: 'city',
    bounds: { minLat: 42.35, maxLat: 42.55, minLng: 59.5, maxLng: 59.75 },
  },
  {
    id: 'xojayli',
    name: 'Xo‘jayli tumani',
    nameUz: 'Xo‘jayli tumani',
    nameKaa: 'Xojeli rayonı',
    nameRu: 'Ходжейлийский район',
    centerCoordinates: { lat: 42.4042, lng: 59.4583 },
    type: 'district',
    bounds: { minLat: 42.35, maxLat: 42.48, minLng: 59.35, maxLng: 59.55 },
  },
  {
    id: 'taxiatosh',
    name: 'Taxiatosh shahri',
    nameUz: 'Taxiatosh shahri',
    nameKaa: 'Taxiatash qalası',
    nameRu: 'город Тахиаташ',
    centerCoordinates: { lat: 42.3275, lng: 59.5539 },
    type: 'city',
    bounds: { minLat: 42.25, maxLat: 42.38, minLng: 59.5, maxLng: 59.62 },
  },
  {
    id: 'qongirot',
    name: 'Qo‘ng‘irot tumani',
    nameUz: 'Qo‘ng‘irot tumani',
    nameKaa: 'Qońırat rayonı',
    nameRu: 'Кунградский район',
    centerCoordinates: { lat: 43.0417, lng: 58.8417 },
    type: 'district',
    bounds: { minLat: 42.9, maxLat: 43.2, minLng: 58.7, maxLng: 59.1 },
  },
  {
    id: 'chimboy',
    name: 'Chimboy tumani',
    nameUz: 'Chimboy tumani',
    nameKaa: 'Shımbay rayonı',
    nameRu: 'Чимбайский район',
    centerCoordinates: { lat: 42.9333, lng: 59.7667 },
    type: 'district',
    bounds: { minLat: 42.85, maxLat: 43.05, minLng: 59.65, maxLng: 59.9 },
  },
  {
    id: 'beruniy',
    name: 'Beruniy tumani',
    nameUz: 'Beruniy tumani',
    nameKaa: 'Beruniy rayonı',
    nameRu: 'Берунийский район',
    centerCoordinates: { lat: 41.6917, lng: 60.7500 },
    type: 'district',
    bounds: { minLat: 41.6, maxLat: 41.8, minLng: 60.65, maxLng: 60.9 },
  },
  {
    id: 'tortkol',
    name: 'To‘rtko‘l tumani',
    nameUz: 'To‘rtko‘l tumani',
    nameKaa: 'Tórtkúl rayonı',
    nameRu: 'Турткульский район',
    centerCoordinates: { lat: 41.5667, lng: 61.0000 },
    type: 'district',
    bounds: { minLat: 41.5, maxLat: 41.65, minLng: 60.9, maxLng: 61.15 },
  },
  {
    id: 'ellikqala',
    name: 'Ellikqala tumani (Bo‘ston)',
    nameUz: 'Ellikqala tumani (Bo‘ston)',
    nameKaa: 'Ellikqala rayonı',
    nameRu: 'Элликкалинский район',
    centerCoordinates: { lat: 41.8333, lng: 60.9167 },
    type: 'district',
    bounds: { minLat: 41.75, maxLat: 41.95, minLng: 60.8, maxLng: 61.05 },
  },
  {
    id: 'amudaryo',
    name: 'Amudaryo tumani (Mang‘it)',
    nameUz: 'Amudaryo tumani (Mang‘it)',
    nameKaa: 'Ámiwdárya rayonı',
    nameRu: 'Амударьинский район',
    centerCoordinates: { lat: 42.1167, lng: 60.0667 },
    type: 'district',
    bounds: { minLat: 42.0, maxLat: 42.25, minLng: 59.95, maxLng: 60.2 },
  },
  {
    id: 'moynoq',
    name: 'Mo‘ynoq tumani',
    nameUz: 'Mo‘ynoq tumani',
    nameKaa: 'Moynaq rayonı',
    nameRu: 'Муйнакский район',
    centerCoordinates: { lat: 43.7667, lng: 59.0333 },
    type: 'district',
    bounds: { minLat: 43.65, maxLat: 43.9, minLng: 58.9, maxLng: 59.25 },
  },
  {
    id: 'kegeyli',
    name: 'Kegeyli tumani',
    nameUz: 'Kegeyli tumani',
    nameKaa: 'Kegeyli rayonı',
    nameRu: 'Кегейлийский район',
    centerCoordinates: { lat: 42.7833, lng: 59.6000 },
    type: 'district',
    bounds: { minLat: 42.7, maxLat: 42.9, minLng: 59.5, maxLng: 59.75 },
  },
  {
    id: 'qanlikol',
    name: 'Qanliko‘l tumani',
    nameUz: 'Qanliko‘l tumani',
    nameKaa: 'Qanlıkól rayonı',
    nameRu: 'Канлыкульский район',
    centerCoordinates: { lat: 42.7833, lng: 59.1333 },
    type: 'district',
    bounds: { minLat: 42.7, maxLat: 42.95, minLng: 59.05, maxLng: 59.3 },
  },
  {
    id: 'shumanay',
    name: 'Shumanay tumani',
    nameUz: 'Shumanay tumani',
    nameKaa: 'Shomanay rayonı',
    nameRu: 'Шуманайский район',
    centerCoordinates: { lat: 42.5000, lng: 58.9167 },
    type: 'district',
    bounds: { minLat: 42.45, maxLat: 42.7, minLng: 58.8, maxLng: 59.1 },
  },
  {
    id: 'taxtakopir',
    name: 'Taxtako‘pir tumani',
    nameUz: 'Taxtako‘pir tumani',
    nameKaa: 'Taxtakópir rayonı',
    nameRu: 'Тахтакупырский район',
    centerCoordinates: { lat: 43.0333, lng: 60.2833 },
    type: 'district',
    bounds: { minLat: 42.95, maxLat: 43.2, minLng: 60.15, maxLng: 60.45 },
  },
  {
    id: 'qoraozak',
    name: 'Qorao‘zak tumani',
    nameUz: 'Qorao‘zak tumani',
    nameKaa: 'Qaraózek rayonı',
    nameRu: 'Караузякский район',
    centerCoordinates: { lat: 42.5833, lng: 59.9000 },
    type: 'district',
    bounds: { minLat: 42.5, maxLat: 42.75, minLng: 59.8, maxLng: 60.1 },
  },
  {
    id: 'bozatov',
    name: 'Bo‘zatov tumani',
    nameUz: 'Bo‘zatov tumani',
    nameKaa: 'Bozataw rayonı',
    nameRu: 'Бозатауский район',
    centerCoordinates: { lat: 43.0000, lng: 59.3500 },
    type: 'district',
    bounds: { minLat: 42.85, maxLat: 43.25, minLng: 59.2, maxLng: 59.7 },
  },
];

/**
 * Bounding box for the Republic of Karakalpakstan
 */
export const KARAKALPAKSTAN_BOUNDS = {
  minLat: 41.0,
  maxLat: 45.6,
  minLng: 56.0,
  maxLng: 62.5,
  center: { lat: 42.4619, lng: 59.6166 },
};

export function isWithinBounds(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
): boolean {
  return lat >= bounds.minLat && lat <= bounds.maxLat && lng >= bounds.minLng && lng <= bounds.maxLng;
}

export function findDistrictByCoords(lat: number, lng: number): KarakalpakstanDistrict | undefined {
  for (const d of KARAKALPAKSTAN_DISTRICTS) {
    if (d.bounds && isWithinBounds(lat, lng, d.bounds)) {
      return d;
    }
  }
  return undefined;
}

export function findDistrictByName(name: string): KarakalpakstanDistrict | undefined {
  if (!name) return undefined;
  const clean = normalizeSearchQuery(name);
  if (!clean) return undefined;

  return KARAKALPAKSTAN_DISTRICTS.find((d) => {
    const uz = normalizeSearchQuery(d.nameUz);
    const kaa = normalizeSearchQuery(d.nameKaa);
    const ru = normalizeSearchQuery(d.nameRu);
    const id = normalizeSearchQuery(d.id);

    return (
      uz.includes(clean) ||
      kaa.includes(clean) ||
      ru.includes(clean) ||
      id.includes(clean) ||
      clean.includes(id)
    );
  });
}
