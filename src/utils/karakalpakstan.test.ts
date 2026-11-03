import { describe, it, expect } from 'vitest';
import {
  KARAKALPAKSTAN_DISTRICTS,
  findDistrictByCoords,
  findDistrictByName,
  isWithinBounds,
} from './karakalpakstanDistricts';
import {
  normalizeSearchQuery,
  cyrillicToLatinUzbek,
  fuzzyMatchTokens,
} from './textNormalization';
import {
  mapOsmCategory,
  detectDistrict,
  transformOsmElement,
  processOsmJson,
  type RawOsmElement,
} from '../../scripts/importOsmPlaces';

describe('Karakalpakstan Administrative & Geographic Utilities', () => {
  it('contains all 16 Karakalpakstan administrative divisions (1 city + 15 districts)', () => {
    expect(KARAKALPAKSTAN_DISTRICTS.length).toBe(16);

    const ids = KARAKALPAKSTAN_DISTRICTS.map((d) => d.id);
    expect(ids).toContain('nukus');
    expect(ids).toContain('xojayli');
    expect(ids).toContain('taxiatosh');
    expect(ids).toContain('qongirot');
    expect(ids).toContain('chimboy');
    expect(ids).toContain('beruniy');
    expect(ids).toContain('tortkol');
    expect(ids).toContain('ellikqala');
    expect(ids).toContain('amudaryo');
    expect(ids).toContain('moynoq');
    expect(ids).toContain('qanlikol');
    expect(ids).toContain('shumanay');
    expect(ids).toContain('kegeyli');
    expect(ids).toContain('taxtakopir');
    expect(ids).toContain('qoraozak');
    expect(ids).toContain('bozatov');
  });

  it('correctly matches district by coordinates for Nukus and Xo‘jayli', () => {
    // Center of Nukus (approx 42.46, 59.61)
    const nukus = findDistrictByCoords(42.4602, 59.6166);
    expect(nukus).toBeDefined();
    expect(nukus?.id).toBe('nukus');

    // Xo'jayli center
    const xojayli = findDistrictByCoords(42.4042, 59.452);
    expect(xojayli).toBeDefined();
    expect(xojayli?.id).toBe('xojayli');
  });

  it('finds district by tolerant multilingual name', () => {
    expect(findDistrictByName('Nukus')?.id).toBe('nukus');
    expect(findDistrictByName('Нөкис')?.id).toBe('nukus');
    expect(findDistrictByName('Кунград')?.id).toBe('qongirot');
    expect(findDistrictByName('Qo‘ng‘irot')?.id).toBe('qongirot');
    expect(findDistrictByName('Qońırat')?.id).toBe('qongirot');
    expect(findDistrictByName('Ходжейли')?.id).toBe('xojayli');
    expect(findDistrictByName('Beruniy')?.id).toBe('beruniy');
  });

  it('checks coordinate bounding box accurately', () => {
    const box = { minLat: 42.0, maxLat: 43.0, minLng: 59.0, maxLng: 60.0 };
    expect(isWithinBounds(42.5, 59.5, box)).toBe(true);
    expect(isWithinBounds(41.9, 59.5, box)).toBe(false);
    expect(isWithinBounds(42.5, 60.5, box)).toBe(false);
  });
});

describe('Multilingual & Cyrillic-Latin Text Normalization', () => {
  it('converts Cyrillic Uzbek / Karakalpak text to standard Latin', () => {
    expect(cyrillicToLatinUzbek('Нукус')).toBe('nukus');
    expect(cyrillicToLatinUzbek('Қоңғирот')).toContain('qon');
    expect(cyrillicToLatinUzbek('Амударё')).toContain('amudaryo');
  });

  it('normalizes Karakalpak special characters ó, ı, ń, ǵ and diverse apostrophes', () => {
    const raw = "Qońırat rayonı, Berdaq kób-kórkʻam";
    const normalized = normalizeSearchQuery(raw);
    expect(normalized).toBe('qonirat rayoni berdaq kob korkam');
  });

  it('performs tolerant token matching regardless of apostrophe style', () => {
    expect(fuzzyMatchTokens("Xo'jayli", 'Xo‘jayli')).toBe(true);
    expect(fuzzyMatchTokens('Qongirot', "Qo'ng'irot")).toBe(true);
    expect(fuzzyMatchTokens('Supermarket', 'supermarket')).toBe(true);
  });
});

describe('OpenStreetMap Place Transformation & Import Logic', () => {
  it('maps raw OSM shop/amenity tags to BirQidir categories and types', () => {
    expect(mapOsmCategory({ shop: 'supermarket' })).toEqual({
      category: 'Supermarket',
      placeType: 'shop',
    });
    expect(mapOsmCategory({ amenity: 'pharmacy' })).toEqual({
      category: 'Dorixona',
      placeType: 'pharmacy',
    });
    expect(mapOsmCategory({ amenity: 'marketplace' })).toEqual({
      category: 'Bozor',
      placeType: 'market',
    });
    expect(mapOsmCategory({ amenity: 'bank' })).toEqual({
      category: 'Bank / Bankomat',
      placeType: 'service',
    });
  });

  it('transforms raw OSM node into a valid BirQidir store model', () => {
    const rawNode: RawOsmElement = {
      type: 'node',
      id: 99912345,
      lat: 42.465,
      lon: 59.612,
      tags: {
        name: 'Nukus Test Apteka',
        'name:uz': 'Nukus Sinov Dorixonasi',
        amenity: 'pharmacy',
        'addr:street': 'Dosnazarov',
        'addr:housenumber': '45',
        phone: '+998612220000',
        opening_hours: '24/7',
      },
    };

    const transformed = transformOsmElement(rawNode);
    expect(transformed).toBeDefined();
    expect(transformed?.id).toBe('osm-node-99912345');
    expect(transformed?.osmId).toBe('node/99912345');
    expect(transformed?.name).toBe('Nukus Sinov Dorixonasi');
    expect(transformed?.category).toBe('Dorixona');
    expect(transformed?.placeType).toBe('pharmacy');
    expect(transformed?.address).toContain('Dosnazarov ko‘chasi, 45');
    expect(transformed?.coordinates.lat).toBe(42.465);
    expect(transformed?.coordinates.lng).toBe(59.612);
    expect(transformed?.phone).toBe('+998612220000');
    expect(transformed?.openingHours).toBe('24/7');
    expect(transformed?.isVerified).toBe(false);
    expect(transformed?.sourceType).toBe('openstreetmap');
    expect(transformed?.metadata.license).toContain('ODbL');
  });

  it('detects district using coordinates and tags', () => {
    // Inside Nukus bounds
    expect(detectDistrict(42.46, 59.61, {})).toBe('Nukus');
    // With explicit tag
    expect(detectDistrict(42.0, 59.0, { 'addr:district': 'Beruniy' })).toBe('Beruniy');
  });

  it('filters out unnamed nodes and deduplicates elements by osmId', () => {
    const elements: RawOsmElement[] = [
      {
        type: 'node',
        id: 111,
        lat: 42.46,
        lon: 59.61,
        tags: { amenity: 'bank' }, // unnamed, falls back to BANK (OSM)
      },
      {
        type: 'node',
        id: 222,
        lat: 42.46,
        lon: 59.61,
        tags: {}, // no tags, filtered out
      },
      {
        type: 'node',
        id: 111,
        lat: 42.46,
        lon: 59.61,
        tags: { amenity: 'bank' }, // duplicate, should be skipped
      },
    ];

    const processed = processOsmJson({ elements });
    expect(processed.length).toBe(1);
    expect(processed[0].id).toBe('osm-node-111');
  });
});
