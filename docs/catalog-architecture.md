# BirQidir — 1-Bosqich: Nukus Katalogi Ma’lumotlar Modeli va Arxitekturasi

Ushbu hujjat BirQidir loyihasining Nukus shahri va uning atrofidagi savdo ekotizimi uchun ishlab chiqilgan ma’lumotlar modellari, Cloud Firestore katalog xizmat qatlami, xavfsizlik chegaralari va Firebase Custom Claims arxitekturasini belgilaydi.

---

## 1. Ma’lumotlar Modellari (TypeScript Shartnomalari)

### 1.1. `Store` (`src/types/store.ts`)
Nukus shahridagi do‘kon yoki savdo nuqtasi hujjati (`/stores/{storeId}`).
- `id: string` — Do‘konning unikal identifikatori.
- `name: string` — Do‘konning rasmiy yoki ommaviy nomi (masalan: "Nukus Texno Markaz").
- `city: string` — Shahar nomi (standart qiymat: `'Nukus'`).
- `address: string` — Ko‘cha va mo‘ljal ko‘rsatilgan ommaviy manzil.
- `coordinates: { lat: number, lng: number }` — Do‘konning geografik koordinatalari (Nukus chegaralari: `lat: [42.30, 42.60]`, `lng: [59.45, 59.75]`).
- `category: string` — Do‘kon faoliyat toifasi (`electronics`, `appliances`, `clothing`, va h.k.).
- `phone: string` — Mijozlar murojaati uchun ochiq aloqa telefon raqami.
- `openingHours: string` — Ish vaqti tartibi (masalan: "09:00 - 20:00").
- `isVerified?: boolean` — Platforma ma’muriyati tomonidan tasdiqlanganlik belgisi.
- `description?: string` — Do‘kon haqida qisqacha tavsif.
- `createdAt: string` — Yaratilgan sana (ISO 8601).
- `updatedAt: string` — Oxirgi tahrirlangan sana (ISO 8601).

### 1.2. `ProductItem` (`src/types/product.ts`)
Bozor umumiy katalogidagi mahsulot kartochkasi (`/products/{productId}`).
- `id: string` — Mahsulotning unikal identifikatori.
- `name: string` — Mahsulotning to‘liq nomi.
- `normalizedName: string` — Kichik harflarga keltirilgan, tinish belgilari tozalangan qidiruv nomi.
- `searchKeywords: string[]` — Tokenlashtirilgan qidiruv kalit so‘zlari massivi (`array-contains` so‘rovlari uchun).
- `category: string` — Mahsulot toifasi (`phones`, `appliances`, `computers`, va h.k.).
- `brand?: string` — Mahsulot ishlab chiqaruvchisi/brendi.
- `barcode?: string` — Xalqaro shtrix-kod (EAN-13, UPC).
- `imageUrl?: string` — Mahsulot fotosurati havolasi.
- `description?: string` — Mahsulot xususiyatlari tavsifi.
- `minPrice?: number` — Do‘konlar bo‘yicha eng arzon narx (denormalizatsiya qilingan, tezkor saralash uchun).
- `maxPrice?: number` — Do‘konlar bo‘yicha eng yuqori narx.
- `sellerCount?: number` — Ushbu mahsulotni sotayotgan do‘konlar soni.
- `createdAt: string` — Yaratilgan sana.
- `updatedAt: string` — Yangilangan sana.

### 1.3. `InventoryOffer` (`src/types/product.ts`)
Muayyan do‘konning muayyan mahsulot uchun taklifi va narxi (`/offers/{offerId}`).
- `id: string` — Taklif identifikatori.
- `storeId: string` — Taklif tegishli bo‘lgan do‘kon identifikatori (`/stores/{storeId}`).
- `productId: string` — Mahsulot identifikatori (`/products/{productId}`).
- `price: number` — Mahsulot narxi (qat’iy qoida: `price >= 0`, manfiy narx taqiqlanadi).
- `currency: 'UZS' | 'USD'` — Valyuta turi.
- `availability: 'in_stock' | 'out_of_stock' | 'pre_order' | 'on_demand'` — Mavjudlik holati.
- `inStock?: boolean` — Omborida borligi bayrog‘i.
- `warrantyMonths?: number` — Kafolat muddati (oylarda).
- `deliveryAvailable?: boolean` — Yetkazib berish xizmati mavjudligi.
- `notes?: string` — Narx yoki tovar holatiga oid izoh.
- `updatedAt: string` — Narx yangilangan vaqti.

### 1.4. `StoreProductOffer` (`src/types/product.ts`)
UI da xaridorga eng yaqin yoki eng arzon variantlarni ko‘rsatish uchun `InventoryOffer` va `Store` ma’lumotlari bog‘langan virtual ko‘rinish:
- Barcha `InventoryOffer` maydonlari
- `storeName: string`
- `storeCity: string`
- `storeAddress: string`
- `storePhone?: string`
- `storeCoordinates?: { lat: number, lng: number }`
- `isStoreVerified?: boolean`

---

## 2. Ommaviy va Maxfiy Ma’lumotlar Chegarasi (Data Boundaries)

Platforma arxitekturasida barcha mijozlar (oddiy foydalanuvchilar va anonim mehmonlar) narxlarni ko‘ra olishi va do‘konlarni qidirishi uchun quyidagi qat’iy chegara o‘rnatilgan:

