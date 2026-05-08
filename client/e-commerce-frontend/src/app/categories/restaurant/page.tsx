"use client";

import { motion } from "framer-motion";
import { categories } from "../../lib/restaurants";

export default function RestaurantPage() {
  const cat = categories.restaurant;

  return (
    <div className="bg-white text-black min-h-screen font-sans selection:bg-black selection:text-white">
      
      {/* 1. CLEAN SHOP HEADER */}
      <header className="h-[40vh] flex flex-col justify-center px-6 md:px-20 border-b border-black">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <p className="text-[10px] font-black tracking-[0.5em] mb-4 uppercase text-zinc-400">
            {cat.subtitle}
          </p>
          <h1 className="text-7xl md:text-[8vw] font-bold tracking-tighter leading-none uppercase italic serif">
            {cat.title}
          </h1>
        </motion.div>
      </header>

      {/* 2. EQUIPMENT SHOWCASE */}
      <section>
        {cat.features.map((item, i) => (
          <div key={i} className="flex flex-col md:flex-row border-b border-black min-h-screen">
            
            {/* LEFT: Sticky Text Panel */}
            <div className="md:w-1/3 p-8 md:p-20 md:sticky md:top-0 h-fit md:h-screen flex flex-col justify-between py-24 bg-white">
              <div className="space-y-6">
                <span className="text-[10px] font-mono tracking-widest text-zinc-300">ITEM_{item.id}</span>
                <h2 className="text-5xl md:text-6xl font-bold tracking-tighter uppercase leading-none">
                  {item.title}
                </h2>
                <div className="h-1 w-16 bg-black" />
              </div>
              
              <div className="space-y-4">
                <p className="text-xl text-zinc-500 font-light leading-relaxed max-w-xs italic">
                  {item.detail}
                </p>
              </div>
            </div>

            {/* RIGHT: High-Res Image & Detail Boxes */}
            <div className="md:w-2/3 border-l border-black bg-[#fcfcfc] p-6 md:p-16 flex flex-col justify-center gap-10">
              <div className="w-full aspect-[16/10] overflow-hidden rounded-sm shadow-2xl">
                <img 
                  src={item.image} 
                  className="w-full h-full object-cover transition-transform duration-[2s] hover:scale-105" 
                  alt={item.title} 
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {item.stats.map((stat, sIdx) => (
                  <div key={sIdx} className="p-8 bg-white border border-zinc-200 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-zinc-300">TECH_REF</span>
                    <p className="text-sm font-bold uppercase tracking-widest mt-4">
                      {stat}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        ))}
      </section>

      {/* 3. MINIMAL TECHNICAL FOOTER */}
      <footer className="py-20 px-6 md:px-20 bg-white grid grid-cols-1 md:grid-cols-4 gap-12 border-b-[20px] border-black">
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-3xl font-bold tracking-tighter uppercase">Order & Inquiry</h3>
          <p className="text-zinc-500 text-sm max-w-sm">
            All equipment is made to order with a standard 8-week lead time. Technical drawings and CAD blocks available upon request.
          </p>
        </div>
        
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Specifications</p>
          <ul className="text-xs space-y-2 font-medium">
            <li>UL / CE Listed</li>
            <li>Energy Star Certified</li>
            <li>2-Year Full Warranty</li>
          </ul>
        </div>

        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Inventory</p>
          <button className="w-full py-4 bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:invert">
            Download Catalogue
          </button>
        </div>
      </footer>

    </div>
  );
}