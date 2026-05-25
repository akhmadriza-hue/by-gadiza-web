"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_TABLE } from "@/lib/productTable";
import ProductGrid from "./components/ProductGrid";

export default function Home() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

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

  return (
    <div className="min-h-screen bg-[#f7f2eb] text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-7xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <section className="relative mb-12 overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10">
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-rose-100/40 to-transparent" />
          <div className="relative max-w-3xl">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <span className="inline-flex rounded-full bg-rose-100 px-4 py-2 text-sm font-semibold tracking-wide text-rose-700">By Gadiza</span>
              <a
                href="/admin/products"
                className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition duration-300 hover:border-slate-300 hover:bg-slate-50"
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

        {loading ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-white p-8 text-center text-slate-700 shadow-sm">
            <div>
              <p className="text-lg font-semibold">Memuat produk...</p>
              <p className="mt-2 text-sm text-slate-500">Menarik produk terbaru langsung dari database Supabase.</p>
            </div>
          </div>
        ) : fetchError ? (
          <div className="flex min-h-[40vh] items-center justify-center rounded-3xl bg-rose-50 p-8 text-center text-slate-700 shadow-sm">
            <div>
              <p className="text-lg font-semibold">Terjadi kesalahan saat memuat produk.</p>
              <p className="mt-2 text-sm">{fetchError}</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="flex min-h-[55vh] items-center justify-center rounded-3xl bg-white p-10 text-center shadow-sm">
            <div>
              <p className="text-xl font-semibold text-slate-900">Belum ada produk di etalase By Gadiza</p>
              <p className="mt-3 text-sm text-slate-600">Silakan tambahkan produk baru di database Supabase untuk menampilkan katalog.</p>
            </div>
          </div>
        ) : (
          <ProductGrid items={items} />
        )}
      </main>
    </div>
  );
}
