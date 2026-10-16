import React from 'react';
import { Scale, CheckCircle2, Store, Truck, ShieldCheck, ArrowRight, ExternalLink } from 'lucide-react';
import { Card } from '@/components/common/Card';
import './PriceComparisonSection.css';

export const PriceComparisonSection: React.FC = () => {
  return (
    <section id="comparison-section" className="bq-comparison-section">
      <div className="container">
        {/* Section Header */}
        <div className="bq-section-header bq-section-header--center">
          <div className="bq-section-tag">
            <Scale size={14} />
            <span>Narxlarni solishtirish</span>
          </div>
          <h2 className="bq-section-title">
            Bir mahsulot. Turli takliflar. <br />
            <span className="text-emerald">O‘zingiz tanlagan narx.</span>
          </h2>
          <p className="bq-section-desc">
            BirQidir turli do‘konlar, rasmiy distribyutorlar va onlayn sotuvchilar narxlarini bir jadvalda
            jamlaydi. Endi o‘nlab saytlarni alohida ochish shart emas.
          </p>
        </div>

        {/* Feature Grid with Illustrative Comparison Mockup */}
        <div className="bq-comparison-grid">
          {/* Left Column: Key Advantages */}
          <div className="bq-comparison-benefits">
            <div className="bq-benefit-item">
              <div className="bq-benefit-icon">
                <CheckCircle2 size={18} />
              </div>
              <div>
                <h3 className="bq-benefit-title">Shaffof va adolatli taqqoslash</h3>
                <p className="bq-benefit-desc">
                  Har bir mahsulot bo‘yicha eng arzon va eng qulay takliflarni bitta sahifada ko‘ring.
                </p>
              </div>
            </div>

            <div className="bq-benefit-item">
              <div className="bq-benefit-icon">
                <Store size={18} />
              </div>
              <div>
                <h3 className="bq-benefit-title">Mahalliy va onlayn do‘konlar</h3>
                <p className="bq-benefit-desc">
                  Faqat yirik internet-do‘konlar emas, balki yaqin atrofdagi savdo markazlari takliflari ham mavjud.
                </p>
              </div>
            </div>

            <div className="bq-benefit-item">
              <div className="bq-benefit-icon">
                <Truck size={18} />
              </div>
              <div>
                <h3 className="bq-benefit-title">Yetkazish va kafolat shartlari</h3>
                <p className="bq-benefit-desc">
                  Narxdan tashqari yetkazib berish muddati va rasmiy servis kafolatini ham solishtiring.
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Illustrative UI Mockup (Clearly labeled as example) */}
          <Card variant="default" padding="none" className="bq-mockup-card">
            {/* Mockup Header Label */}
            <div className="bq-mockup-header">
              <span className="bq-mockup-badge">
                Namuna / Konsept — Real vaqtda narxlar solishtiruvi
              </span>
              <span className="bq-mockup-tag">2-Bosqich loyihasi</span>
            </div>

            {/* Mockup Product Preview */}
            <div className="bq-mockup-product-bar">
              <div className="bq-mockup-product-thumb">
                <Scale size={20} />
              </div>
              <div className="bq-mockup-product-info">
                <div className="bq-mockup-product-name">Misol: Smartfon 128GB (Flagman model)</div>
                <div className="bq-mockup-product-meta">
                  12 ta do‘konda mavjud • Narx diapazoni: 4 200 000 — 4 950 000 so‘m
                </div>
              </div>
            </div>

            {/* Mockup Offer Table Rows */}
            <div className="bq-mockup-offers-list">
              {/* Row 1 */}
              <div className="bq-mockup-row bq-mockup-row--best">
                <div className="bq-mockup-seller">
                  <div className="bq-mockup-seller-name">Do‘kon A (Malika bozori)</div>
                  <div className="bq-mockup-seller-meta">
                    <span className="text-success">Eng yaxshi narx</span> • 1 yil rasmiy kafolat
                  </div>
                </div>
                <div className="bq-mockup-pricing">
                  <div className="bq-mockup-price">4 200 000 so‘m</div>
                  <div className="bq-mockup-delivery">Bugun olib ketish</div>
                </div>
                <button type="button" className="bq-mockup-action-btn" disabled>
                  <span>Ko‘rish</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Row 2 */}
              <div className="bq-mockup-row">
                <div className="bq-mockup-seller">
                  <div className="bq-mockup-seller-name">Do‘kon B (Rasmiy riteyl)</div>
                  <div className="bq-mockup-seller-meta">
                    <ShieldCheck size={13} className="inline-icon" /> Rasmiy kafolat • Tekshirilgan
                  </div>
                </div>
                <div className="bq-mockup-pricing">
                  <div className="bq-mockup-price">4 350 000 so‘m</div>
                  <div className="bq-mockup-delivery">Bepul yetkazish (1 kun)</div>
                </div>
                <button type="button" className="bq-mockup-action-btn" disabled>
                  <span>Ko‘rish</span>
                  <ArrowRight size={14} />
                </button>
              </div>

              {/* Row 3 */}
              <div className="bq-mockup-row">
                <div className="bq-mockup-seller">
                  <div className="bq-mockup-seller-name">Do‘kon C (Onlayn market)</div>
                  <div className="bq-mockup-seller-meta">Muddatli to‘lov mavjud</div>
                </div>
                <div className="bq-mockup-pricing">
                  <div className="bq-mockup-price">4 490 000 so‘m</div>
                  <div className="bq-mockup-delivery">Yetkazish 24 soatda</div>
                </div>
                <button type="button" className="bq-mockup-action-btn" disabled>
                  <span>Ko‘rish</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>

            {/* Mockup Notice Disclaimer */}
            <div className="bq-mockup-disclaimer">
              <ExternalLink size={13} />
              <span>
                Eslatma: Bu illyustrativ namunadir. Haqiqiy do‘konlar narxlari 2-bosqichda ulanadi.
              </span>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
};
