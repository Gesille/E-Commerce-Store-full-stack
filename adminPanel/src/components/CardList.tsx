"use client";


import { useGetLatestTransactionsQuery } from "@/redux/order/orderApi";
import { useGetTopSellingProductsQuery } from "@/redux/product/productApi";
import { Skeleton } from "./ui/skeleton";

const AVATAR_COLORS = [
  "from-blue-500 to-indigo-500",
  "from-green-500 to-emerald-500",
  "from-pink-500 to-rose-500",
  "from-yellow-500 to-orange-500",
  "from-purple-500 to-violet-500",
];

const CardList = ({ title }: { title: string }) => {
  const isProducts = title === "Popular Products";

  const { data: topProducts, isLoading: loadingProducts } =
    useGetTopSellingProductsQuery(undefined, { skip: !isProducts });

  const { data: transactions, isLoading: loadingTransactions } =
    useGetLatestTransactionsQuery(undefined, { skip: isProducts });

  const isLoading = isProducts ? loadingProducts : loadingTransactions;
  const data = isProducts ? (topProducts ?? []) : (transactions ?? []);

  if (isLoading) {
    return (
      <div>
        <h1 className="text-lg font-medium mb-6">{title}</h1>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-lg font-medium mb-6">{title}</h1>

      <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-1">
        {data.map((item: any, index: number) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all hover:-translate-y-[1px]"
          >
            {/* Colored indicator */}
            <div
              className={`w-1.5 h-10 rounded-full bg-gradient-to-b ${
                AVATAR_COLORS[index % AVATAR_COLORS.length]
              }`}
            />

            {/* Initials avatar */}
            <div
              className={`w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold text-sm bg-gradient-to-br ${
                AVATAR_COLORS[index % AVATAR_COLORS.length]
              }`}
            >
              {isProducts
                ? item.name?.slice(0, 2).toUpperCase()
                : item.customerName?.slice(0, 2).toUpperCase()}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {isProducts ? item.name : item.customerName}
              </p>
              <p className="text-xs text-gray-400">
                {isProducts
                  ? `${item.totalQty} units sold`
                  : item.orderRef}
              </p>
            </div>

            {/* Value */}
            <div className="text-sm font-bold text-gray-700 whitespace-nowrap">
              ${isProducts
                ? item.totalRevenue.toLocaleString()
                : item.amount.toLocaleString()}
            </div>
          </div>
        ))}

        {data.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-6">
            No data available
          </p>
        )}
      </div>
    </div>
  );
};

export default CardList;