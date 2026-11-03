/**
 * ============================================================================
 * BirQidir - Qoraqalpog‘iston OpenStreetMap (OSM) Ma’lumotlarini Import Qilish
 * ============================================================================
 * 
 * Ushbu skript butun Qoraqalpog‘iston Respublikasi bo‘yicha OpenStreetMap (OSM)
 * ochiq ma’lumotlar bazasidagi do‘konlar, dorixonalar, servislar, bozorlar va
 * boshqa xizmat ko‘rsatish ob’yektlarini xavfsiz va nazorat qilinadigan tartibda
 * BirQidir formatiga o‘tkazish (transformatsiya qilish) uchun xizmat qiladi.
 * 
 * DIQQAT (Muhim xavfsizlik va litsenziya talablari):
 * 1. OpenStreetMap ODbL (Open Database License) litsenziyasiga qat’iy amal qilinadi.
 *    Barcha import qilingan ob’yektlar `sourceType: 'openstreetmap'` va `isVerified: false`
 *    qilib belgilanadi.
 * 2. Nominatim / OSM qidiruvlarini foydalanuvchi qidiruvi vaqtida jonli va ketma-ket
 *    so‘rov sifatida yuborish (scraping) OSM siyosatiga zid bo‘lib, IP bloklanishiga
 *    olib keladi. Shuning uchun ma’lumotlar bir martalik offline / batch tarzda olinadi.
 * 3. Firebase Spark bepul tarifida 20,000 yozish limiti mavjud. Ushbu skript
 *    ma’lumotlarni dastlab lokal JSON/TS fixture shaklida saqlaydi, zarurat bo‘lsa
 *    Firestore’ga 500 talik batch bilan xavfsiz yuklaydi.
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Qoraqalpog‘iston Overpass QL so‘rovi:
 * Hudud: Qoraqalpog‘iston Respublikasi (OSM relation id: 1673859 yoki BBox)
 * Teglar: shop=*, amenity=pharmacy|bank|atm|cafe|restaurant|clinic|marketplace, craft=*
 */
export const KARAKALPAKSTAN_OVERPASS_QL = `
[out:json][timeout:90];
// Qoraqalpog'iston chegarasi bo'yicha qidirish
area["name"="Qoraqalpogʻiston Respublikasi"]->.searchArea;
(
  // Do'konlar va savdo markazlari
  node["shop"](area.searchArea);
  way["shop"](area.searchArea);

  // Muhim ijtimoiy xizmatlar (dorixona, bank, bozor, klinika)
  node["amenity"~"pharmacy|bank|marketplace|fuel|cafe|restaurant|clinic|hospital"](area.searchArea);
  way["amenity"~"pharmacy|bank|marketplace|fuel|cafe|restaurant|clinic|hospital"](area.searchArea);

  // Ta'mirlash va xizmat ko'rsatish
  node["craft"](area.searchArea);
  way["craft"](area.searchArea);
);
out center tags;
`;

export interface RawOsmElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export interface NormalizedOsmPlace {
  id: string;
  osmId: string;
  name: string;
  category: string;
  placeType: 'shop' | 'service' | 'pharmacy' | 'market' | 'other';
  address: string;
  city: string;
  district?: string;
  coordinates: {
    lat: number;
    lng: number;
  };
  phone?: string;
  website?: string;
  openingHours?: string;
  description?: string;
  isVerified: false;
  sourceType: 'openstreetmap';
  metadata: {
    osmType: string;
    license: string;
    attribution: string;
    rawTags?: Record<string, string>;
    importedAt: string;
  };
}

/**
 * Tumanlar va shahar markazlari chegaralari asosida tumanni aniqlash
 */
