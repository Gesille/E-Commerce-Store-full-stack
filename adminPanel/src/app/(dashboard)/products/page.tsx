// app/products/page.tsx
"use client";

import { useState } from "react";
import { getColumns, Product } from "./columns";
import { DataTable } from "./data-table";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { UpdateProductModal } from "@/components/product/UpdateProductModal";
import { DeleteProductModal } from "@/components/product/DeleteProductModal";
import { ProductHistoryDrawer } from "@/components/product/ProductHistoryDrawer";
import { ProductDetailsDrawer } from "@/components/product/Productdetailsdrawer";

const ProductsPage = () => {
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
 const [detailsProduct, setDetailsProduct] = useState<Product | null>(null);
  const { data: products = [], isLoading, isError, refetch } = useGetAllProductsQuery();
 const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const columns = getColumns(
    (p) => setEditProduct(p),
    (p) => setDeleteProduct(p),
    (p) => setHistoryProduct(p),
    (p) => setDetailsProduct(p)
  );

  if (isLoading) return <p className="p-4">Loading products...</p>;
  if (isError) return <p className="p-4 text-red-500">Failed to load products.</p>;

  return (
    <div>
      <div className="mb-8 px-4 py-2 bg-secondary rounded-md">
        <h1 className="font-semibold">All Products</h1>
      </div>

      <DataTable columns={columns} data={products} />

      <UpdateProductModal
        product={editProduct}
        open={!!editProduct}
        onClose={() => setEditProduct(null)}
        onSuccess={refetch}
      />

      <DeleteProductModal
        product={deleteProduct}
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onSuccess={refetch}
      />
      <ProductHistoryDrawer
      product ={historyProduct}
      open ={!!historyProduct}
      onClose={() => setHistoryProduct(null)}
      />
      <ProductDetailsDrawer
        product={detailsProduct}
        open={!!detailsProduct}
        onClose={() => setDetailsProduct(null)}
      />
    </div>
  );
};

export default ProductsPage;