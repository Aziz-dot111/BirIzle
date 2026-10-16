# Firebase Sozlash Bo‘yicha To‘liq Qo‘llanma (Firebase Setup Guide)

Ushbu qo‘llanma **Bir Izle** platformasi uchun Firebase loyihasini yaratish, autentifikatsiya va Firestore ma’lumotlar bazasini xavfsiz sozlash bo‘yicha bosqichma-bosqich yo‘riqnomani o‘z ichiga oladi.

---

## 1. Firebase Loyihasini Yaratish

1. Brauzeringizda **[Firebase Console](https://console.firebase.google.com/)** ga kiring (Google hisobingiz orqali).
2. **"Add project"** (Loyiha qo‘shish) tugmasini bosing.
3. Loyiha nomini kiriting: `Bir Izle` (yoki o‘zingiz istagan nom).
4. Google Analytics ni yoqish yoki o‘chirishni tanlang (rivojlantirish uchun majburiy emas).
5. **"Create project"** tugmasini bosing va jarayon tugashini kuting.

---

## 2. Veb-ilovaga Kalitlarni Olish

1. Yangi yaratilgan loyihaning boshqaruv panelida (Project Overview) **Web** (`</>`) belgisini bosing.
2. Ilova taxallusini kiriting (masalan, `Bir Izle Web`).
3. *"Also set up Firebase Hosting"* katakchasini belgilash hozircha shart emas.
4. **"Register app"** tugmasini bosing.
5. Ekranda quyidagiga o‘xshash `firebaseConfig` kodi paydo bo‘ladi:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyD-...",
  authDomain: "birizle-xyz.firebaseapp.com",
  projectId: "birizle-xyz",
  storageBucket: "birizle-xyz.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

6. Loyihangiz ildizida `.env.local` faylini oching (yoki `.env.example` dan nusxa oling) va mos qiymatlarni qo‘ying:

```env
VITE_FIREBASE_API_KEY=AIzaSyD-...
VITE_FIREBASE_AUTH_DOMAIN=birizle-xyz.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=birizle-xyz
VITE_FIREBASE_STORAGE_BUCKET=birizle-xyz.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789012
VITE_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
```

---

## 3. Email / Parol Autentifikatsiyasini Faollashtirish

1. Chap tarafdagi menyudan **Build** -> **Authentication** bo‘limiga kiring.
2. **"Get started"** tugmasini bosing.
3. **"Sign-in method"** yorlig‘iga o‘ting.
4. Ro‘yxatdan **"Email/Password"** qatorini bosing.
5. **"Enable"** kalitini yoqing.
6. **"Save"** tugmasini bosing.

> ℹ️ **Muhim:** Endi ilovadagi `/register` va `/login` sahifalari orqali haqiqiy foydalanuvchilar ro‘yxatdan o‘tishi mumkin bo‘ladi.

---

## 4. Cloud Firestore Bazasini Yaratish

1. Chap tarafdagi menyudan **Build** -> **Firestore Database** bo‘limiga o‘ting.
2. **"Create database"** tugmasini bosing.
3. Database ID sukut bo‘yicha `(default)` qoladi.
4. Joylashuv (Location) sifatida o‘zingizga eng yaqin mintaqani tanlang (masalan, `europe-west3` yoki `asia-northeast3`).
5. Xavfsizlik qoidalarida **"Start in production mode"** ni tanlang va **"Create"** tugmasini bosing.

---

## 5. Xavfsizlik Qoidalarini (Security Rules) Joylashtirish

Bir Izle xavfsizligi frontendga emas, balki Cloud Firestore serveridagi qoidalarga tayanadi.

1. Firestore boshqaruv panelidagi **"Rules"** (Qoidalar) yorlig‘iga o‘ting.
2. Loyihamizdagi [`firestore.rules`](file:///d:/BirIzle/firestore.rules) fayli tarkibini to‘liq nusxalab, Firebase Console oynasiga qo‘ying:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isValidUserProfile(data) {
      return data.keys().hasOnly(['uid', 'email', 'displayName', 'photoURL', 'phoneNumber', 'createdAt', 'updatedAt'])
        && data.uid is string
        && data.uid == request.auth.uid
        && data.email is string
        && (data.displayName == null || data.displayName is string)
        && (data.photoURL == null || data.photoURL is string)
        && (data.phoneNumber == null || data.phoneNumber is string);
    }

    match /users/{userId} {
      allow get: if isOwner(userId);
      allow list: if false;

      allow create: if isOwner(userId)
                    && isValidUserProfile(request.resource.data)
                    && request.resource.data.uid == userId;

      allow update: if isOwner(userId)
                    && isValidUserProfile(request.resource.data)
                    && request.resource.data.uid == resource.data.uid
                    && (!('createdAt' in resource.data) || request.resource.data.createdAt == resource.data.createdAt);

      allow delete: if false;
    }

    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

3. **"Publish"** (Chop etish) tugmasini bosing.

---

## 6. Firebase CLI orqali qoidalarni joylashtirish (Ixtiyoriy)

Agar kompyuteringizda Firebase CLI o‘rnatilgan bo‘lsa:

```cmd
npm install -g firebase-tools
firebase login
firebase use --add [your-project-id]
firebase deploy --only firestore:rules
```

---

## 7. Xavfsizlik bo‘yicha Eslatmalar

- **Hech qachon** Firebase Admin SDK maxfiy kalitlarini (service account JSON) frontend kodiga yoki git-ga yuklamang!
- `.env` va `.env.local` fayllari `.gitignore` ga kiritilgan va maxfiy ma’lumotlarni ommaga chiqib ketishidan himoya qiladi.
- Frontenddagi `apiKey` brauzer tomonidan ko‘rinadi, lekin xavfsizlik Firestore Security Rules orqali ta’minlanadi.
