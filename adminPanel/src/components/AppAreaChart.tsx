"use client";

import { useState } from "react";
import {
  useGetRecentUsersQuery,
  useGetMostActiveUsersQuery,
  useGetRegistrationsPerMonthQuery,
} from "@/redux/user/userApi";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Flame, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const AVATAR_GRADIENTS = [
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-teal-500",
  "from-pink-400 to-rose-500",
  "from-amber-400 to-orange-500",
  "from-purple-400 to-violet-500",
];

const PAGE_SIZE = 5;
type Tab = "recent" | "active";

const UserInsights = () => {
  const [activeTab, setActiveTab] = useState<Tab>("recent");
  const [page, setPage] = useState(1);

  const { data: recentUsers, isLoading: loadingRecent } =
    useGetRecentUsersQuery(undefined);
  const { data: activeUsers, isLoading: loadingActive } =
    useGetMostActiveUsersQuery(undefined);
  const { data: registrationsData, isLoading: loadingChart } =
    useGetRegistrationsPerMonthQuery(undefined);

  const isLoading = loadingRecent || loadingActive;
  const allData: any[] = (activeTab === "recent" ? recentUsers : activeUsers) ?? [];

  const totalPages = Math.max(1, Math.ceil(allData.length / PAGE_SIZE));
const visibleData = allData;

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
  };


  const getPagePills = () => {
    const pages = new Set<number>();
    pages.add(1);
    pages.add(totalPages);
    for (let i = Math.max(1, page - 1); i <= Math.min(totalPages, page + 1); i++) {
      pages.add(i);
    }
    const sorted = Array.from(pages).sort((a, b) => a - b);
    const result: (number | "…")[] = [];
    sorted.forEach((p, i) => {
      if (i > 0 && p - sorted[i - 1] > 1) result.push("…");
      result.push(p);
    });
    return result;
  };

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-lg font-medium">User Insights</h1>
        </div>
        <div className="space-y-3">
          {Array.from({ length: PAGE_SIZE }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32 rounded" />
                <Skeleton className="h-2.5 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h1 className="text-lg font-medium">User Insights</h1>
        </div>

        {/* Tab toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => handleTabChange("recent")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "recent"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Clock className="w-3 h-3" />
            Recent
          </button>
          <button
            onClick={() => handleTabChange("active")}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
              activeTab === "active"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            <Flame className="w-3 h-3" />
            Most Active
          </button>
        </div>
      </div>

      {/* User list */}
     <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
        {visibleData.map((user: any, index: number) => {
          const globalIndex = (page - 1) * PAGE_SIZE + index;
          return (
            <div
              key={user._id}
              className="flex items-center gap-3 p-3 rounded-xl border bg-gradient-to-r from-white to-gray-50 hover:shadow-md transition-all hover:-translate-y-[1px]"
            >
              <span className="text-xs font-bold text-gray-300 w-4 text-center">
                {globalIndex + 1}
              </span>

              {user.avatar?.url ? (
                <img
                  src={user.avatar.url}
                  alt={user.name}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-white"
                />
              ) : (
                <div
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${
                    AVATAR_GRADIENTS[globalIndex % AVATAR_GRADIENTS.length]
                  } flex items-center justify-center text-white text-sm font-bold ring-2 ring-white`}
                >
                  {user.name?.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>

              {activeTab === "recent" ? (
                <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                  {new Date(user.createdAt).toLocaleDateString("default", {
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              ) : (
                <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium whitespace-nowrap">
                  🔥 {user.ordersCount} orders
                </span>
              )}
            </div>
          );
        })}

        {allData.length === 0 && (
          <p className="text-sm text-center text-muted-foreground py-6">
            No users found
          </p>
        )}
      </div>

      

      <div className="flex items-center gap-3 my-6">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">Analytics</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>

      {/* Chart */}
      <div className="mb-6 rounded-xl border p-4 bg-white">
        <h2 className="text-sm font-semibold mb-3 text-gray-600">
          Registrations Trend
        </h2>
        {loadingChart ? (
          <p className="text-xs text-gray-400">Loading chart...</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={registrationsData || []}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="month" />
              <YAxis
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v)}
              />
              <Tooltip
                formatter={(value) => {
                  const n = typeof value === "number" ? value : 0;
                  return n >= 1000 ? `${(n / 1000).toFixed(1)}k users` : `${n} users`;
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2}
                fill="url(#colorUsers)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default UserInsights;