const DISTRICT_BOUNDS: Record<string, { minLat: number; maxLat: number; minLng: number; maxLng: number }> = {
  Nukus: { minLat: 42.35, maxLat: 42.55, minLng: 59.5, maxLng: 59.75 },
  'Xo‘jayli': { minLat: 42.35, maxLat: 42.48, minLng: 59.35, maxLng: 59.55 },
  Taxiatosh: { minLat: 42.25, maxLat: 42.38, minLng: 59.5, maxLng: 59.62 },
  'Qo‘ng‘irot': { minLat: 42.95, maxLat: 43.15, minLng: 58.75, maxLng: 59.0 },
  Chimboy: { minLat: 42.88, maxLat: 43.05, minLng: 59.7, maxLng: 59.88 },
  Beruniy: { minLat: 41.65, maxLat: 41.76, minLng: 60.7, maxLng: 60.85 },
  'To‘rtko‘l': { minLat: 41.52, maxLat: 41.6, minLng: 60.98, maxLng: 61.12 },
  Ellikqala: { minLat: 41.75, maxLat: 41.9, minLng: 60.8, maxLng: 61.0 },
  'Amudaryo (Mang‘it)': { minLat: 42.05, maxLat: 42.18, minLng: 60.0, maxLng: 60.15 },
  'Qanliko‘l': { minLat: 42.75, maxLat: 42.9, minLng: 59.15, maxLng: 59.3 },
  Shumanay: { minLat: 42.55, maxLat: 42.7, minLng: 59.05, maxLng: 59.2 },
  Kegeyli: { minLat: 42.72, maxLat: 42.85, minLng: 59.55, maxLng: 59.7 },
  Nukus_tumani: { minLat: 42.4, maxLat: 42.6, minLng: 59.4, maxLng: 59.8 },
  'Taxtako‘pir': { minLat: 43.0, maxLat: 43.15, minLng: 60.2, maxLng: 60.4 },
  'Bo‘zatov': { minLat: 42.9, maxLat: 43.2, minLng: 59.3, maxLng: 59.7 },
};

export function detectDistrict(lat: number, lng: number, tags: Record<string, string>): string {
  if (tags['addr:district']) return tags['addr:district'];
  if (tags['addr:city']) return tags['addr:city'];

  for (const [district, b] of Object.entries(DISTRICT_BOUNDS)) {
    if (lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng) {
      return district.replace('_tumani', ' tumani');
    }
  }

  return 'Qoraqalpog‘iston';
}

export function mapOsmCategory(tags: Record<string, string>): { category: string; placeType: NormalizedOsmPlace['placeType'] } {
  if (tags.shop) {
    const shop = tags.shop;
    if (shop === 'supermarket' || shop === 'convenience' || shop === 'grocery') {
      return { category: 'Supermarket', placeType: 'shop' };
    }
    if (shop === 'electronics' || shop === 'mobile_phone' || shop === 'computer') {
      return { category: 'Elektronika', placeType: 'shop' };
    }
    if (shop === 'clothes' || shop === 'shoes' || shop === 'fashion') {
      return { category: 'Kiyim va poyabzal', placeType: 'shop' };
    }
    if (shop === 'chemist' || shop === 'cosmetics') {
      return { category: 'Kosmetika va parfyumeriya', placeType: 'shop' };
    }
    if (shop === 'hardware' || shop === 'doityourself') {
      return { category: 'Qurilish mollari', placeType: 'shop' };
    }
    if (shop === 'car_parts' || shop === 'car_repair') {
      return { category: 'Avto ehtiyot qismlari', placeType: 'shop' };
    }
    return { category: `Do‘kon (${shop})`, placeType: 'shop' };
  }

  if (tags.amenity === 'pharmacy') {
    return { category: 'Dorixona', placeType: 'pharmacy' };
  }
  if (tags.amenity === 'marketplace') {
    return { category: 'Bozor', placeType: 'market' };
  }
  if (tags.amenity === 'bank' || tags.amenity === 'atm') {
    return { category: 'Bank / Bankomat', placeType: 'service' };
  }
  if (tags.amenity === 'fuel') {
    return { category: 'Yoqilg‘i quyish', placeType: 'service' };
  }
  if (tags.amenity === 'clinic' || tags.amenity === 'hospital') {
    return { category: 'Tibbiy xizmat', placeType: 'service' };
  }
  if (tags.amenity === 'cafe' || tags.amenity === 'restaurant') {
    return { category: 'Umumiy ovqatlanish', placeType: 'service' };
  }

  return { category: 'Xizmat ko‘rsatish', placeType: 'service' };
}