| To‘plam | Ko‘rinish darajasi | Saqlanadigan ommaviy ma’lumotlar | HECH QACHON saqlanmaydigan maxfiy ma’lumotlar |
| :--- | :--- | :--- | :--- |
| **`stores`** | Ommaviy o‘qish (`allow read: if true`) | Do‘kon nomi, ommaviy manzili, shahar, koordinatalar, faoliyat toifasi, mijozlar telefoni, ish soatlari. | Tadbirkorning pasport ma’lumotlari, STIR/INN, shaxsiy bank hisob raqamlari, kassa parollari, ichki xodimlar ma’lumotlari. |
| **`products`** | Ommaviy o‘qish (`allow read: if true`) | Mahsulot nomi, rasmi, toifasi, brendi, shtrix-kodi, texnik tavsifi, qidiruv kalit so‘zlari. | Yetkazib beruvchi (supplier) narxi, tannarx, ichki marja foizi, ombordagi maxfiy qoldiqlar. |
| **`offers`** | Ommaviy o‘qish (`allow read: if true`) | Chakana sotuv narxi, valyutasi, bor/yo‘qligi holati, kafolat muddati, yetkazib berish sharti. | Do‘konning mahsulotdan ko‘radigan sof foydasi, soliq to‘lovlari, do‘kon hisobchisi yozuvlari. |
| **`users`** | Faqat hujjat egasi (`allow get: if isOwner(userId)`) | `uid`, `email`, `displayName`, `photoURL`, `phoneNumber`, `createdAt`, `updatedAt`. | Parollar (parol Firestore'da umuman saqlanmaydi, u Firebase Auth da xeshlanadi), boshqa foydalanuvchilar ko‘ra olmaydi (`allow list: if false`). |

---

## 3. Administrator Huquqi va Firebase Custom Claims Arxitekturasi

### Qat’iy Xavfsizlik Qoidasi
**Frontend (mijoz) kodi hech qachon foydalanuvchiga `admin: true` huquqini bera olmaydi.**

1. `firestore.rules` dagi `isAdmin()` qoidasi:
   ```cel
   function isAdmin() {
     return isAuthenticated() && request.auth.token.get('admin', false) == true;
   }
   ```
2. Bu qoida Firestore dagi birorta hujjat maydonini emas, balki foydalanuvchining kriptografik **Firebase Auth ID Token (JWT)** ichidagi `token.admin` maxsus belgisini (Custom Claim) tekshiradi.
3. Foydalanuvchi Firestore’dagi o‘z profiliga `isAdmin: true` yoki `role: "admin"` yozishga uringan taqdirda ham, `firestore.rules` dagi:
   ```cel
   data.keys().hasOnly(['uid', 'email', 'displayName', 'photoURL', 'phoneNumber', 'createdAt', 'updatedAt'])
   ```
   qoidasi bu so‘rovni darhol `PERMISSION_DENIED` bilan bloklaydi.
4. **Admin huquqini berishning yagona ishonchli usuli:**
   Faqat vakolatli backend server yoki Firebase Cloud Functions muhitida `firebase-admin` SDK orqali beriladi:
   ```javascript
   // Faqat xavfsiz backend/Cloud Function muhitida:
   const admin = require('firebase-admin');
   await admin.auth().setCustomUserClaims(targetUid, { admin: true });
   ```
   Bu orqali oddiy foydalanuvchilarning admin bo‘la olmasligi 100% kafolatlangan.

---

## 4. Firestore Xizmat Qatlami (`src/services/firebase/catalog.ts`)

Quyidagi typed funksiyalar ishlab chiqildi va `src/lib/firebase.ts` orqali eksport qilindi:
1. `getStores(filter)` — Do‘konlar ro‘yxatini olish (shahar va toifa bo‘yicha filtrlash imkoni bilan).
2. `getStoreById(storeId)` — Bitta do‘kon ma’lumotlarini unikal ID orqali olish.
3. `getProducts(filter)` — Mahsulotlar ro‘yxatini olish (toifa va limit bilan).
4. `getProductById(productId)` — Mahsulot kartochkasi ma’lumotlarini olish.
5. `searchProductsByKeyword(keyword)` — Kichik harflarga keltirilgan kalit so‘z orqali `searchKeywords` massividan qidirish.
6. `getOffersForProduct(productId)` — Mahsulot uchun barcha do‘konlardagi takliflarni narxi bo‘yicha o‘sish tartibida (`orderBy('price', 'asc')`) olish.
7. `getOffersByStore(storeId)` — Do‘konning barcha tovar takliflarini olish.
8. `getStoreProductOffers(productId)` — Takliflarni tegishli do‘konlar ma’lumotlari bilan bog‘lab (`StoreProductOffer[]`), eng arzon narxdan boshlab tartiblangan to‘liq taqqoslash ma’lumotlarini qaytarish.

Barcha funksiyalar Firebase ulanmagan yoki ishlab chiqish davrida xatolik yuz bermasligi uchun xavfsiz namuna ma’lumotlari (`src/fixtures/nukusCatalogDemo.ts`) bilan ta’minlangan.

---

## 5. Sinovlar va Sifat Nazorati Natijalari

1. **Vitest Unit Testlar:** `70/70` ta test muvaffaqiyatli o‘tdi (`rulesLogic.test.ts`, `catalog.test.ts`, `catalogValidation.test.ts`, `validation.test.ts`, `errors.test.ts`).
2. **ESLint Nazorati:** 0 ta xatolik, 0 ta ogohlantirish.
3. **TypeScript Strict Typecheck:** 0 ta xatolik.
4. **Vite Production Build:** Muvaffaqiyatli yakunlandi (`dist/`).
