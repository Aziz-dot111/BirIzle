import React from 'react';
import { HeroSection } from '@/features/home/HeroSection';
import { CategoryGrid } from '@/features/home/CategoryGrid';
import { FeaturedProductsSection } from '@/features/home/FeaturedProductsSection';
import { PriceComparisonSection } from '@/features/home/PriceComparisonSection';
import { ServicesSection } from '@/features/home/ServicesSection';
import { NearbyStoresSection } from '@/features/home/NearbyStoresSection';
import { BusinessCtaSection } from '@/features/home/BusinessCtaSection';

export const HomePage: React.FC = () => {
  return (
    <div className="bq-home-page">
      <HeroSection />
      <CategoryGrid />
      <FeaturedProductsSection />
      <PriceComparisonSection />
      <ServicesSection />
      <NearbyStoresSection />
      <BusinessCtaSection />
    </div>
  );
};
