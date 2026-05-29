"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_TABLE } from "@/lib/productTable";
import ProductGrid from "./components/ProductGrid";

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  
  // State tambahan untuk memantau jumlah item di keranjang belanja pembeli
  const [cartCount, setCartCount] = useState(0);

  // Load produk dari Supabase
  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setLoading(true);
      setFetchError(null);

      try {
        const { data, error } = await supabase.from(PRODUCT_TABLE).select("*").order("id", { ascending: true });
        if (error) {
          console.error("Supabase error fetching produk:", error);
          if (isMounted) {
            setFetchError(error.message || JSON.stringify(error));
            setItems([]);
          }
        } else {
          if (isMounted) {
            setItems(Array.isArray(data) ? data : []);
          }
        }
      } catch (err) {
        console.error("Unexpected error fetching produk:", err);
        if (isMounted) {
          setFetchError(err instanceof Error ? err.message : String(err));
          setItems([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Ambil data jumlah isi keranjang dari localStorage untuk ditampilkan di tombol melayang
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const raw = localStorage.getItem("bygadiza_cart");
        if (raw) {
          const parsedCart = JSON.parse(raw);
          const totalQty = parsedCart.reduce((acc: number, item: any) => acc + (Number(item.qty) || 1), 0);
          setCartCount(totalQty);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        console.warn("Gagal membaca hitungan keranjang", e);
      }
    };

    // Jalankan sekali saat mount
    updateCartCount();

    // Dengarkan event kustom jika ada penambahan produk dari komponen ProductGrid/Card tanpa reload
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("cart-updated", updateCartCount);

    return () => {
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("cart-updated", updateCartCount);
    };
  }, []);

  return (
    <div className="relative min-h-screen bg-[#f7f2eb] text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        
        {/* Banner Jumbotron */}
        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-rose-100/40 to-transparent" />
          <div className="relative max-w-3xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold tracking-wide text-rose-700">By Gadiza</span>
              <a
                href="/admin/products"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition duration-300 hover:border-slate-300 hover:bg-slate-50 shadow-sm"
              >
                Admin Produk
              </a>
            </div>
            <h1 className="mt-8 text-5xl font-semibold leading-tight tracking-tight text-slate-950 sm:text-6xl">Katalog Gelang Kerajinan Tangan</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 sm:text-xl">
              Jelajahi koleksi gelang tangan premium dengan warna lembut, detail tradisional, dan nuansa natural untuk tampilan penuh kehangatan.
            </p>
          </div>
        </section>

        {/* Kondisi Status Tampilan (Loading / Error / Empty / Grid) */}
        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-white p-8 text-center text-slate-700 shadow-sm border border-slate-100">
            <div>
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-rose-500 border-t-transparent"></div>
              <p className="text-lg font-semibold">Memuat produk...</p>
              <p className="mt-2 text-sm text-slate-500">Menarik produk terbaru langsung dari database Supabase.</p>
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-rose-50 p-8 text-center text-slate-700 shadow-sm border border-rose-100">
            <div>
              <p className="text-lg font-semibold text-rose-700">Terjadi kesalahan saat memuat produk.</p>
              <p className="mt-2 text-sm text-slate-600 bg-white/80 p-3 rounded-xl border border-rose-200/50">{fetchError}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[55vh] items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm border border-slate-100">
            <div>
              <p className="text-xl font-semibold text-slate-900">Belum ada produk di etalase By Gadiza</p>
              <p className="mt-3 text-sm text-slate-600">Silakan tambahkan produk baru di database Supabase untuk menampilkan katalog.</p>
            </div>
          </div>
        ) : (
          <ProductGrid items={items} />
        )}
      </main>

      {/* 🛒 FLOATING CART BUTTON (SINERGI METODE CHECKOUT) */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
          <a
            href="/cart" // Mengarah ke halaman CartPage yang kita optimasi tadi
            className="flex items-center gap-3 rounded-full bg-slate-900 px-6 py-4 text-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] hover:bg-slate-800 transition-all duration-300 group hover:scale-105"
          >
            <div className="relative">
              <span className="text-2xl">🛒</span>
              <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white ring-2 ring-slate-900">
                {cartCount}
              </span>
            </div>
            <div className="flex flex-col items-start leading-none">
              <span className="text-xs text-slate-400 font-medium">Lihat Keranjang</span>
              <span className="text-sm font-bold mt-0.5 group-hover:text-rose-300 transition">Pilih Jalur Bayar →</span>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}