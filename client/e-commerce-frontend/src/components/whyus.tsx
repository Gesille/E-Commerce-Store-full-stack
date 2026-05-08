"use client";

import Image from "next/image";
import { Star } from "lucide-react";
import { motion, animate, useMotionValue } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const testimonials = [
  {
    name: "Michael Brown",
    role: "Restaurant Owner",
    image: "/users/user1.jpg",
    text: "Chef’s World provides top-quality kitchen equipment. Everything we purchased has been reliable and built to last.",
  },
  {
    name: "Sarah Johnson",
    role: "Head Chef",
    image: "/users/user2.avif",
    text: "The tools and equipment are professional-grade. It made a huge difference in our kitchen efficiency.",
  },
  {
    name: "David Lee",
    role: "Bar Manager",
    image: "/users/user3.avif",
    text: "Excellent service and high-quality products. I highly recommend Chef’s World for any foodservice business.",
  },
];

export default function Testimonials() {
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);

  const [width, setWidth] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const looped = [...testimonials, ...testimonials];

  useEffect(() => {
    if (!containerRef.current) return;
    setWidth(containerRef.current.scrollWidth / 2);
  }, []);

  useEffect(() => {
    if (!width || isPaused) return;

    const controls = animate(x, [0, -width], {
      ease: "linear",
      duration: 25,
      repeat: Infinity,
    });

    return () => controls.stop();
  }, [x, width, isPaused]);

  return (
    <section className="py-24 px-6 bg-white overflow-hidden">

      {/* HEADER */}
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="text-4xl font-bold text-gray-900">
          What Our Customers Say
        </h2>
        <p className="text-gray-500 mt-4">
          Trusted by professionals in kitchens worldwide.
        </p>
      </div>

      {/* CAROUSEL WRAPPER */}
      <div className="overflow-hidden py-6">

        <motion.div
          ref={containerRef}
          style={{ x }}
          className="flex gap-8 w-max"
        >

          {looped.map((t, i) => (
            <motion.div
              key={i}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
              whileHover={{ y: -8, scale: 1.03 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="
                relative w-[330px] flex-shrink-0
                bg-white p-6 rounded-3xl border
                shadow-sm hover:shadow-2xl
                transition
                group
              "
            >

              {/* gradient border on hover */}
              <div className="absolute inset-[1px] rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition" />

              <div className="relative bg-white rounded-3xl h-full p-6">

                {/* USER */}
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 relative">
                    <Image
                      src={t.image}
                      alt={t.name}
                      fill
                      className="rounded-full object-cover border"
                    />
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {t.name}
                    </h3>
                    <p className="text-sm text-gray-500">{t.role}</p>
                  </div>
                </div>

                {/* TEXT */}
                <p className="text-gray-600 text-sm leading-relaxed mb-5">
                  “{t.text}”
                </p>

                {/* STARS */}
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="currentColor" />
                  ))}
                </div>

              </div>
            </motion.div>
          ))}

        </motion.div>
      </div>
    </section>
  );
}