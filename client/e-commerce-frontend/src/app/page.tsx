import HeroSection from "../components/HeroSection";
import ProductList from "../components/ProductList";
import Testimonials from "../components/whyus";

const Homepage = async ({
  searchParams,
}: {
  searchParams: Promise<{ category: string }>;
}) => {
  const category = (await searchParams).category;

  return (
    <div className="space-y-16"> {/* 👈 this adds space between all sections */}

      <div className="relative aspect-3/1">
        <HeroSection />
      </div>

      <ProductList params="homepage" />

      <Testimonials />

    </div>
  );
};

export default Homepage;