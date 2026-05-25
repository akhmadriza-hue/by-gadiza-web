"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

function normalizeProduct(product: any) {
  return {
    id: product?.id ?? product?.id_pesanan ?? product?.kode_order ?? String(product?.name ?? product?.nama ?? product?.nama_produk ?? ""),
    nama: product?.name ?? product?.nama ?? product?.nama_produk ?? product?.title ?? "Produk",
    deskripsi: product?.deskripsi ?? product?.description ?? "Deskripsi singkat produk belum tersedia.",
    foto_url:
      typeof product?.foto_url === "string"
        ? product.foto_url
        : typeof product?.image_url === "string"
        ? product.image_url
        : product?.fotoUrl ?? "",
    harga: Number(product?.harga ?? product?.price ?? 0),
    kategori: product?.kategori ?? "",
  };
}

export default function ProductGrid({ items }: { items: any[] }) {
  const [cartCount, setCartCount] = useState(0);
  const [addedId, setAddedId] = useState<string | null>(null);
  const router = useRouter();

  const addToCart = (product: any) => {
    const normalized = normalizeProduct(product);
    const stored = typeof window !== "undefined" ? localStorage.getItem("bygadiza_cart") : null;
    let cart: any[] = [];
    try {
      cart = stored ? JSON.parse(stored) : [];
    } catch (err) {
      console.warn("Gagal parse cart localStorage", err);
      cart = [];
    }

    const existing = cart.find((item) => item.id === normalized.id);
    if (existing) {
      existing.qty = Number(existing.qty || 1) + 1;
    } else {
      cart.push({ ...normalized, qty: 1 });
    }

    localStorage.setItem("bygadiza_cart", JSON.stringify(cart));
    setAddedId(normalized.id);
    setCartCount(cart.length);

    setTimeout(() => setAddedId(null), 1400);
  };

  const buyNow = (product: any) => {
    addToCart(product);
    router.push("/cart");
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {items.map((product) => {
        const { id, nama, deskripsi, foto_url, harga, kategori } = normalizeProduct(product);
        const formattedPrice = formatRupiah(harga);
        return (
          <article key={id} className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 ease-out hover:-translate-y-2 hover:shadow-xl">
            <div className="overflow-hidden rounded-t-2xl bg-slate-100 transition duration-300 group-hover:scale-[1.01]">
              <div className="relative aspect-[4/3] bg-slate-100">
                {foto_url ? (
                  <img src={foto_url} alt={nama} className="h-full w-full object-cover object-center transition duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-slate-200 text-center text-sm text-slate-600">
                    Foto belum tersedia
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-rose-600">{kategori || "Kerajinan Tangan"}</p>
                <h2 className="mt-3 text-2xl font-semibold leading-tight text-slate-950">{nama}</h2>
              </div>
              <p className="text-sm leading-6 text-slate-600" style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {deskripsi}
              </p>
              <div className="flex flex-col gap-4 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xl font-semibold text-slate-950">{formattedPrice}</p>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">Stok terbatas</span>
              </div>
              <div className="grid gap-3 pt-4 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => addToCart(product)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition duration-300 hover:bg-rose-700"
                >
                  <span aria-hidden="true">🛒</span>
                  Masukkan Keranjang
                </button>
                <button
                  type="button"
                  onClick={() => buyNow(product)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition duration-300 hover:border-slate-300 hover:bg-slate-50"
                >
                  <span aria-hidden="true">⚡</span>
                  Beli Sekarang
                </button>
              </div>
              {addedId === id ? (
                <div className="rounded-full bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700">
                  Produk ditambahkan ke keranjang!
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
