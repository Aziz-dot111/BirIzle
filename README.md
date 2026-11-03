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

## 🔥 Firebase sozlash bo‘yicha to‘liq bosqichma-bosqich qo‘llanma (8 Bosqich)

Haqiqiy Firebase loyihangizni ulash va autentifikatsiyani ishga tushirish uchun quyidagi 8 ta bosqichni ketma-ket bajaring:

### 1. Firebase Console-ga kirish (Opening Firebase Console)
Brauzeringizda **[https://console.firebase.google.com/](https://console.firebase.google.com/)** manziliga o‘ting va shaxsiy Google hisobingiz orqali tizimga kiring.

### 2. Loyiha tanlash yoki yangi loyiha yaratish (Selecting/Creating Firebase Project)
- Agar sizda allaqachon mavjud Firebase loyihasi bo‘lsa, uni ro‘yxatdan tanlang.
- Yangi loyiha ochish uchun **"Add project"** (Loyiha qo‘shish) tugmasini bosing:
  - Loyihaga nom bering (masalan: `birqidir-app`).
  - Google Analytics ni xohishingizga ko‘ra yoqing yoki o‘chirib qoldiring.
  - **"Create project"** tugmasini bosing va jarayon yakunlanishini kuting.

### 3. Veb-ilovani ro‘yxatdan o‘tkazish (Registering a Web App)
- Loyihaning asosiy sahifasida (Project Overview) veb ikonkasini (**`</>`**) bosing (yoki **Project Settings** -> **General** -> **Your apps** bo‘limiga o‘ting).
- Ilova nomini kiriting: `BirQidir Web`.
- *"Firebase Hosting"* ni belgilash shart emas.
- **"Register app"** tugmasini bosing.
- Ekranda ko‘rsatilgan `firebaseConfig` konfiguratsiya parametrlaridan quyidagi kalitlarni nusxalashga tayyorlab oling:
  - `apiKey`
  - `authDomain`
  - `projectId`
  - `storageBucket`
  - `messagingSenderId`
  - `appId`

### 4. Email/Password autentifikatsiyasini yoqish (Enabling Email/Password Auth)
- Chap menyudagi **Build** bo‘limidan **Authentication** sahifasiga kiring.
- **"Get started"** tugmasini bosing.
- **"Sign-in method"** (Kirish usullari) yorlig‘iga o‘ting.
- Ro‘yxatdan **"Email/Password"** qatorini tanlang.
- Birinchi kalitni — **"Enable"** holatiga o‘tkazing (Email link / passwordless ni o‘chiq qoldiring).
- **"Save"** (Saqlash) tugmasini bosing.

### 5. Cloud Firestore ma’lumotlar bazasini yaratish (Creating Cloud Firestore DB)
- Chap menyudagi **Build** bo‘limidan **Firestore Database** sahifasiga o‘ting.
- **"Create database"** tugmasini bosing.
- Database ID `(default)` holatida qoladi.
- Xavfsizlik qoidalarini tanlashda **"Start in production mode"** ni tanlang (loyihamiz xavfsiz qoidalarni o‘z ichiga olgan).
- Bazaning server joylashuvini tanlang (masalan, `eur3 (europe-west)` yoki O‘zbekistonga yaqin boshqa mintaqa).
- **"Create"** tugmasini bosing.

### 6. Mahalliy atrof-muhit o‘zgaruvchilarini sozlash (Setting Environment Variables)
- Loyihaning asosiy ildiz papkasida `.env.example` shablonidan nusxa olib `.env.local` nomli yangi fayl yarating:
  ```cmd
  copy .env.example .env.local
  ```
  *(PowerShell da: `Copy-Item .env.example .env.local`)*
- Faylni matn muharririda ochib, 3-bosqichda olingan haqiqiy qiymatlar bilan to‘ldiring:
  ```env
  VITE_FIREBASE_API_KEY=AIzaSy...
  VITE_FIREBASE_AUTH_DOMAIN=sizning-loyihangiz.firebaseapp.com
  VITE_FIREBASE_PROJECT_ID=sizning-loyihangiz
  VITE_FIREBASE_STORAGE_BUCKET=sizning-loyihangiz.appspot.com
  VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
  VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
  ```
- > 🔒 **Xavfsizlik eslatmasi:** `.env.local` faylini hech qachon Git tizimiga qo‘shmang (u `.gitignore` ga kiritilgan). Hech qachon shaxsiy server kalitlarini chatga yoki ommaviy omborga yozmang!

### 7. Firestore Xavfsizlik Qoidalarini ko‘rib chiqish va joylashtirish (Deploying Security Rules)
- Loyihamizdagi [`firestore.rules`](firestore.rules) faylini oching va uning qat’iy qoidalarini ko‘rib chiqing.
- Firebase Console -> **Firestore Database** -> **Rules** yorlig‘iga o‘ting.
- Tahrirlovchi oynadagi mavjud matn o‘rniga `firestore.rules` fayli tarkibini to‘liq joylashtiring.
- **"Publish"** (Chop etish) tugmasini bosing.
- *(Ixtiyoriy muqobil: Agar Firebase CLI o‘rnatilgan bo‘lsa, `firebase deploy --only firestore:rules` buyrug‘i orqali ham yuklashingiz mumkin).*

### 8. Dasturni Windows PowerShell orqali ishga tushirish (Running on Windows PowerShell)
- Windows PowerShell-da loyihani ishga tushirish uchun quyidagi usullardan birini tanlang:
  
  **1-usul (Tavsiya etiladi — har doim ishlaydi):**
  ```powershell
  npm.cmd run dev
  ```
  *(PowerShell-da `npm.cmd` kengaytmasini ko‘rsatish tizim xavfsizlik cheklovlarini chetlab o‘tadi).*

  **2-usul (Agar PowerShell skriptlarni bloklasa - PSSecurityException):**
  ```powershell
  powershell -ExecutionPolicy Bypass -Command "npm.cmd run dev"
  ```
  yoki joriy sessiya uchun ruxsat bering:
  ```powershell
  Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
  npm run dev
  ```

- Brauzerda oching: **`http://localhost:3000`**
- `http://localhost:3000/register` manziliga o‘tib yangi foydalanuvchi akkauntini yarating.
- Ro‘yxatdan o‘tgach, avtomatik tarzda `/profile` sahifasiga yo‘naltirilasiz. Firebase Authentication hamda Cloud Firestore dagi `users/{uid}` profili to‘liq ishga tushadi.

---

## 🔒 Xavfsizlik qoidalari (`firestore.rules`) va App Check

Loyiha qat’iy **Deny-By-Default** va **Email Verification** tamoyillariga asoslangan:

- `/users/{userId}` hujjatlariga faqat autentifikatsiyadan o‘tgan va o‘z UID raqamiga mos keluvchi foydalanuvchi murojaat qila oladi (`request.auth.uid == userId`).
- Hujjat yaratish va tahrirlashda **tasdiqlangan elektron pochta** majburiy talab qilinadi (`request.auth.token.email_verified == true`).
- Hujjat yaratish va tahrirlashda ruxsat berilgan maydonlar tekshiriladi (`uid`, `email`, `displayName`, `photoURL`, `phoneNumber`, `createdAt`, `updatedAt`).
- Tahrirlashda faqat tasdiqlangan maydonlarni o‘zgartirishga ruxsat beriladi (`request.resource.data.diff(resource.data).affectedKeys().hasOnly(['displayName', 'updatedAt', 'photoURL', 'phoneNumber'])`).
- Boshqaruvchi rollar (`role`, `isAdmin`, `permissions`) mijoz tomonidan kiritilishi taqiqlangan.
- UID, `email` va `createdAt` vaqtini tahrirlash orqali o‘zgartirib bo‘lmaydi.
- Foydalanuvchilar ro‘yxatini to‘liq tortib olish (`list`) taqiqlangan.
- Barcha boshqa to‘plamlar (kelajakdagi tovarlar, narxlar, do‘konlar, kassa) sukut bo‘yicha to‘liq yopiq (`allow read, write: if false;`).
- **Firebase App Check:** reCAPTCHA v3 integratsiyasi veb mijozda tayyorlandi. Firebase Console-da App Check faollashtirilmaguncha enforcement o‘chiq qoladi.

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