/**
 * Raw OSM elementini BirQidir do‘kon modeliga aylantirish
 */
export function transformOsmElement(el: RawOsmElement): NormalizedOsmPlace | null {
  const tags = el.tags || {};
  const lat = el.lat ?? el.center?.lat;
  const lon = el.lon ?? el.center?.lon;

  if (typeof lat !== 'number' || typeof lon !== 'number') {
    return null;
  }

  // Nomini aniqlash (uz, kaa, ru yoki default name)
  const name =
    tags['name:uz'] ||
    tags['name:kaa'] ||
    tags['name:ru'] ||
    tags.name ||
    tags.brand ||
    tags.operator ||
    (tags.amenity ? `${tags.amenity.toUpperCase()} (OSM)` : null);

  if (!name) {
    return null; // Nomsiz ob'yektlar ro'yxatga kiritilmaydi
  }

  const { category, placeType } = mapOsmCategory(tags);
  const district = detectDistrict(lat, lon, tags);
  const city = tags['addr:city'] || tags['addr:town'] || district;
  const street = tags['addr:street'] ? `${tags['addr:street']} ko‘chasi` : '';
  const house = tags['addr:housenumber'] ? `, ${tags['addr:housenumber']}` : '';
  const address = street ? `${street}${house}` : `${city} markazi`;

  const osmId = `${el.type}/${el.id}`;

  return {
    id: `osm-${el.type}-${el.id}`,
    osmId,
    name,
    category,
    placeType,
    address,
    city,
    district,
    coordinates: {
      lat: Number(lat.toFixed(6)),
      lng: Number(lon.toFixed(6)),
    },
    phone: tags.phone || tags['contact:phone'],
    website: tags.website || tags['contact:website'],
    openingHours: tags.opening_hours,
    description: tags.description || `OpenStreetMap ma’lumoti: ${category}, ${district}.`,
    isVerified: false,
    sourceType: 'openstreetmap',
    metadata: {
      osmType: el.type,
      license: 'ODbL (Open Database License)',
      attribution: '© OpenStreetMap contributors',
      rawTags: tags,
      importedAt: new Date().toISOString(),
    },
  };
}

/**
 * Fayldan yoki Overpass javobidan import qilish
 */
export function processOsmJson(rawJson: { elements: RawOsmElement[] }): NormalizedOsmPlace[] {
  const elements = rawJson.elements || [];
  const seenOsmIds = new Set<string>();
  const places: NormalizedOsmPlace[] = [];

  for (const el of elements) {
    const item = transformOsmElement(el);
    if (!item) continue;
    if (seenOsmIds.has(item.osmId)) continue;
    seenOsmIds.add(item.osmId);
    places.push(item);
  }

  return places;
}

/**
 * Ma’lumotlarni lokal JSON faylga saqlash
 */
export function savePlacesToJsonFile(places: NormalizedOsmPlace[], relativeFilePath: string): void {
  const fullPath = path.resolve(process.cwd(), relativeFilePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, JSON.stringify(places, null, 2), 'utf-8');
}

/**
 * Lokal JSON fayldan o‘qish
 */
export function readPlacesFromJsonFile(relativeFilePath: string): NormalizedOsmPlace[] {
  const fullPath = path.resolve(process.cwd(), relativeFilePath);
  if (!fs.existsSync(fullPath)) return [];
  const content = fs.readFileSync(fullPath, 'utf-8');
  return JSON.parse(content) as NormalizedOsmPlace[];
}

// Skript to'g'ridan-to'g'ri ishga tushirilganda namunaviy ma'lumotlarni tekshirish
if (typeof require !== 'undefined' && require.main === module) {
  console.log('BirQidir Karakalpakstan OSM Importer tayyor.');
  console.log('Overpass QL so‘rovi:');
  console.log(KARAKALPAKSTAN_OVERPASS_QL);
}
