
import ProductList from "@/src/components/ProductList";


const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ category: string }>;
}) => {
  
  return (
    <div className="">
      <ProductList  params="products"/>
    </div>
  );
};

export default ProductsPage;