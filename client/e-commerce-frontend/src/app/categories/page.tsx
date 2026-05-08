"use client";

import Link from "next/link";

const categories = [
  {
    title: "Kitchen",
    subtitle: "Cook like a professional chef",
    description: "Premium kitchen tools built for precision and durability.",
    href: "/categories/kitchen",
    image:
      "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Bar",
    subtitle: "Craft perfect cocktails",
    description: "Professional bar equipment for modern mixology.",
    href: "/categories/bar",
    image:
      "https://images.unsplash.com/photo-1528823872057-9c018a7a7553?auto=format&fit=crop&w=1600&q=80",
  },
  {
    title: "Restaurant",
    subtitle: "Build your food business",
    description: "Complete commercial kitchen solutions.",
    href: "/categories/restaurant",
    image:
      "https://images.unsplash.com/photo-1529692236671-f1f6cf9683ba?auto=format&fit=crop&w=1600&q=80",
  },
];

export default function CategoriesPage() {
  return (
    <div className="space-y-14">

      {/* HEADER */}
      <div className="text-center mt-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Explore Categories
        </h1>
        <p className="text-gray-500 mt-3 text-lg">
          Discover tools designed for professionals
        </p>
      </div>

      {/* GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* FEATURED */}
        <Link href={categories[0].href} className="lg:col-span-2">
          <div className="relative h-[520px] rounded-3xl overflow-hidden group shadow-xl">

            {/* IMAGE */}
            <div
              className="absolute inset-0 bg-cover bg-center scale-110 group-hover:scale-100 transition duration-700"
              style={{ backgroundImage: `url(${categories[0].image})` }}
            />

            {/* DARK LAYER */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />

            {/* CONTENT */}
            <div className="absolute bottom-10 left-10 text-white max-w-xl">

              <p className="text-sm uppercase tracking-widest text-gray-300">
                Featured Category
              </p>

              <h2 className="text-4xl font-bold mt-2">
                {categories[0].title}
              </h2>

              <p className="mt-2 text-lg text-gray-200">
                {categories[0].subtitle}
              </p>

              <p className="mt-3 text-gray-300">
                {categories[0].description}
              </p>

              <div className="mt-6 inline-block px-6 py-3 border border-white/70 hover:bg-white hover:text-black transition">
                Explore
              </div>

            </div>

          </div>
        </Link>

        {/* SIDE CARDS */}
        <div className="flex flex-col gap-8">

          {categories.slice(1).map((cat) => (
            <Link key={cat.href} href={cat.href}>
              <div className="relative h-[250px] rounded-3xl overflow-hidden group shadow-lg">

                {/* IMAGE */}
                <div
                  className="absolute inset-0 bg-cover bg-center scale-110 group-hover:scale-100 transition duration-700"
                  style={{ backgroundImage: `url(${cat.image})` }}
                />

                {/* GRADIENT */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-black/20" />

                {/* TEXT */}
                <div className="absolute bottom-5 left-5 text-white">

                  <h3 className="text-2xl font-bold">
                    {cat.title}
                  </h3>

                  <p className="text-sm text-gray-300">
                    {cat.subtitle}
                  </p>
                   <div className="mt-6 inline-block px-6 py-3 border border-white/70 hover:bg-white hover:text-black transition">
                Explore
              </div>

                </div>

              </div>
            </Link>
          ))}

        </div>

      </div>
    </div>
  );
}