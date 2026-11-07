import { getSavedMapLanguage, type MapLanguage } from './mapI18n';

export interface MerchantTexts {
  dashboardTitle: string;
  dashboardSubtitle: string;
  applyButton: string;
  myStores: string;
  noStoresTitle: string;
  noStoresDesc: string;
  selectStorePrompt: string;
  selectedStoreBadge: string;
  verifiedBadge: string;
  pendingBadge: string;
  activeStatus: string;
  pendingStatus: string;
  archivedStatus: string;
  emailNotVerifiedTitle: string;
  emailNotVerifiedDesc: string;
  resendVerificationBtn: string;
  refreshStatusBtn: string;
  verificationSent: string;
  verificationError: string;
  loadingStores: string;

  // Application
  applyTitle: string;
  applySubtitle: string;
  backToDashboard: string;
  nameLabel: string;
  namePlaceholder: string;
  cityLabel: string;
  districtLabel: string;
  districtPlaceholder: string;
  addressLabel: string;
  addressPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  categoryLabel: string;
  placeTypeLabel: string;
  hoursLabel: string;
  hoursPlaceholder: string;
  coordsLabel: string;
  getGpsCoordsBtn: string;
  coordsHelp: string;
  descriptionLabel: string;
  descriptionPlaceholder: string;
  websiteLabel: string;
  websitePlaceholder: string;
  submitBtn: string;
  submittingBtn: string;
  securityNoticeTitle: string;
  securityNoticeText: string;
  rulesPendingNotice: string;
  rulesDeniedError: string;
  successTitle: string;
  successDesc: string;

  // Offers
  offersTitle: string;
  offersSubtitle: string;
  noOffersTitle: string;
  noOffersDesc: string;
  addOfferBtn: string;
  offersStagedNotice: string;
  priceLabel: string;
  availabilityLabel: string;
  inStock: string;
  onOrder: string;
  outOfStock: string;
  warrantyLabel: string;
  deliveryLabel: string;
  availableDelivery: string;
  noDelivery: string;

  // Tabs
  activeOffersTab: string;
  submissionsTab: string;

  // Modal & Offer Submission
  selectExistingTab: string;
  suggestNewTab: string;
  modalTitle: string;
  inactiveStoreWarning: string;
  searchCatalogPlaceholder: string;
  selectedProduct: string;
  changeProduct: string;
  noProductsFound: string;
  variantLabel: string;
  selectVariantPlaceholder: string;
  priceUzsLabel: string;
  pricePlaceholder: string;
  warrantyMonthsLabel: string;
  warrantyPlaceholder: string;
  deliveryCheckboxLabel: string;
  notesLabel: string;
  notesPlaceholder: string;
  cancelBtn: string;
  sendOfferSubmissionBtn: string;
  sendingBtn: string;
  offerSubmittedSuccess: string;
  duplicatePendingError: string;

  // New Product Submission
  newProdNameLabel: string;
  newProdNamePlaceholder: string;
  newProdCategoryLabel: string;
  selectCategoryPrompt: string;
  newProdBrandLabel: string;
  newProdBrandPlaceholder: string;
  newProdModelLabel: string;
  newProdModelPlaceholder: string;
  newProdBarcodeLabel: string;
  newProdBarcodePlaceholder: string;
  newProdImageLabel: string;
  newProdImagePlaceholder: string;
  newProdDescLabel: string;
  newProdDescPlaceholder: string;
  newProdProposedPriceLabel: string;
  sendProductSubmissionBtn: string;
  productSubmittedSuccess: string;

  // Submissions History View
  noSubmissionsTitle: string;
  noSubmissionsDesc: string;
  offerSubmissionBadge: string;
  productSubmissionBadge: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  adminNoteLabel: string;
  resubmitBtn: string;
  dateLabel: string;
}

