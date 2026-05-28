"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function Navigation() {
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    // Update cart count on mount
    updateCartCount();

    // Listen to storage changes
    const handleStorageChange = () => {
      updateCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    // Custom event listener untuk update cart dari komponen lain
    window.addEventListener("cart-updated", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cart-updated", handleStorageChange);
    };
  }, []);

  function updateCartCount() {
    try {
      const raw = localStorage.getItem("bygadiza_cart");
      if (raw) {
        const cart = JSON.parse(raw);
        const count = Array.isArray(cart) ? cart.reduce((sum, item) => sum + (Number(item.qty) || 1), 0) : 0;
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch (e) {
      setCartCount(0);
    }
  }

  return (
    <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="text-xl font-bold text-rose-600 hover:text-rose-700 transition">
            🌸 By Gadiza
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-slate-700 hover:text-slate-900 font-medium transition text-sm sm:text-base"
          >
            Beranda
          </Link>

          <Link
            href="/cart"
            className="relative text-slate-700 hover:text-slate-900 font-medium transition text-sm sm:text-base"
          >
            🛒 Keranjang
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-3 bg-rose-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </Link>

          <Link
            href="/checkout"
            className="bg-rose-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-rose-600 transition text-sm sm:text-base flex items-center gap-2"
          >
            💳 Checkout
            {cartCount > 0 && <span className="bg-rose-600 text-white text-xs px-2 py-1 rounded font-bold">{cartCount}</span>}
          </Link>
        </div>
      </div>
    </nav>
  );
}
