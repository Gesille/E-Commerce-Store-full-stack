"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";

const Footer = () => {
  return (
    <motion.footer
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="bg-black text-white mt-20"
    >
      <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-2 md:grid-cols-5 gap-10">

        {/* Brand */}
        <div className="col-span-2 md:col-span-1 space-y-4">
          <div className="flex items-center gap-2">
            <Image src="/chefworldlogo.png" alt="logo" width={80} height={40} />
           
          </div>

          <p className="text-gray-400 text-sm">
            Premium kitchen tools & cookware for professionals and home chefs.
          </p>

          <div className="flex gap-4 pt-2 text-gray-300">
            <FaFacebookF className="hover:text-blue-500 transition cursor-pointer" />
            <FaInstagram className="hover:text-pink-500 transition cursor-pointer" />
            <FaTwitter className="hover:text-sky-400 transition cursor-pointer" />
          </div>
        </div>

        {/* Shop */}
        <div>
          <h3 className="font-semibold mb-4">Shop</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            
            <li><Link href="/categories">Categories</Link></li>
            <li><Link href="/new">New Arrivals</Link></li>
            <li><Link href="/sale">Deals</Link></li>
            <li><Link href="/best-sellers">Best Sellers</Link></li>
          </ul>
        </div>

        {/* Company */}
        <div>
          <h3 className="font-semibold mb-4">Company</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/contact">Contact</Link></li>
            <li><Link href="/careers">Careers</Link></li>
            <li><Link href="/blog">Blog</Link></li>
          </ul>
        </div>

        {/* Support */}
        <div>
          <h3 className="font-semibold mb-4">Support</h3>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li><Link href="/help">Help Center</Link></li>
            <li><Link href="/shipping">Shipping Info</Link></li>
            <li><Link href="/returns">Returns</Link></li>
            <li><Link href="/faq">FAQ</Link></li>
          </ul>
        </div>

        {/* Newsletter */}
        <div>
          <h3 className="font-semibold mb-4">Newsletter</h3>
          <p className="text-gray-400 text-sm mb-3">
            Get updates, offers & discounts.
          </p>

          <div className="flex bg-white rounded-full overflow-hidden">
            <input
              type="email"
              placeholder="Your email"
              className="px-4 py-2 text-black w-full outline-none text-sm"
            />
            <button className="bg-gray-800 px-4 text-sm hover:bg-gray-700 transition">
              Join
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col md:flex-row justify-between items-center text-gray-500 text-sm gap-2">
          <p>© {new Date().getFullYear()} Chef World. All rights reserved.</p>

          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-white transition">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white transition">
              Terms
            </Link>
            <Link href="/cookies" className="hover:text-white transition">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;