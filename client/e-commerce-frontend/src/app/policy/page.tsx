"use client";

import { useState } from "react";

const policies = [
  {
    id: "return",
    label: "Return Policy",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
      </svg>
    ),
    sections: [
      {
        title: null,
        content:
          "We want you to be completely satisfied with your purchase. If for any reason you are not satisfied, we will gladly accept returns within seven (7) days of purchase date, provided that the following conditions are met:",
      },
      {
        title: "Eligibility",
        items: [
          "Items must be unused, in original packaging and in the same condition received.",
          "Proof of purchase is required for all items.",
          "Certain items may be non-returnable or subject to specific conditions. Please check with the store associate for more details.",
        ],
      },
      {
        title: "Refunds",
        items: [
          "Refunds will be issued in the original form of payment.",
          "If the original form of payment is unavailable, store credit may be applied.",
        ],
      },
      {
        title: null,
        content: "Thank you, Management",
        closing: true,
      },
    ],
  },
  {
    id: "shipping",
    label: "Shipping Policy",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    ),
    sections: [
      {
        title: null,
        content: "We aim to process and ship all orders as quickly as possible. Please review our shipping guidelines below.",
      },
      {
        title: "Processing Time",
        items: [
          "Orders are processed within 1–2 business days after payment confirmation.",
          "Orders placed on weekends or public holidays will be processed on the next business day.",
        ],
      },
      {
        title: "Delivery",
        items: [
          "Local delivery within Antigua is available for qualifying orders.",
          "Delivery times may vary depending on location and item availability.",
          "You will be notified once your order has been dispatched.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    label: "Privacy Policy",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    sections: [
      {
        title: null,
        content: "Your privacy is important to us. This policy explains how Chef's World collects, uses, and protects your personal information.",
      },
      {
        title: "Information We Collect",
        items: [
          "Name, contact details, and billing information when you make a purchase.",
          "Transaction history for record-keeping and customer support purposes.",
          "We do not sell or share your personal information with third parties.",
        ],
      },
      {
        title: "Data Security",
        items: [
          "All personal data is stored securely and accessed only by authorised staff.",
          "You may request to view or delete your data at any time by contacting us.",
        ],
      },
    ],
  },
  {
    id: "terms",
    label: "Terms & Conditions",
    icon: (
      <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    sections: [
      {
        title: null,
        content: "By shopping at Chef's World, you agree to the following terms and conditions. Please read them carefully before making a purchase.",
      },
      {
        title: "General",
        items: [
          "All prices are listed in Eastern Caribbean Dollars (XCD) and include applicable taxes.",
          "We reserve the right to update pricing and product availability without prior notice.",
          "Chef's World is not liable for any indirect or consequential loss arising from the use of our products.",
        ],
      },
      {
        title: "Purchases",
        items: [
          "Payment must be completed at the time of purchase.",
          "We accept cash, credit/debit cards, and approved store credit.",
          "Receipts are issued for all transactions and must be retained for any returns or claims.",
        ],
      },
    ],
  },
];

export default function PoliciesPage() {
  const [active, setActive] = useState("return");
  const current = policies.find((p) => p.id === active)!;

  return (
    <div style={{ minHeight: "100vh", background: "#f7f6f3", fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <header style={{
        background: "#fff",
        borderBottom: "1px solid #e8e5e0",
        padding: "0 32px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        height: "64px",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "36px", height: "36px", background: "#4a3728",
            borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center"
          }}>
            <span style={{ color: "#fff", fontWeight: 700, fontSize: "14px" }}>CW</span>
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "#1a1714", letterSpacing: "0.02em" }}>CHEF&apos;S WORLD</div>
            <div style={{ fontSize: "10px", color: "#8a7e74", letterSpacing: "0.05em", textTransform: "uppercase" }}>Restaurant, Bar & Kitchen Supplies</div>
          </div>
        </div>
        <div style={{ fontSize: "13px", color: "#8a7e74" }}>Store Policies</div>
      </header>

      <div style={{ maxWidth: "1080px", margin: "0 auto", padding: "48px 24px", display: "flex", gap: "32px", alignItems: "flex-start" }}>

        {/* Sidebar */}
        <aside style={{ width: "220px", flexShrink: 0, position: "sticky", top: "88px" }}>
          <p style={{ fontSize: "11px", fontWeight: 600, color: "#8a7e74", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
            Policies
          </p>
          <nav style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            {policies.map((p) => (
              <button
                key={p.id}
                onClick={() => setActive(p.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  fontWeight: active === p.id ? 600 : 400,
                  background: active === p.id ? "#4a3728" : "transparent",
                  color: active === p.id ? "#fff" : "#4a3728",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ opacity: active === p.id ? 1 : 0.6 }}>{p.icon}</span>
                {p.label}
              </button>
            ))}
          </nav>

          {/* Contact card */}
          <div style={{
            marginTop: "32px",
            background: "#fff",
            border: "1px solid #e8e5e0",
            borderRadius: "12px",
            padding: "16px",
          }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "#1a1714", marginBottom: "6px" }}>Need help?</p>
            <p style={{ fontSize: "12px", color: "#8a7e74", lineHeight: 1.6 }}>
              Epicurean Drive, Saint John<br />
              📞 560-2433<br />
              ABST # 0161466
            </p>
          </div>
        </aside>

        {/* Main Content */}
        <main style={{ flex: 1, minWidth: 0 }}>
          {/* Page header */}
          <div style={{
            background: "#fff",
            border: "1px solid #e8e5e0",
            borderRadius: "14px",
            padding: "32px 36px",
            marginBottom: "20px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
              <div style={{
                width: "40px", height: "40px", background: "#f0ebe4",
                borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center",
                color: "#4a3728",
              }}>
                {current.icon}
              </div>
              <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1a1714", margin: 0 }}>
                {current.label}
              </h1>
            </div>
            <p style={{ fontSize: "13px", color: "#8a7e74", margin: 0 }}>
              Last updated: June 2025 · Chef&apos;s World, Antigua and Barbuda
            </p>
          </div>

          {/* Policy content */}
          <div style={{
            background: "#fff",
            border: "1px solid #e8e5e0",
            borderRadius: "14px",
            padding: "36px",
          }}>
            {current.sections.map((section, i) => (
              <div key={i} style={{ marginBottom: i < current.sections.length - 1 ? "28px" : 0 }}>
                {section.title && (
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ width: "3px", height: "18px", background: "#4a3728", borderRadius: "2px" }} />
                    <h2 style={{ fontSize: "15px", fontWeight: 700, color: "#1a1714", margin: 0, letterSpacing: "0.01em" }}>
                      {section.title}
                    </h2>
                  </div>
                )}
                {section.content && !section.closing && (
                  <p style={{
                    fontSize: "15px", color: "#3d3530", lineHeight: 1.75,
                    background: "#f7f6f3", borderRadius: "8px", padding: "16px 18px", margin: 0,
                  }}>
                    {section.content}
                  </p>
                )}
                {section.closing && (
                  <p style={{ fontSize: "14px", color: "#8a7e74", fontStyle: "italic", margin: 0 }}>
                    {section.content}
                  </p>
                )}
                {section.items && (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
                    {section.items.map((item, j) => (
                      <li key={j} style={{
                        display: "flex", gap: "12px", alignItems: "flex-start",
                        fontSize: "15px", color: "#3d3530", lineHeight: 1.65,
                      }}>
                        <span style={{
                          marginTop: "6px", width: "6px", height: "6px", background: "#c4a882",
                          borderRadius: "50%", flexShrink: 0,
                        }} />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
                {i < current.sections.length - 1 && (
                  <div style={{ height: "1px", background: "#f0ebe4", marginTop: "28px" }} />
                )}
              </div>
            ))}
          </div>

          {/* Footer note */}
          <p style={{ fontSize: "12px", color: "#b0a89e", textAlign: "center", marginTop: "24px" }}>
            Chef&apos;s World reserves the right to update these policies at any time. For questions, visit us in store or call 560-2433.
          </p>
        </main>
      </div>
    </div>
  );
}