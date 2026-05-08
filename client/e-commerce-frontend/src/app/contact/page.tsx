/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Mail, Phone, MapPin, Clock } from "lucide-react";
import { useSendContactMessageMutation } from "@/redux/contact/contactApi";
import toast from "react-hot-toast";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });

  const [sendContactMessage, { isLoading }] = useSendContactMessageMutation();
  const phone = "+12685602433";

  const mapCoords = "17.1293756,-61.8368800";
    const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };
const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.email || !form.message) {
      toast.error("Name, email and message are required");
      return;
    }

    try {
      const res = await sendContactMessage(form).unwrap(); // 👈
      toast.success("Message sent! We'll get back to you soon 🎉");
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch (error: any) {
      toast.error(error?.data?.message || "Failed to send message");
    }
  };
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-violet-50 py-12 px-4">
      <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10">
        {/* LEFT SIDE */}
        <div className="space-y-6">
          {/* BRAND */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-8 shadow-xl border">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-violet-600 text-transparent bg-clip-text">
              Chef’s World
            </h1>
            <p className="text-gray-600 mt-2">Fresh food, fast delivery 🍽️</p>
          </div>

          {/* CONTACT INFO */}
          <div className="bg-white/70 backdrop-blur-xl rounded-3xl p-6 shadow-xl border space-y-4">
            <h2 className="text-xl font-bold">Contact Info</h2>

            <div className="flex items-center gap-3">
              <Phone className="text-pink-500" size={18} />
              {phone}
            </div>

            <div className="flex items-center gap-3">
              <Mail className="text-violet-500" size={18} />
              support@chefsworld.com
            </div>

            <div className="flex items-center gap-3">
              <MapPin className="text-pink-500" size={18} />
              Friar’s Hill Road, Saint John’s
            </div>

            <div className="flex items-center gap-3">
              <Clock className="text-violet-500" size={18} />
              Mon - Sun: 9AM - 10PM
            </div>
          </div>

          {/* MAP */}
          <div className="rounded-3xl overflow-hidden shadow-2xl border">
            <iframe
              className="w-full h-72 rounded-3xl"
              loading="lazy"
              src="https://www.google.com/maps?q=17.129257,-61.836735&z=18&output=embed"
            />
          </div>

          {/* ACTION BUTTONS */}
          <div className="grid grid-cols-2 gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapCoords}`}
              target="_blank"
              className="bg-black text-white text-center py-3 rounded-xl hover:scale-105 transition"
            >
              Open Map
            </a>

            <a
              href="https://www.bing.com/maps/directions?ty=0&v=2&sV=1&rtp=~pos.17.129257202148438_-61.836734771728516__Chef%27s%2520World_&mode=d"
              target="_blank"
              className="bg-blue-600 text-white px-4 py-3 rounded-xl text-center block"
            >
              Get Directions
            </a>

            <a
              href={`https://wa.me/${phone.replace("+", "")}`}
              target="_blank"
              className="bg-green-500 text-white text-center py-3 rounded-xl hover:scale-105 transition"
            >
              WhatsApp
            </a>

            <a
              href={`tel:${phone}`}
              className="bg-pink-500 text-white text-center py-3 rounded-xl hover:scale-105 transition"
            >
              Call Now
            </a>
          </div>
        </div>

        {/* RIGHT SIDE - FORM */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border p-8">
          <h2 className="text-2xl font-bold mb-6">Send Message</h2>

          <form onSubmit={handleSubmit} className="space-y-4"> {/* 👈 add onSubmit */}
    <input
      name="name"                
      value={form.name}          
      onChange={handleChange}   
      className="w-full p-4 border rounded-xl"
      placeholder="Name"
    />
    <input
      name="email"
      value={form.email}
      onChange={handleChange}
      className="w-full p-4 border rounded-xl"
      placeholder="Email"
      type="email"
    />
    <input
      name="phone"
      value={form.phone}
      onChange={handleChange}
      className="w-full p-4 border rounded-xl"
      placeholder="Phone"
    />
    <textarea
      name="message"
      value={form.message}
      onChange={handleChange}
      className="w-full p-4 border rounded-xl"
      rows={6}
      placeholder="Message"
    />

    <button
      type="submit"
      disabled={isLoading}
      className="w-full py-4 rounded-xl font-bold text-white
        bg-gradient-to-r from-pink-500 to-violet-600
        hover:scale-105 transition disabled:opacity-60 disabled:scale-100"
    >
      {isLoading ? "Sending..." : "Send Message"}
    </button>
  </form>
        </div>
      </div>
    </div>
  );
}
