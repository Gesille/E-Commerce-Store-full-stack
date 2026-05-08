"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { categories } from "../../lib/bar";

export default function BarPage() {
  const cat = categories.restaurant;
  const containerRef = useRef(null);

  return (
    <div ref={containerRef} className="bg-[#fcfcfc] text-zinc-900 min-h-screen font-sans selection:bg-blue-100">
      
      {/* --- 1. IMMERSIVE HERO SECTION --- */}
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden">
        <motion.div 
          style={{ y: useTransform(useScroll().scrollY, [0, 500], [0, 200]) }}
          className="absolute inset-0 z-0"
        >
          <img src={cat.heroImage} className="w-full h-full object-cover brightness-[0.85]" alt="Hero" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-[#fcfcfc]" />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center px-4"
        >
          <div className="inline-block px-4 py-1.5 mb-6 rounded-full border border-white/30 bg-white/10 backdrop-blur-md text-[10px] font-mono tracking-[0.4em] text-white uppercase">
            {cat.code} 
          </div>
          <h1 className="text-7xl md:text-[10vw] font-bold tracking-tighter leading-none text-white uppercase italic">
            {cat.title.split(" ")[0]} 
            <span className="block font-light text-green-300 not-italic">
              {cat.title.split(" ")[1]}
            </span>
          </h1>
        </motion.div>
        
        {/* Floating Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-zinc-400">Scroll</span>
          <div className="w-[1px] h-12 bg-gradient-to-b from-blue-400 to-transparent" />
        </div>
      </section>

      {/* --- 2. THE PRODUCT SHOWCASE --- */}
      <section className="max-w-[1400px] mx-auto px-6 py-32 space-y-32">
        {cat.sections.map((item, i) => (
          <div key={i} className={`flex flex-col ${i % 2 !== 0 ? 'md:flex-row-reverse' : 'md:flex-row'} gap-12 items-center`}>
            
            {/* LARGE IMAGE BLOCK WITH CAPTION */}
            <div className="w-full md:w-7/12 relative group">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="aspect-[16/10] overflow-hidden rounded-3xl shadow-2xl bg-zinc-200"
              >
                <img 
                  src={item.image} 
                  className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-1000" 
                  alt={item.name} 
                />
              </motion.div>
              {/* Floating ID Tag */}
              <div className={`absolute top-8 ${i % 2 !== 0 ? '-left-6' : '-right-6'} hidden lg:block`}>
                <div className="bg-white p-6 shadow-xl rounded-2xl border border-zinc-100">
                  <p className="text-3xl font-black text-blue-600/20 font-mono italic">0{i + 1}</p>
                </div>
              </div>
            </div>

            {/* CONTENT BLOCK */}
            <div className="w-full md:w-5/12 space-y-8">
              <div className="space-y-4">
                <h3 className="text-5xl font-bold tracking-tight uppercase leading-none">
                  {item.name}
                </h3>
                <p className="text-lg text-zinc-500 font-light italic leading-relaxed">
                  &quot;{item.tagline}&quot;
                </p>
              </div>

              {/* Technical Spec Chips */}
              <div className="flex flex-wrap gap-2">
                {item.specs.map((s, idx) => (
                  <span key={idx} className="px-3 py-1 bg-white border border-zinc-200 rounded-md text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                    {s}
                  </span>
                ))}
              </div>

              <div className="h-[1px] w-20 bg-blue-500" />

              <div className="space-y-6">
                <p className="text-sm text-zinc-600 leading-relaxed max-w-sm">
                  Precision engineered for high-volume mixology environments where speed and temperature control are non-negotiable.
                </p>
                <button className="group flex items-center gap-4 text-xs font-black uppercase tracking-[0.2em] hover:text-blue-600 transition-colors">
                  View Technical Drawing
                  <span className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center group-hover:bg-blue-600 transition-all">
                    →
                  </span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

    
    </div>
  );
}