export const MERCHANT_TRANSLATIONS: Record<MapLanguage, MerchantTexts> = {
  uz: {
    dashboardTitle: 'Do‘kon Egasi Kabineti',
    dashboardSubtitle: 'Savdo nuqtalaringiz, arizalar holati va tovarlar katalogi boshqaruvi',
    applyButton: 'Yangi do‘kon ochish',
    myStores: 'Mening do‘konlarim',
    noStoresTitle: 'Sizda hali ro‘yxatdan o‘tgan do‘kon yo‘q',
    noStoresDesc: 'BirQidir platformasida yangi savdo nuqtangizni ochish uchun ariza yuboring.',
    selectStorePrompt: 'Tovar va takliflarni ko‘rish uchun do‘konni tanlang',
    selectedStoreBadge: 'Tanlangan do‘kon',
    verifiedBadge: 'Tasdiqlangan hamkor',
    pendingBadge: 'Moderatsiyada (kutilmoqda)',
    activeStatus: 'Faol',
    pendingStatus: 'Ko‘rib chiqilmoqda',
    archivedStatus: 'Arxivlangan',
    emailNotVerifiedTitle: 'Elektron pochtangizni tasdiqlang',
    emailNotVerifiedDesc:
      'Do‘kon egasi kabinetidan foydalanish va ariza topshirish uchun elektron pochtangiz tasdiqlangan bo‘lishi shart.',
    resendVerificationBtn: 'Tasdiqlash xatini qayta yuborish',
    refreshStatusBtn: 'Holatni yangilash',
    verificationSent: 'Tasdiqlash xati pochtangizga yuborildi. Xatdagi havolani bosing.',
    verificationError: 'Xatni yuborishda xatolik yuz berdi.',
    loadingStores: 'Do‘konlar ro‘yxati yuklanmoqda...',

    applyTitle: 'Do‘kon ochish uchun ariza',
    applySubtitle: 'Savdo nuqtangiz ma’lumotlarini kiriting. Arizangiz adminlar tomonidan ko‘rib chiqiladi.',
    backToDashboard: 'Kabinetga qaytish',
    nameLabel: 'Do‘kon nomi',
    namePlaceholder: 'Masalan: Nukus Elektronika, Media Store',
    cityLabel: 'Shahar / viloyat markazi',
    districtLabel: 'Tuman / Hudud',
    districtPlaceholder: 'Tumanni tanlang (ixtiyoriy)',
    addressLabel: 'To‘liq manzil',
    addressPlaceholder: 'Ko‘cha, uy raqami, mo‘ljal',
    phoneLabel: 'Bog‘lanish telefoni',
    phonePlaceholder: '+998 90 123 45 67',
    categoryLabel: 'Asosiy toifa',
    placeTypeLabel: 'Savdo nuqtasi turi',
    hoursLabel: 'Ish vaqti',
    hoursPlaceholder: 'Masalan: 09:00 - 20:00 (har kuni)',
    coordsLabel: 'Xarita koordinatalari (kenglik va uzunlik)',
    getGpsCoordsBtn: 'Mening joylashuvimdan olish',
    coordsHelp: 'Koordinatalar do‘koningizni xaritada to‘g‘ri ko‘rsatish uchun kerak.',
    descriptionLabel: 'Do‘kon haqida tavsif (ixtiyoriy)',
    descriptionPlaceholder: 'Do‘koningiz, taqdim etiladigan qulayliklar yoki assortiment haqida qisqacha yozing...',
    websiteLabel: 'Veb-sayt yoki ijtimoiy tarmoq (ixtiyoriy)',
    websitePlaceholder: 'https://...',
    submitBtn: 'Ariza yuborish',
    submittingBtn: 'Ariza tekshirilmoqda...',
    securityNoticeTitle: 'Xavfsizlik va moderatsiya tartibi',
    securityNoticeText:
      'Yangi do‘kon dastlab tasdiqlanmagan holatda yaratiladi. Do‘kon egasi identifikatori (ownerId) sizning akkauntingizga qat’iy biriktiriladi.',
    rulesPendingNotice:
      'Diqqat: jonli bulut bazasiga yozish huquqi Firebase Security Rules tasdiqlangach to‘liq faollashadi.',
    rulesDeniedError:
      'Ariza bulut bazasiga saqlanmadi: do‘kon yaratish uchun Firebase Security Rules ruxsat bermadi (ruxsat cheklangan).',
    successTitle: 'Arizangiz qabul qilindi!',
    successDesc:
      'Do‘kon ma’lumotlari tekshirildi va arizangiz muvaffaqiyatli shakllantirildi. Moderatsiya jarayonidan so‘ng do‘koningiz qidiruvda ko‘rinadi.',

    offersTitle: 'Mahsulotlar va narx takliflari',
    offersSubtitle: 'Ushbu do‘konga biriktirilgan mavjud tovarlar ro‘yxati',
    noOffersTitle: 'Hozircha mahsulot takliflari kiritilmagan',
    noOffersDesc: 'Do‘koningizga mahsulot va narxlarni biriktiring.',
    addOfferBtn: 'Yangi mahsulot taklifi qo‘shish',
    offersStagedNotice:
      'Mahsulot va narx takliflarini jonli Firestore bazasiga yozish keyingi bosqichda Firebase Security Rules yangilangandan so‘ng to‘liq faollashtiriladi.',
    priceLabel: 'Narxi',
    availabilityLabel: 'Mavjudligi',
    inStock: 'Mavjud',
    onOrder: 'Buyurtmaga',
    outOfStock: 'Tugagan',
    warrantyLabel: 'Kafolat',
    deliveryLabel: 'Yetkazib berish',
    availableDelivery: 'Mavjud',
    noDelivery: 'Yo‘q',

    activeOffersTab: 'Faol takliflar',
    submissionsTab: 'Arizalar tarixi',

    selectExistingTab: 'Mavjud mahsulot',
    suggestNewTab: 'Katalogda yo‘q yangi mahsulot',
    modalTitle: 'Mahsulot biriktirish va narx belgilash',
    inactiveStoreWarning:
      'Ushbu do‘kon faol emas yoki tasdiqlanmagan. Taklif va mahsulot yuborish faqat faol do‘konlar uchun ruxsat etiladi.',
    searchCatalogPlaceholder: 'Katalogdan mahsulot nomi yoki brend bo‘yicha qidiring...',
    selectedProduct: 'Tanlangan mahsulot',
    changeProduct: 'O‘zgartirish',
    noProductsFound:
      'Mos mahsulot topilmadi. Agar u katalogda yo‘q bo‘lsa, yangi mahsulot arizasini yuborishingiz mumkin.',
    variantLabel: 'Mahsulot varianti (ixtiyoriy)',
    selectVariantPlaceholder: 'Asosiy variant (baza)',
    priceUzsLabel: 'Sotuv narxi (UZS)',
    pricePlaceholder: 'Masalan: 2 500 000',
    warrantyMonthsLabel: 'Kafolat muddati (oy)',
    warrantyPlaceholder: 'Masalan: 12 (0 - 120 oy)',
    deliveryCheckboxLabel: 'Xaridorga yetkazib berish xizmati mavjud',
    notesLabel: 'Do‘kon eslatmasi / qo‘shimcha ma’lumot (ixtiyoriy)',
    notesPlaceholder: 'Masalan: Yangi, qadoqda, yetkazib berish 2 soat ichida',
    cancelBtn: 'Bekor qilish',
    sendOfferSubmissionBtn: 'Moderatsiyaga yuborish',
    sendingBtn: 'Yuborilmoqda...',
    offerSubmittedSuccess:
      'Mahsulot narxi arizasi muvaffaqiyatli moderator tekshiruviga yuborildi. Tasdiqlangach xaridorlarga ko‘rinadi.',
    duplicatePendingError: 'Ushbu mahsulot uchun arizangiz allaqachon moderator tekshiruvida turibdi.',

    newProdNameLabel: 'Mahsulot nomi',
    newProdNamePlaceholder: 'Masalan: Samsung Galaxy A55 128GB',
    newProdCategoryLabel: 'Toifa / Kategoriya',
    selectCategoryPrompt: 'Toifani tanlang',
    newProdBrandLabel: 'Brend (ixtiyoriy)',
    newProdBrandPlaceholder: 'Masalan: Samsung, Apple, Artel',
    newProdModelLabel: 'Model (ixtiyoriy)',
    newProdModelPlaceholder: 'Masalan: SM-A556B',
    newProdBarcodeLabel: 'Shtrixkod (ixtiyoriy, 8-14 raqam)',
    newProdBarcodePlaceholder: 'Masalan: 8806091234567',
    newProdImageLabel: 'Rasm havolasi (URL, ixtiyoriy)',
    newProdImagePlaceholder: 'https://example.com/image.jpg',
    newProdDescLabel: 'Mahsulot haqida tavsif (ixtiyoriy)',
    newProdDescPlaceholder: 'Texnik xususiyatlari, ranglari va to‘plami haqida qisqacha yozing...',
    newProdProposedPriceLabel: 'Kutilayotgan sotuv narxi (UZS, ixtiyoriy)',
    sendProductSubmissionBtn: 'Yangi mahsulotni tasdiqlashga yuborish',
    productSubmittedSuccess:
      'Yangi mahsulot taklifi moderatorlarga yuborildi. Katalogga qo‘shilgach, do‘koningizga narx biriktirishingiz mumkin.',

    noSubmissionsTitle: 'Hozircha arizalar mavjud emas',
    noSubmissionsDesc:
      'Ushbu do‘kon uchun yuborilgan barcha narx takliflari va yangi mahsulot arizalari shu yerda ko‘rinadi.',
    offerSubmissionBadge: 'Narx taklifi',
    productSubmissionBadge: 'Yangi mahsulot',
    statusPending: 'Kutilmoqda',
    statusApproved: 'Tasdiqlandi',
    statusRejected: 'Rad etildi',
    adminNoteLabel: 'Moderator izohi:',
    resubmitBtn: 'Qayta yuborish',
    dateLabel: 'Sana',
  },
  ru: {
    dashboardTitle: 'Кабинет владельца магазина',
    dashboardSubtitle: 'Управление торговыми точками, статусом заявок и каталогом товаров',
    applyButton: 'Открыть новый магазин',
    myStores: 'Мои магазины',
    noStoresTitle: 'У вас пока нет зарегистрированных магазинов',
    noStoresDesc: 'Подайте заявку, чтобы открыть торговую точку на платформе BirQidir.',
    selectStorePrompt: 'Выберите магазин для просмотра товаров и предложений',
    selectedStoreBadge: 'Выбранный магазин',
    verifiedBadge: 'Проверенный партнёр',
    pendingBadge: 'На модерации (ожидание)',
    activeStatus: 'Активен',
    pendingStatus: 'Рассматривается',
    archivedStatus: 'В архиве',
    emailNotVerifiedTitle: 'Подтвердите адрес электронной почты',
    emailNotVerifiedDesc:
      'Для доступа в кабинет владельца и подачи заявки необходимо подтвердить вашу электронную почту.',
    resendVerificationBtn: 'Отправить письмо с подтверждением повторно',
    refreshStatusBtn: 'Обновить статус',
    verificationSent: 'Письмо отправлено на вашу почту. Перейдите по ссылке в письме.',
    verificationError: 'Произошла ошибка при отправке письма.',
    loadingStores: 'Загрузка списка магазинов...',

    applyTitle: 'Заявка на открытие магазина',
    applySubtitle: 'Введите данные торговой точки. Заявка будет рассмотрена администраторами.',
    backToDashboard: 'Назад в кабинет',
    nameLabel: 'Название магазина',
    namePlaceholder: 'Например: Нукус Электроника, Media Store',
    cityLabel: 'Город / Районный центр',
    districtLabel: 'Район / Территория',
    districtPlaceholder: 'Выберите район (необязательно)',
    addressLabel: 'Полный адрес',
    addressPlaceholder: 'Улица, номер дома, ориентир',
    phoneLabel: 'Контактный телефон',
    phonePlaceholder: '+998 90 123 45 67',
    categoryLabel: 'Основная категория',
    placeTypeLabel: 'Тип торговой точки',
    hoursLabel: 'Режим работы',
    hoursPlaceholder: 'Например: 09:00 - 20:00 (ежедневно)',
    coordsLabel: 'Географические координаты (широта и долгота)',
    getGpsCoordsBtn: 'Определить моё местоположение',
    coordsHelp: 'Координаты необходимы для корректного отображения на карте.',
    descriptionLabel: 'Описание магазина (необязательно)',
    descriptionPlaceholder: 'Кратко расскажите о вашем магазине, удобствах или ассортименте...',
    websiteLabel: 'Веб-сайт или соцсеть (необязательно)',
    websitePlaceholder: 'https://...',
    submitBtn: 'Отправить заявку',
    submittingBtn: 'Проверка данных заявки...',
    securityNoticeTitle: 'Порядок безопасности и модерации',
    securityNoticeText:
      'Новый магазин создается в непроверенном статусе. Идентификатор владельца (ownerId) жестко привязывается к вашему аккаунту.',
    rulesPendingNotice:
      'Внимание: запись в реальную базу Firestore станет доступна после утверждения правил безопасности Firebase.',
    rulesDeniedError:
      'Заявка не сохранена в облачной базе: у вашего аккаунта нет прав на создание магазина (Firebase Security Rules).',
    successTitle: 'Ваша заявка принята!',
    successDesc:
      'Данные проверены, заявка успешно сформирована. После модерации ваш магазин появится в каталоге и на карте.',

    offersTitle: 'Товары и ценовые предложения',
    offersSubtitle: 'Список товаров, привязанных к данному магазину',
    noOffersTitle: 'Товарные предложения пока не добавлены',
    noOffersDesc: 'Привяжите товары и цены к вашему магазину.',
    addOfferBtn: 'Добавить предложение товара',
    offersStagedNotice:
      'Запись предложений в реальную базу Firestore будет активирована на следующем этапе после обновления правил безопасности Firebase.',
    priceLabel: 'Цена',
    availabilityLabel: 'Наличие',
    inStock: 'В наличии',
    onOrder: 'Под заказ',
    outOfStock: 'Нет в наличии',
    warrantyLabel: 'Гарантия',
    deliveryLabel: 'Доставка',
    availableDelivery: 'Есть',
    noDelivery: 'Нет',

    activeOffersTab: 'Активные предложения',
    submissionsTab: 'История заявок',

    selectExistingTab: 'Выбрать из каталога',
    suggestNewTab: 'Предложить новый товар',
    modalTitle: 'Привязка товара и установка цены',
    inactiveStoreWarning:
      'Этот магазин неактивен или не подтвержден. Добавление товаров доступно только для активных магазинов.',
    searchCatalogPlaceholder: 'Поиск товара по названию или бренду в каталоге...',
    selectedProduct: 'Выбранный товар',
    changeProduct: 'Изменить',
    noProductsFound:
      'Товар не найден. Если его нет в каталоге, вы можете предложить новый товар через соседнюю вкладку.',
    variantLabel: 'Вариант товара (необязательно)',
    selectVariantPlaceholder: 'Основной вариант (базовый)',
    priceUzsLabel: 'Цена продажи (UZS)',
    pricePlaceholder: 'Например: 2 500 000',
    warrantyMonthsLabel: 'Гарантия (в месяцах)',
    warrantyPlaceholder: 'Например: 12 (от 0 до 120)',
    deliveryCheckboxLabel: 'Доступна доставка покупателю',
    notesLabel: 'Примечание к товару (необязательно)',
    notesPlaceholder: 'Например: Новый, в заводской упаковке, доставка за 2 часа',
    cancelBtn: 'Отмена',
    sendOfferSubmissionBtn: 'Отправить на модерацию',
    sendingBtn: 'Отправка...',
    offerSubmittedSuccess:
      'Ценовое предложение отправлено на модерацию. После утверждения оно появится в поиске для покупателей.',
    duplicatePendingError: 'Заявка по этому товару уже находится на модерации.',

    newProdNameLabel: 'Название товара',
    newProdNamePlaceholder: 'Например: Samsung Galaxy A55 128GB',
    newProdCategoryLabel: 'Категория',
    selectCategoryPrompt: 'Выберите категорию',
    newProdBrandLabel: 'Бренд (необязательно)',
    newProdBrandPlaceholder: 'Например: Samsung, Apple, Artel',
    newProdModelLabel: 'Модель (необязательно)',
    newProdModelPlaceholder: 'Например: SM-A556B',
    newProdBarcodeLabel: 'Штрихкод (необязательно, 8-14 цифр)',
    newProdBarcodePlaceholder: 'Например: 8806091234567',
    newProdImageLabel: 'Ссылка на изображение (URL, необязательно)',
    newProdImagePlaceholder: 'https://example.com/image.jpg',
    newProdDescLabel: 'Описание товара (необязательно)',
    newProdDescPlaceholder: 'Кратко опишите характеристики, цвета и комплектацию...',
    newProdProposedPriceLabel: 'Ориентировочная цена (UZS, необязательно)',
    sendProductSubmissionBtn: 'Отправить товар на утверждение',
    productSubmittedSuccess:
      'Предложение товара отправлено модераторам. После добавления в каталог вы сможете установить цену.',

    noSubmissionsTitle: 'Заявок пока нет',
    noSubmissionsDesc:
      'Здесь будут отображаться все заявки на добавление цен и новых товаров для этого магазина.',
    offerSubmissionBadge: 'Ценовое предложение',
    productSubmissionBadge: 'Новый товар',
    statusPending: 'Ожидает проверки',
    statusApproved: 'Одобрено',
    statusRejected: 'Отклонено',
    adminNoteLabel: 'Комментарий модератора:',
    resubmitBtn: 'Отправить повторно',
    dateLabel: 'Дата',
  },
};

export function getMerchantTexts(lang?: MapLanguage): MerchantTexts {
  const activeLang = lang || getSavedMapLanguage();
  return MERCHANT_TRANSLATIONS[activeLang] || MERCHANT_TRANSLATIONS.uz;
}
