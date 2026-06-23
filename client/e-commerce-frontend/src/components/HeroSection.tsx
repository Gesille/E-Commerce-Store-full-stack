/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// --- Types ---
interface Product {
  id: number;
  title: string;
  subTitle: string;
  tagline: string;
  image: string;
  accentColor: string;
  shapeType: 'circle' | 'square' | 'triangle';
  icon: string;
}


const PRODUCTS: Product[] = [
  {
    id: 1,
    title: "CULINARY",
    subTitle: "PRECISION",
    tagline: "The Sharpest Tools for Master Chefs.",
    image: "https://www.pngarts.com/files/3/Kitchen-Knife-PNG-Transparent-Image.png",
    accentColor: "#FBBF24", // Yellow Gold
    shapeType: 'circle',
    icon: "🔪"
  },
  {
    id: 2,
    title: "MIXOLOGY",
    subTitle: "ELITE",
    tagline: "Elevate Every Pour with Premium Barware.",
    image: "/juice.png",
    accentColor: "#EF4444", // Red
    shapeType: 'square',
    icon: "🍸"
  },
  {
    id: 3,
    title: "GASTRONOMY",
    subTitle: "CORE",
    tagline: "Industrial-Grade Cookware for the Bold.",
    image: "/pngwing.png",
    accentColor: "#10B981", // Emerald
    shapeType: 'triangle',
    icon: "🍲"
  }
];

// --- Geometric Shape Component ---
const AbstractShape: React.FC<{ type: string; color: string }> = ({ type, color }) => {
  const shapes = {
    circle: "M 100, 100 m -75, 0 a 75,75 0 1,0 150,0 a 75,75 0 1,0 -150,0",
    square: "M 25,25 H 175 V 175 H 25 Z",
    triangle: "M 100,25 L 175,175 H 25 Z"
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: [1, 1.1, 1], 
        transition: { duration: 10, repeat: Infinity, ease: "easeInOut" }
      }}
      className="absolute inset-0 flex items-center justify-center z-0 pointer-events-none"
    >
      <svg viewBox="0 0 200 200" className="w-[80%] h-[80%] md:w-[60%] md:h-[60%] opacity-10">
        <motion.path
          initial={{ d: shapes.circle }}
          animate={{ d: shapes[type as keyof typeof shapes] || shapes.circle }}
          transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1] }}
          fill={color}
        />
      </svg>
      <div 
        className="absolute w-1/2 h-1/2 rounded-full blur-[120px] opacity-20"
        style={{ backgroundColor: color }}
      />
    </motion.div>
  );
};

const HeroSection: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [imageError, setImageError] = useState<{ [key: number]: boolean }>({});
  const current = PRODUCTS[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % PRODUCTS.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const handleImageError = (id: number) => {
    setImageError(prev => ({ ...prev, [id]: true }));
  };

  return (
   <section className="relative w-full min-h-screen overflow-hidden flex items-center justify-center font-sans">
      
      {/* 1. LAYER: Abstract Geometric Background */}
      <AbstractShape type={current.shapeType} color={current.accentColor} />

      {/* 2. LAYER: Giant Background Typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-5 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.h1
            key={`bgtext-${current.id}`}
            initial={{ y: 200, opacity: 0 }}
            animate={{ y: 0, opacity: 0.04 }}
            exit={{ y: -200, opacity: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="text-[25vw] font-black leading-none tracking-tighter text-black select-none"
          >
            {current.title}
          </motion.h1>
        </AnimatePresence>
      </div>

      {/* 3. LAYER: Main Content Grid */}
      <div className="relative z-10 w-full max-w-7xl px-8 md:px-16 grid grid-cols-1 lg:grid-cols-12 items-center gap-12">
        
        {/* Left Side: Text Content */}
        <div className="lg:col-span-5 order-2 lg:order-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={`content-${current.id}`}
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              transition={{ duration: 0.8 }}
            >
              <motion.div 
                className="w-16 h-1 mb-8" 
                style={{ backgroundColor: current.accentColor }}
                layoutId="line"
              />
              <h2 className="text-6xl md:text-8xl font-black text-black leading-[0.85] mb-6 tracking-tighter">
                {current.title} <br />
                <span className="text-transparent bg-clip-text bg-linear-to-r from-gray-400 to-black italic">
                  {current.subTitle}
                </span>
              </h2>
              <p className="text-gray-500 text-lg md:text-xl font-light max-w-md mb-10 leading-relaxed">
                {current.tagline} Discover the ultimate selection for professional hospitality.
              </p>
              
              <div className="flex items-center gap-8">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-10 py-4 bg-black text-white font-bold text-xs tracking-[0.3em] uppercase"
                >
                  Shop Now
                </motion.button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Side: Product Display (Image or Fail-safe Icon) */}
        <div className="lg:col-span-7 order-1 lg:order-2 flex justify-center lg:justify-end relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${current.id}`}
              initial={{ opacity: 0, scale: 0.8, rotate: -10, x: 100 }}
              animate={{ opacity: 1, scale: 1, rotate: 10, x: 0 }}
              exit={{ opacity: 0, scale: 1.2, rotate: 20, x: -100 }}
              transition={{ type: "spring", stiffness: 40, damping: 15 }}
              className="relative z-20 w-full max-w-112.5 md:max-w-162.5 aspect-square flex items-center justify-center"
            >
              {/* White Background for the Image area as in reference */}
              <div className="absolute inset-0 bg-white/50 blur-3xl rounded-full -z-10" />

              {!imageError[current.id] ? (
                <img
                  src={current.image}
                  alt={current.title}
                  className="w-full h-full object-contain drop-shadow-[0_40px_60px_rgba(0,0,0,0.15)]"
                  
                />
              ) : (
                /* Fail-safe: Professional Icon Display if image fails */
                <div className="w-full h-full flex flex-col items-center justify-center border-4 border-dashed border-gray-100 rounded-full">
                  <span className="text-[10rem] mb-4">{current.icon}</span>
                  <p className="text-xs tracking-[0.5em] font-black text-gray-300 uppercase">
                    {current.title} IMAGE
                  </p>
                </div>
              )}
              
              {/* Decorative Floating Element */}
              <motion.div
                animate={{ y: [0, -20, 0], rotate: [0, 45, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-10 -right-10 w-20 h-20 border-2 border-gray-100 rounded-full flex items-center justify-center opacity-40"
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: current.accentColor }} />
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* 4. LAYER: Minimal Vertical Navigation */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 flex flex-col gap-10 z-30">
        {PRODUCTS.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className="group relative flex flex-col items-center"
          >
            <span className={`text-[10px] tracking-widest font-bold mb-2 transition-all ${index === i ? 'text-black' : 'text-gray-300'}`}>
              0{i + 1}
            </span>
            <motion.div
              animate={{ 
                height: index === i ? 40 : 10,
                backgroundColor: index === i ? '#000' : '#ddd'
              }}
              className="w-0.5 transition-all"
            />
          </button>
        ))}
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;700;900&display=swap');
        body {
          margin: 0;
          font-family: 'Space Grotesk', sans-serif;
          background: #fff;
        }
      `}</style>
    </section>
  );
};

export default HeroSection;
