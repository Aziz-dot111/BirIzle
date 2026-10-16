# BirQidir — Universal Mahsulot va Xizmatlar Qidiruv Platformasi

> **2-Bosqich: Haqiqiy Autentifikatsiya va Foydalanuvchi Profillari (Stage 2: Real Authentication & User Profiles)**

**BirQidir** — O‘zbekiston bo‘ylab tovar va xizmatlarni qidirish, narxlarni taqqoslash, yaqin atrofdagi do‘konlarni topish hamda biznes egalariga o‘z savdo va omborini boshqarish imkonini beruvchi universal raqamli platforma.

---

## 🚀 Texnologiyalar (Tech Stack)

- **Frontend:** React 18, TypeScript (Strict Mode)
- **Kompilyator va vositalar:** Vite 6
- **Routing:** React Router v6 (ProtectedRoute & PublicOnlyRoute qo‘llab-quvvatlovi bilan)
- **Backend & DB:** Firebase JavaScript SDK v11 (Modular API)
  - **Firebase Authentication:** Email/Parol (real vaqt rejimida `onAuthStateChanged`, xavfsiz sessiya)
  - **Cloud Firestore:** `users/{uid}` hujjatlari, serverTimestamp(), self-healing profil mexanizmi, qat'iy deny-by-default xavfsizlik qoidalari
- **Dizayn va uslub:** Modulli CSS / CSS Variables dizayn tizimi (Deep Green brend palitrasi, responsive, micro-animations)
- **Belgilar (Icons):** Lucide React
- **Sifat nazorati:** ESLint, TypeScript Strict Typecheck, Vitest

---

## 📋 Tizim talablari (Prerequisites)

- **Node.js:** v18.0.0 yoki undan yuqori (Tavsiya etiladi: v20+ yoki v24+)
- **NPM:** v9.0.0 yoki undan yuqori
- **Operatsion tizim:** Windows 10/11, macOS yoki Linux

---

## ⚡ Tezkor ishga tushirish (Local Setup)

### 1. Bog‘liqliklarni o‘rnatish

Windows buyruqlar satrida (CMD yoki PowerShell):

```cmd
npm install
```

> **Eslatma (PowerShell uchun):** Agar PowerShell xavfsizlik siyosati (`PSSecurityException`) tufayli `npm` buyrug‘ini bloklasa, har doim `npm.cmd` dan foydalaning:
> ```powershell
> npm.cmd install
> ```

### 2. Atrof-muhit o‘zgaruvchilarini sozlash

Loyiha ildizidagi `.env.example` faylidan nusxa olib `.env.local` nomli fayl yarating:

```cmd
copy .env.example .env.local
```

Fayl ichidagi o‘zgaruvchilarni Firebase konsolidan olgan ma’lumotlaringiz bilan to‘ldiring:

```env
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=sizning-loyihangiz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=sizning-loyihangiz
VITE_FIREBASE_STORAGE_BUCKET=sizning-loyihangiz.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

> ⚠️ **Muhim:** Bosh sahifa va barcha vizual interfeys `.env.local` to‘ldirilmagan holatda ham to‘liq xatosiz ishlaydi. Firebase sozlanmaganligi haqida ekranda ishlab chiquvchilar uchun xavfsiz ogohlantirish ko‘rsatiladi.

### 3. Dasturni ishlab chiqish rejimida ishga tushirish

```cmd
npm run dev
```
(PowerShell da: `npm.cmd run dev`)

Brauzeringizda oching: **`http://localhost:3000`**

---

## 🛠️ Mavjud buyruqlar (Scripts)

| Buyruq | Vazifasi |
| :--- | :--- |
| `npm.cmd run dev` | Mahalliy ishlab chiqish serverini ishga tushirish (port: 3000) |
| `npm.cmd run typecheck` | TypeScript strict rejimida barcha turlarni tekshirish |
| `npm.cmd run lint` | ESLint orqali kod uslubi va xatoliklarni tekshirish |
| `npm.cmd run test` | Vitest orqali unit-testlarni ishga tushirish |
| `npm.cmd run build` | Ishlab chiqarish (production) uchun loyihani yig‘ish |
| `npm.cmd run preview` | Yig‘ilgan production kodni lokal ko‘rish |

---

## 🔥 Firebase sozlash bo‘yicha to‘liq bosqichma-bosqich qo‘llanma

Haqiqiy Firebase loyihangizni ulash uchun quyidagi amallarni bajaring:

### 1. Firebase Console-ga kirish
Brauzerda [https://console.firebase.google.com/](https://console.firebase.google.com/) sahifasiga kiring va Google akkauntingiz bilan tizimga kiring.

### 2. Loyiha tanlash yoki yangi loyiha yaratish
- **Add project** (Loyiha qo‘shish) tugmasini bosing.
- Loyihaga nom bering (masalan: `birqidir-uz`).
- Google Analytics xohishingizga ko‘ra yoqing yoki o‘chirib qoldiring, so‘ng **Create project** ni bosing.

### 3. Veb-ilova (Web App) ro‘yxatdan o‘tkazish
- Loyiha boshqaruv panelida veb ikonkasini (`</>`) bosing.
- Ilovaga nom bering: `BirQidir Web`.
- **Register app** tugmasini bosing.
- Ekranda paydo bo‘lgan `firebaseConfig` parametrlaridan (`apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`) nusxa olib, loyihangizdagi `.env.local` fayliga joylashtiring.

### 4. Email/Password autentifikatsiyasini yoqish
- Chap menyudan **Build** -> **Authentication** bo‘limiga kiring.
- **Get started** tugmasini bosing.
- **Sign-in method** ro‘yxatidan **Email/Password** qatorini tanlang.
- **Enable** holatiga o‘tkazing va **Save** tugmasini bosing.

### 5. Cloud Firestore ma’lumotlar bazasini yaratish
- Chap menyudan **Build** -> **Firestore Database** bo‘limiga kiring.
- **Create database** tugmasini bosing.
- Xavfsizlik qoidalarini so‘raganda **Start in production mode** ni tanlang (qoidalarimiz baribir loyihada tayyor).
- Bazaning geolokatsiyasini tanlang (masalan, `eur3 (europe-west)` yoki `asia-northeast3`).
- **Create** tugmasini bosing.

### 6. Xavfsizlik qoidalarini (Security Rules) kiritish
- Firestore sahifasida **Rules** yorlig‘iga o‘ting.
- Loyihamizdagi `firestore.rules` fayli matnini to‘liq nusxalab, u yerdagi matn o‘rniga qo‘ying.
- **Publish** tugmasini bosing.

### 7. Dasturni ishga tushirib tekshirish
- Terminalda `npm.cmd run dev` buyrug‘ini bering.
- `http://localhost:3000/register` manziliga o‘tib yangi foydalanuvchi yarating.
- Firebase Console -> **Authentication** va **Firestore Database** (`users/{uid}`) bo‘limlarida ma’lumotlar paydo bo‘lganini ko‘rishingiz mumkin.

---

## 🔒 Xavfsizlik qoidalari (`firestore.rules`)

Loyiha qat’iy **Deny-By-Default** tamoyiliga asoslangan:

- `/users/{userId}` hujjatlariga faqat autentifikatsiyadan o‘tgan va o‘z UID raqamiga mos keluvchi foydalanuvchi murojaat qila oladi (`request.auth.uid == userId`).
- Hujjat yaratish va tahrirlashda ruxsat berilgan maydonlar tekshiriladi (`uid`, `email`, `displayName`, `photoURL`, `phoneNumber`, `createdAt`, `updatedAt`).
- Boshqaruvchi rollar (`role`, `isAdmin`, `permissions`) mijoz tomonidan kiritilishi taqiqlangan.
- UID, `email` va `createdAt` vaqtini tahrirlash orqali o‘zgartirib bo‘lmaydi.
- Foydalanuvchilar ro‘yxatini to‘liq tortib olish (`list`) taqiqlangan.
- Barcha boshqa to‘plamlar (kelajakdagi tovarlar, narxlar, do‘konlar, kassa) sukut bo‘yicha to‘liq yopiq (`allow read, write: if false;`).

---

## 📁 Loyiha tuzilmasi (Project Structure)

```
d:/BirIzle/
├── public/
│   ├── logo.svg               # BirQidir brend logotipi
│   └── vite.svg
├── src/
│   ├── app/
│   │   ├── App.tsx            # Ilova ildizi (Providerlar)
│   │   └── router.tsx         # React Router yo‘nalishlari (ProtectedRoute va PublicOnlyRoute)
│   ├── components/
│   │   ├── common/            # Qayta ishlatiluvchi UI (Button, Input, Card, Badge, Banner)
│   │   └── layout/            # Karkas komponentlari (Header, Footer, Layout)
│   ├── features/
│   │   ├── auth/              # Kirish, ro‘yxatdan o‘tish, AuthContext, ProtectedRoute, PublicOnlyRoute
│   │   └── home/              # Bosh sahifa (Hero, Qidiruv, Toifalar, Xizmatlar, Biznes)
│   ├── hooks/
│   │   └── useAuth.ts         # Autentifikatsiya hook'i
│   ├── pages/
│   │   ├── HomePage.tsx       # Bosh sahifa
│   │   ├── LoginPage.tsx      # Kirish sahifasi
│   │   ├── RegisterPage.tsx   # Ro‘yxatdan o‘tish sahifasi
│   │   ├── ProfilePage.tsx    # Foydalanuvchi profili sahifasi (tahrirlash & recovery)
│   │   └── NotFoundPage.tsx   # 404 sahifa
│   ├── services/
│   │   └── firebase/          # Firebase integratsiyasi
│   │       ├── firebase.ts    # Boshlang‘ich initsializatsiya & holat tekshiruvi
│   │       ├── auth.ts        # Autentifikatsiya xizmatlari (login, register, logout, updateAuthDisplayName)
│   │       ├── firestore.ts   # Firestore profil xizmatlari (create, get, update, ensureUserProfileExists)
│   │       └── errors.ts      # Xatoliklarni o‘zbekchaga o‘girish
│   ├── styles/
│   │   ├── variables.css      # Dizayn tizimi tokenlari (ranglar, shadow, radius)
│   │   └── global.css         # Asosiy uslublar va reset
│   ├── types/                 # TypeScript ma’lumotlar shartnomalari
│   ├── utils/                 # Validatsiya va yordamchi funksiyalar
│   ├── main.tsx               # DOM ga o‘rnatish nuqtasi
│   └── vite-env.d.ts          # Vite env turlari
├── .env.example               # Xavfsiz env shabloni
├── .eslintrc.cjs              # ESLint konfiguratsiyasi
├── .gitignore                 # Git e’tiborsiz qoldirish ro‘yxati
├── firebase.json              # Firebase konfiguratsiyasi
├── firestore.indexes.json     # Indekslar
├── firestore.rules            # Qat’iy xavfsizlik qoidalari
├── package.json               # Paketlar va buyruqlar
├── tsconfig.json              # TypeScript strict sozlamalari
└── vite.config.ts             # Vite sozlamalari
```

---

## 🗺️ Bosqichlar chegarasi (Stage Boundaries)

### ✅ 1-Bosqich doirasida:
- Loyiha arxitekturasi va zamonaviy UI/UX bosh sahifa poydevori yaratildi.

### ✅ 2-Bosqich doirasida amalga oshirildi:
1. **Haqiqiy Firebase Email/Password Autentifikatsiyasi:**
   - Ro‘yxatdan o‘tish (`createUserWithEmailAndPassword`, `updateProfile`).
   - Tizimga kirish (`signInWithEmailAndPassword`).
   - Tizimdan chiqish (`signOut`).
   - Parollarni ko‘rsatish/yashirish (Show/Hide password).
   - O‘zbek tilidagi to‘liq xatolik xabarlari va validatsiya.
2. **Cloud Firestore Foydalanuvchi Profillari (`/users/{uid}`):**
   - Tipiklashtirilgan foydalanuvchi modeli (`uid`, `email`, `displayName`, `createdAt`, `updatedAt`).
   - `serverTimestamp()` va sanalarni to‘g‘ri formatlash.
   - Autentifikatsiyadan o‘tgan, ammo Firestore hujjati bo‘lmagan foydalanuvchilar uchun o‘z-o‘zini tiklash (self-healing / `retryCreateProfile`) mexanizmi.
3. **Avtorizatsiya va Marshrutlash:**
   - `ProtectedRoute`: faqat tizimga kirganlar uchun `/profile` sahifasini ochadi.
   - `PublicOnlyRoute`: tizimga allaqachon kirgan foydalanuvchilarni `/login` va `/register` sahifalaridan to‘g‘ri `/profile` ga yo‘naltiradi.
   - Sessiya yuklanishi paytida siklik qayta yo‘naltirishlar (redirect loops) oldi olingan.
4. **Qat’iy Firestore Xavfsizlik Qoidalari (`firestore.rules`):**
   - Ruxsat berilgan maydonlar tekshiruvi (allowlist).
   - UID va emailni tahrirlab o‘zgartirishni bloklash.
   - Privilege escalation (`isAdmin`, `role`) kiritishni rad etish.
   - Boshqa barcha to‘plamlar uchun deny-by-default.

### ⏳ 3-Bosqich va keyingi reja:
- **3-Bosqich:** Mahsulotlar katalogi, Firestore tovarlar bazasi arxitekturasi, to‘liq qidiruv va filtrlash, do‘konlar bo‘yicha narxlarni solishtirish mexanizmi.
- **4-Bosqich:** Xizmatlar moduli, ustalar va xizmat ko‘rsatuvchilar katalogi.
- **5-Bosqich:** Do‘konlar va filiallar boshqaruvi.
- **6-Bosqich:** Kassa va ombor hisob-kitobi.
- **7-8-Bosqichlar:** Sharhlar, reytinglar, kengaytirilgan qidiruv va mobil optimizatsiya.
