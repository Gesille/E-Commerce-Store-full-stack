
import ProductList from "@/src/components/ProductList";
import { Suspense } from "react";


const ProductsPage = async ({
  searchParams,
}: {
  searchParams: Promise<{ category: string }>;
}) => {
  
  return (
    <div className="">
       <Suspense fallback={<div>Loading search...</div>}>
      <ProductList  params="products"/>
      </Suspense>
    </div>
  );
};

export default ProductsPage;