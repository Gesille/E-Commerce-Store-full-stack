"use client";

import { motion } from "framer-motion";
import { kitchens } from "../../lib/kitchens";

export default function KitchenPage() {
  const cat = kitchens.kitchen;

  return (
    <div className="bg-[#fcfcfc] text-zinc-900 pb-40">
      
      {/* --- 1. HERO SECTION --- */}
      <section className="relative h-[70vh] flex items-center justify-center overflow-hidden">
        <motion.img 
          initial={{ scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={{ duration: 2 }}
          src={cat.heroImage} 
          className="absolute inset-0 w-full h-full object-cover grayscale-[20%]"
        />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative z-10 text-center text-white space-y-4">
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="uppercase tracking-[0.5em] text-xs font-semibold">
            {cat.subtitle}
          </motion.span>
          <h1 className="text-7xl md:text-9xl font-light tracking-tighter italic serif">{cat.title}</h1>
        </div>
      </section>

      {/* --- 2. DETAILED PRODUCT SHOWCASE --- */}
      <section className="max-w-7xl mx-auto px-6 py-32 space-y-48">
        {cat.showcase.map((item, i) => (
          <div key={i} className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-20 items-start`}>
            
            {/* Visual Column */}
            <motion.div 
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex-1 w-full"
            >
              <div className="relative aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl">
                <img src={item.image} className="w-full h-full object-cover" alt={item.title} />
              </div>
            </motion.div>

            {/* Information Column */}
            <div className="flex-1 space-y-10 py-6">
              <div className="space-y-4">
                <span className="text-orange-600 font-mono text-xs uppercase tracking-widest">{item.category}</span>
                <h2 className="text-5xl font-semibold tracking-tight">{item.title}</h2>
                <p className="text-xl text-zinc-500 font-light italic">{item.tagline}</p>
              </div>

              {/* SPEC GRID - THE DETAILS */}
              <div className="grid grid-cols-2 gap-y-8 gap-x-4 border-y border-zinc-200 py-10">
                {Object.entries(item.details).map(([key, value], idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-[10px] uppercase text-zinc-400 font-bold tracking-widest">{key}</p>
                    <p className="text-sm font-medium text-zinc-800">{value}</p>
                  </div>
                ))}
              </div>

              {/* IN THE BOX SECTION */}
              <div className="space-y-4">
                <h4 className="text-xs uppercase font-bold tracking-widest">In the Box</h4>
                <ul className="flex flex-wrap gap-3">
                  {item.inTheBox.map((boxItem, idx) => (
                    <li key={idx} className="bg-zinc-100 px-4 py-2 rounded-full text-xs text-zinc-600 border border-zinc-200">
                      {boxItem}
                    </li>
                  ))}
                </ul>
              </div>

              <button className="w-full md:w-auto px-12 py-5 bg-zinc-900 text-white rounded-full font-bold text-xs uppercase tracking-[0.2em] hover:bg-zinc-700 transition-all shadow-lg active:scale-95">
                Add to Collection
              </button>
            </div>
          </div>
        ))}
      </section>

      {/* --- 3. THE CRAFTSMANSHIP BANNER --- */}
      <section className="px-6">
        <div className="max-w-7xl mx-auto bg-zinc-50 rounded-[3rem] p-12 md:p-24 flex flex-col md:flex-row items-center gap-16">
          <div className="flex-1 space-y-6">
            <h3 className="text-4xl font-semibold tracking-tight">Built for a lifetime of service.</h3>
            <p className="text-zinc-500 leading-relaxed">
              Every item in our kitchen collection undergoes a rigorous stress-test in active commercial environments. We don&rsquo;t just measure aesthetics; we measure <strong>thermal stability, molecular fatigue, and ergonomic strain.</strong>
            </p>
            <div className="flex gap-10 pt-4">
              <div>
                <p className="text-2xl font-bold">LIFETIME</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Warranty</p>
              </div>
              <div>
                <p className="text-2xl font-bold">24/7</p>
                <p className="text-[10px] text-zinc-400 uppercase tracking-widest">Chef Support</p>
              </div>
            </div>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 w-full">
            <div className="h-40 rounded-2xl bg-zinc-200 overflow-hidden">
                <img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover" />
            </div>
            <div className="h-40 rounded-2xl bg-zinc-200 overflow-hidden mt-8">
                <img src="https://images.unsplash.com/photo-1584263347416-85a696b4eda7?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}