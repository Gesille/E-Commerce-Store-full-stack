// app/products/page.tsx
"use client";

import { useState } from "react";
import { getColumns, Product } from "./columns";
import { DataTable } from "./data-table";
import { useGetAllProductsQuery } from "@/redux/product/productApi";
import { UpdateProductModal } from "@/components/product/UpdateProductModal";
import { DeleteProductModal } from "@/components/product/DeleteProductModal";


const ProductsPage = () => {
  const { data: products = [] as Product[], isLoading, isError, refetch } = useGetAllProductsQuery();

  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);

  const columns = getColumns(
    (p) => setEditProduct(p),   // opens update modal
    (p) => setDeleteProduct(p)  // opens delete modal
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
        onSuccess={refetch}   // ✅ refreshes table after update
      />

      <DeleteProductModal
        product={deleteProduct}
        open={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onSuccess={refetch}   // ✅ refreshes table after delete
      />
    </div>
  );
};

export default ProductsPage;