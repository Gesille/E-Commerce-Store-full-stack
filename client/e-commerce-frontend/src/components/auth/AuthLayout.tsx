"use client";

import Image from "next/image";

export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">

      <div className="w-full max-w-md bg-white rounded-[2rem] overflow-hidden shadow-2xl border border-gray-100">

        {/* HEADER (same design) */}
        <div className="p-8 pb-4 flex flex-col items-center">
          <div className="relative w-16 h-16 mb-4">
            <Image src="/chefworldlogo.png" alt="Logo" fill className="object-contain" />
          </div>

          <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>

        {/* CONTENT */}
        <div className="p-8 pt-2">{children}</div>

      </div>
    </div>
  );
}