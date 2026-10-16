/**
 * Maps Firebase Auth and Firestore error codes to clear, friendly Uzbek Latin messages.
 * Prevents leaking raw internal system errors to the UI.
 */
export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Ushbu elektron pochta bilan ro‘yxatdan o‘tgan foydalanuvchi topilmadi.';
    case 'auth/wrong-password':
      return 'Kiritilgan parol noto‘g‘ri.';
    case 'auth/invalid-credential':
      return 'Elektron pochta manzili yoki parol noto‘g‘ri.';
    case 'auth/email-already-in-use':
      return 'Ushbu elektron pochta manzili allaqachon ro‘yxatdan o‘tgan.';
    case 'auth/weak-password':
      return 'Parol juda oddiy. Kamida 6 ta belgidan iborat kuchliroq parol kiriting.';
    case 'auth/invalid-email':
      return 'Elektron pochta manzili noto‘g‘ri formatda.';
    case 'auth/too-many-requests':
      return 'Juda ko‘p muvaffaqiyatsiz urinish bo‘ldi. Iltimos, birozdan so‘ng qayta urinib ko‘ring.';
    case 'auth/network-request-failed':
      return 'Internet aloqasida nosozlik yuz berdi. Iltimos, ulanishingizni tekshiring.';
    case 'auth/operation-not-allowed':
      return 'Email/Parol orqali kirish Firebase Console da hali faollashtirilmagan.';
    case 'auth/user-disabled':
      return 'Ushbu foydalanuvchi hisobi vaqtincha bloklangan.';
    case 'permission-denied':
      return 'Ruxsat berilmadi. Faqat o‘z ma’lumotlaringizni ko‘rish yoki o‘zgartirish huquqiga egasiz.';
    case 'unavailable':
      return 'Server bilan aloqa vaqtincha uzildi. Iltimos, keyinroq qayta urinib ko‘ring.';
    case 'not-configured':
      return 'Firebase tizimi hali sozlanmagan. Iltimos, .env faylini to‘ldiring.';
    default:
      return 'Kutilmagan xatolik yuz berdi. Iltimos, qaytadan urinib ko‘ring.';
  }
}
