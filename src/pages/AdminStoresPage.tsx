import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Store as StoreIcon,
  Plus,
  Search,
  Edit2,
  EyeOff,
  Eye,
  X,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import type { Store, Coordinates, CreateStoreInput, UpdateStoreInput } from '@/types';
import {
  getStores,
  createAdminStore,
  updateStore,
  deactivateStore,
  reactivateStore,
} from '@/services/firebase/catalog';
import { MapLocationPicker } from '@/components/map/MapLocationPicker';
import { isValidCoordinates } from '@/utils/geo';
import { validateStoreInput, validateCoordinates } from '@/utils/catalogValidation';
import './AdminStoresPage.css';

const DEFAULT_NUKUS_COORDS: Coordinates = { lat: 42.4619, lng: 59.6166 };

const STORE_CATEGORIES = [
  'Elektronika va maishiy texnika',
  'Oziq-ovqat va supermarket',
  'Kiyim-kechak va poyabzal',
  'Qurilish mollari va xo‘jalik',
  'Dorixona va salomatlik',
  'Avtomobil ehtiyot qismlari',
  'Kosmetika va parfyumeriya',
  'Kitob va kanselyariya',
  'Xizmatlar va ustaxonalar',
  'Boshqa',
];

export const AdminStoresPage: React.FC = () => {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);

  // Form Field States
  const [name, setName] = useState<string>('');
  const [city, setCity] = useState<string>('Nukus');
  const [district, setDistrict] = useState<string>('');
  const [address, setAddress] = useState<string>('');
  const [category, setCategory] = useState<string>(STORE_CATEGORIES[0]);
  const [phone, setPhone] = useState<string>('');
  const [openingHours, setOpeningHours] = useState<string>('09:00 - 20:00');
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [coordinates, setCoordinates] = useState<Coordinates>(DEFAULT_NUKUS_COORDS);

  // Form Submitting & Error States
  const [formSubmitting, setFormSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Notification Banner
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => {
      setAlert((cur) => (cur?.message === message ? null : cur));
    }, 5000);
  };

  // Fetch BirQidir Stores
  const fetchStores = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getStores({
        includeDemo: true, // Allow fallback if spark plan demo
        includeOsm: false, // Focus purely on BirQidir managed stores
        sourceType: 'birqidir',
        includeAllStatuses: true,
      });
      if (res.data) {
        setStores(res.data);
      } else if (res.error) {
        showAlert('error', res.error);
      }
    } catch (err) {
      console.error('[BirQidir Admin] Error fetching stores:', err);
      showAlert('error', 'Do‘konlar ro‘yxatini yuklashda xatolik yuz berdi.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStores();
  }, [fetchStores]);

  // Filtered Stores List
  const filteredStores = useMemo(() => {
    return stores.filter((store) => {
      // 1. Status Filter
      if (statusFilter === 'active' && store.status === 'archived') return false;
      if (statusFilter === 'archived' && store.status !== 'archived') return false;

      // 2. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = store.name.toLowerCase().includes(q);
        const addrMatch = store.address.toLowerCase().includes(q);
        const catMatch = store.category.toLowerCase().includes(q);
        const distMatch = store.district ? store.district.toLowerCase().includes(q) : false;
        return nameMatch || addrMatch || catMatch || distMatch;
      }

      return true;
    });
  }, [stores, statusFilter, searchQuery]);

  // Open Create Store Modal
  const handleOpenCreateModal = () => {
    setModalMode('create');
    setEditingStoreId(null);
    setName('');
    setCity('Nukus');
    setDistrict('');
    setAddress('');
    setCategory(STORE_CATEGORIES[0]);
    setPhone('');
    setOpeningHours('09:00 - 20:00');
    setDescription('');
    setWebsite('');
    setCoordinates(DEFAULT_NUKUS_COORDS);
    setFormError(null);
    setIsModalOpen(true);
  };

  // Open Edit Store Modal
  const handleOpenEditModal = (store: Store) => {
    setModalMode('edit');
    setEditingStoreId(store.id);
    setName(store.name || '');
    setCity(store.city || 'Nukus');
    setDistrict(store.district || '');
    setAddress(store.address || '');
    setCategory(store.category || STORE_CATEGORIES[0]);
    setPhone(store.phone || '');
    setOpeningHours(store.openingHours || '');
    setDescription(store.description || '');
    setWebsite(store.website || '');
    setCoordinates(
      isValidCoordinates(store.coordinates) ? store.coordinates : DEFAULT_NUKUS_COORDS
    );
    setFormError(null);
    setIsModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    if (formSubmitting) return;
    setIsModalOpen(false);
    setFormError(null);
  };

  // Submit Modal Form (Create or Edit)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // 1. Client-Side Input Validation
    const storePayload: CreateStoreInput = {
      name: name.trim(),
      city: city.trim() || 'Nukus',
      district: district.trim() || undefined,
      address: address.trim(),
      category: category.trim(),
      phone: phone.trim() || undefined,
      openingHours: openingHours.trim() || undefined,
      description: description.trim() || undefined,
      website: website.trim() || undefined,
      coordinates,
    };

    const validation = validateStoreInput(storePayload, { allowOptionalContact: true });
    if (!validation.isValid) {
      setFormError(validation.error || 'Iltimos, barcha majburiy maydonlarni to‘ldiring.');
      return;
    }

    const coordsCheck = validateCoordinates(coordinates);
    if (!coordsCheck.isValid) {
      setFormError(coordsCheck.error || 'Geografik koordinatalar noto‘g‘ri kiritildi.');
      return;
    }

    setFormSubmitting(true);

    try {
      if (modalMode === 'create') {
        const res = await createAdminStore(storePayload);
        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          showAlert('success', `“${res.data.name}” do‘koni muvaffaqiyatli yaratildi.`);
          setStores((prev) => [res.data!, ...prev]);
          setIsModalOpen(false);
        }
      } else if (modalMode === 'edit' && editingStoreId) {
        const updatePayload: UpdateStoreInput = {
          name: storePayload.name,
          city: storePayload.city,
          district: storePayload.district,
          address: storePayload.address,
          category: storePayload.category,
          phone: storePayload.phone,
          openingHours: storePayload.openingHours,
          description: storePayload.description,
          website: storePayload.website,
          coordinates: storePayload.coordinates,
        };

        const res = await updateStore(editingStoreId, updatePayload);
        if (res.error) {
          setFormError(res.error);
        } else if (res.data) {
          showAlert('success', `“${res.data.name}” do‘koni muvaffaqiyatli yangilandi.`);
          setStores((prev) =>
            prev.map((s) => (s.id === editingStoreId ? res.data! : s))
          );
          setIsModalOpen(false);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kutilmagan xatolik yuz berdi.';
      setFormError(msg);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Toggle Store Status (Deactivate / Reactivate)
  const handleToggleStoreStatus = async (store: Store) => {
    const isCurrentlyActive = store.status !== 'archived';
    const actionName = isCurrentlyActive ? 'deaktivatsiya qilish' : 'qayta faollashtirish';

    if (
      !window.confirm(
        `Haqiqatan ham “${store.name}” do‘konini ${actionName}ni xohlaysizmi?`
      )
    ) {
      return;
    }

    try {
      const res = isCurrentlyActive
        ? await deactivateStore(store.id)
        : await reactivateStore(store.id);

      if (res.error) {
        showAlert('error', res.error);
      } else if (res.data) {
        const updatedStore = res.data;
        setStores((prev) =>
          prev.map((s) => (s.id === store.id ? updatedStore : s))
        );
        showAlert(
          'success',
          isCurrentlyActive
            ? `“${store.name}” do‘koni deaktivatsiya qilindi.`
            : `“${store.name}” do‘koni qayta faollashtirildi.`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Holatni o‘zgartirishda xatolik yuz berdi.';
      showAlert('error', msg);
    }
  };

  return (
    <div className="bq-admin-page">
      <div className="container">
        {/* Header with Title and Add Store Button */}
        <div className="bq-admin-header">
          <div>
            <div className="bq-admin-badge">
              <StoreIcon size={14} />
              <span>Admin Boshqaruvi</span>
            </div>
            <h1 className="bq-admin-title">Do‘konlar boshqaruvi</h1>
            <p className="bq-admin-subtitle">
              Nukus shahri va hududlardagi barcha savdo nuqtalarini kiritish, tahrirlash va
              xaritada joylashtirish
            </p>
          </div>

          <div className="bq-admin-actions">
            <button
              type="button"
              className="bq-admin-btn-primary"
              onClick={handleOpenCreateModal}
            >
              <Plus size={18} />
              <span>Yangi do‘kon qo‘shish</span>
            </button>
          </div>
        </div>

        {/* Success/Error Alert Toast */}
        {alert && (
          <div
            className={`bq-admin-alert ${
              alert.type === 'success' ? 'bq-admin-alert--success' : 'bq-admin-alert--error'
            }`}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {alert.type === 'success' ? (
                <CheckCircle size={18} />
              ) : (
                <AlertCircle size={18} />
              )}
              <span>{alert.message}</span>
            </div>
            <button
              type="button"
              className="bq-admin-alert__close"
              onClick={() => setAlert(null)}
              title="Yopish"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Controls: Search Query and Filter Tabs */}
        <div className="bq-admin-controls">
          <div className="bq-admin-search">
            <Search size={16} className="bq-admin-search__icon" />
            <input
              type="text"
              className="bq-admin-search__input"
              placeholder="Do‘kon nomi, manzili yoki toifasi bo‘yicha qidirish..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="bq-admin-filter-tabs">
            <button
              type="button"
              className={`bq-admin-tab-btn ${
                statusFilter === 'all' ? 'bq-admin-tab-btn--active' : ''
              }`}
              onClick={() => setStatusFilter('all')}
            >
              Barchasi ({stores.length})
            </button>
            <button
              type="button"
              className={`bq-admin-tab-btn ${
                statusFilter === 'active' ? 'bq-admin-tab-btn--active' : ''
              }`}
              onClick={() => setStatusFilter('active')}
            >
              Faol ({stores.filter((s) => s.status !== 'archived').length})
            </button>
            <button
              type="button"
              className={`bq-admin-tab-btn ${
                statusFilter === 'archived' ? 'bq-admin-tab-btn--active' : ''
              }`}
              onClick={() => setStatusFilter('archived')}
            >
              Nofaol ({stores.filter((s) => s.status === 'archived').length})
            </button>
          </div>
        </div>

        {/* Stores Table Card */}
        <div className="bq-admin-table-card">
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#64748B' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid #E2E8F0',
                  borderTopColor: '#059669',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  margin: '0 auto 1rem',
                }}
              />
              <p>Do‘konlar ro‘yxati yuklanmoqda...</p>
            </div>
          ) : filteredStores.length === 0 ? (
            <div className="bq-admin-empty">
              <div className="bq-admin-empty__icon">
                <StoreIcon size={26} />
              </div>
              <h3 style={{ fontSize: '1.1rem', color: '#1E293B', margin: 0 }}>
                Do‘konlar topilmadi
              </h3>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                {searchQuery
                  ? 'Qidiruv bo‘yicha mos keladigan do‘kon mavjud emas.'
                  : 'Hozircha tizimda birorta ham do‘kon kiritilmagan.'}
              </p>
              {!searchQuery && (
                <button
                  type="button"
                  className="bq-admin-btn-primary"
                  style={{ marginTop: '0.75rem' }}
                  onClick={handleOpenCreateModal}
                >
                  <Plus size={16} />
                  <span>Birinchi do‘konni qo‘shish</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bq-admin-table-wrap">
              <table className="bq-admin-table">
                <thead>
                  <tr>
                    <th>Do‘kon nomi</th>
                    <th>Manzil va hudud</th>
                    <th>Telefon</th>
                    <th>Ish vaqti</th>
                    <th>Holati</th>
                    <th>Egalik holati</th>
                    <th style={{ textAlign: 'right' }}>Amallar</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStores.map((store) => {
                    const isActive = store.status !== 'archived';
                    const isClaimed = Boolean(store.ownerId);

                    return (
                      <tr key={store.id}>
                        <td>
                          <div className="bq-store-name-cell">
                            <span className="bq-store-name">{store.name}</span>
                            <span className="bq-store-category">{store.category}</span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span>{store.address}</span>
                            <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                              {store.district || store.city} (
                              {store.coordinates.lat.toFixed(4)},{' '}
                              {store.coordinates.lng.toFixed(4)})
                            </span>
                          </div>
                        </td>
                        <td>
                          {store.phone ? (
                            <span style={{ whiteSpace: 'nowrap' }}>{store.phone}</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                        <td>
                          {store.openingHours ? (
                            <span style={{ whiteSpace: 'nowrap' }}>{store.openingHours}</span>
                          ) : (
                            <span style={{ color: '#94A3B8' }}>—</span>
                          )}
                        </td>
                        <td>
                          <span
                            className={`bq-status-pill ${
                              isActive
                                ? 'bq-status-pill--active'
                                : 'bq-status-pill--archived'
                            }`}
                          >
                            {isActive ? 'Faol' : 'Nofaol'}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`bq-status-pill ${
                              isClaimed
                                ? 'bq-status-pill--claimed'
                                : 'bq-status-pill--unclaimed'
                            }`}
                          >
                            {isClaimed ? 'Egasiga ega' : 'Egasiz (Unclaimed)'}
                          </span>
                        </td>
                        <td>
                          <div className="bq-table-actions">
                            <button
                              type="button"
                              className="bq-action-btn bq-action-btn--edit"
                              onClick={() => handleOpenEditModal(store)}
                              title="Do‘kon ma’lumotlarini tahrirlash"
                            >
                              <Edit2 size={13} />
                              <span>Tahrirlash</span>
                            </button>

                            <button
                              type="button"
                              className={`bq-action-btn ${
                                isActive
                                  ? 'bq-action-btn--deactivate'
                                  : 'bq-action-btn--reactivate'
                              }`}
                              onClick={() => handleToggleStoreStatus(store)}
                              title={
                                isActive
                                  ? 'Do‘konni deaktivatsiya qilish'
                                  : 'Do‘konni qayta faollashtirish'
                              }
                            >
                              {isActive ? <EyeOff size={13} /> : <Eye size={13} />}
                              <span>{isActive ? 'Deaktivatsiya' : 'Faollashtirish'}</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================================
          CREATE / EDIT STORE MODAL
          ====================================================================== */}
      {isModalOpen && (
        <div className="bq-modal-backdrop" onClick={handleCloseModal}>
          <div
            className="bq-modal-dialog"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="bq-modal-header">
              <h2 className="bq-modal-title">
                {modalMode === 'create'
                  ? 'Yangi do‘kon qo‘shish'
                  : 'Do‘kon ma’lumotlarini tahrirlash'}
              </h2>
              <button
                type="button"
                className="bq-modal-close"
                onClick={handleCloseModal}
                title="Yopish"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} style={{ display: 'contents' }}>
              <div className="bq-modal-body">
                {formError && (
                  <div
                    style={{
                      padding: '0.75rem 1rem',
                      backgroundColor: '#FFF1F2',
                      border: '1px solid #FECDD3',
                      borderRadius: '8px',
                      color: '#9F1239',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <AlertCircle size={16} />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Row 1: Name and Category */}
                <div className="bq-form-grid-2">
                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-name">
                      <span>Do‘kon nomi</span>
                      <span className="bq-form-label__req">*</span>
                    </label>
                    <input
                      id="bq-store-name"
                      type="text"
                      className="bq-form-input"
                      placeholder="Masalan: Nukus Electronics"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-category">
                      <span>Toifasi</span>
                      <span className="bq-form-label__req">*</span>
                    </label>
                    <select
                      id="bq-store-category"
                      className="bq-form-select"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                    >
                      {STORE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 2: City and District */}
                <div className="bq-form-grid-2">
                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-city">
                      <span>Shahar / Hudud</span>
                      <span className="bq-form-label__req">*</span>
                    </label>
                    <input
                      id="bq-store-city"
                      type="text"
                      className="bq-form-input"
                      placeholder="Nukus"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      required
                    />
                  </div>

                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-district">
                      <span>Tuman / Mahalla</span>
                      <span className="bq-form-label__opt">(ixtiyoriy)</span>
                    </label>
                    <input
                      id="bq-store-district"
                      type="text"
                      className="bq-form-input"
                      placeholder="Masalan: Nukus shahri, Markaz"
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 3: Address */}
                <div className="bq-form-group">
                  <label className="bq-form-label" htmlFor="bq-store-address">
                    <span>To‘liq manzil</span>
                    <span className="bq-form-label__req">*</span>
                  </label>
                  <input
                    id="bq-store-address"
                    type="text"
                    className="bq-form-input"
                    placeholder="Masalan: Amir Temur ko‘chasi, 45-uy (Mo‘ljal: Markaziy bozor ro‘parasi)"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    required
                  />
                </div>

                {/* Row 4: Phone and Opening Hours */}
                <div className="bq-form-grid-2">
                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-phone">
                      <span>Telefon raqami</span>
                      <span className="bq-form-label__opt">(ixtiyoriy)</span>
                    </label>
                    <input
                      id="bq-store-phone"
                      type="tel"
                      className="bq-form-input"
                      placeholder="+998901234567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                    />
                  </div>

                  <div className="bq-form-group">
                    <label className="bq-form-label" htmlFor="bq-store-hours">
                      <span>Ish tartibi va soatlari</span>
                      <span className="bq-form-label__opt">(ixtiyoriy)</span>
                    </label>
                    <input
                      id="bq-store-hours"
                      type="text"
                      className="bq-form-input"
                      placeholder="Masalan: 09:00 - 20:00 (dam olishsiz)"
                      value={openingHours}
                      onChange={(e) => setOpeningHours(e.target.value)}
                    />
                  </div>
                </div>

                {/* Row 5: Description */}
                <div className="bq-form-group">
                  <label className="bq-form-label" htmlFor="bq-store-desc">
                    <span>Qisqacha tavsif</span>
                    <span className="bq-form-label__opt">(ixtiyoriy)</span>
                  </label>
                  <textarea
                    id="bq-store-desc"
                    className="bq-form-textarea"
                    placeholder="Do‘kon haqida qo‘shimcha ma’lumotlar, taqdim etiladigan asosiy mahsulotlar..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                {/* Row 6: Map Location Picker */}
                <div className="bq-form-group">
                  <label className="bq-form-label">
                    <span>Xaritadagi joylashuvi (Location Coordinates)</span>
                    <span className="bq-form-label__req">*</span>
                  </label>
                  <MapLocationPicker
                    value={coordinates}
                    onChange={(newCoords) => setCoordinates(newCoords)}
                    height="280px"
                    disabled={formSubmitting}
                  />
                </div>
              </div>

              <div className="bq-modal-footer">
                <button
                  type="button"
                  className="bq-btn-secondary"
                  onClick={handleCloseModal}
                  disabled={formSubmitting}
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="bq-btn-primary"
                  disabled={formSubmitting}
                >
                  {formSubmitting
                    ? 'Saqlanmoqda...'
                    : modalMode === 'create'
                    ? 'Do‘konni qo‘shish'
                    : 'O‘zgarishlarni saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
