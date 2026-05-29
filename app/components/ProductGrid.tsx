"use client";

import { useRouter } from "next/navigation";
import { useState, useMemo } from "react";

const PAGE_SIZE = 8;

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeProduct(product: any) {
  return {
    id:
      product?.id ??
      product?.id_pesanan ??
      product?.kode_order ??
      String(product?.name ?? product?.nama ?? product?.nama_produk ?? ""),
    nama:
      product?.name ??
      product?.nama ??
      product?.nama_produk ??
      product?.title ??
      "Produk",
    deskripsi:
      product?.deskripsi ??
      product?.description ??
      "Deskripsi produk belum tersedia.",
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

function IconWA() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
      <path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.99.574 3.842 1.565 5.405L2 22l4.74-1.538A9.953 9.953 0 0 0 12 22c5.523 0 10-4.477 10-10S17.523 2 11.999 2zm.001 18.181a8.169 8.169 0 0 1-4.152-1.131l-.298-.177-3.089 1.002.893-3.026-.194-.31A8.174 8.174 0 0 1 3.819 12c0-4.511 3.671-8.181 8.181-8.181 4.511 0 8.181 3.67 8.181 8.181 0 4.51-3.67 8.181-8.181 8.181z" />
    </svg>
  );
}

function IconTruck() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="3" width="15" height="13" rx="1" />
      <path d="M16 8h4l3 5v3h-7V8z" />
      <circle cx="5.5" cy="18.5" r="2.5" />
      <circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

export default function ProductGrid({ items }: { items: any[] }) {
  const [addedId, setAddedId]       = useState<string | null>(null);
  const [activeKat, setActiveKat]   = useState<string>("Semua");
  const [search, setSearch]         = useState<string>("");
  const [visibleCount, setVisible]  = useState<number>(PAGE_SIZE);
  const router = useRouter();

  // Kumpulkan kategori unik
  const kategoris = useMemo(() => {
    const all = items.map((p) => normalizeProduct(p).kategori).filter(Boolean);
    return ["Semua", ...Array.from(new Set(all))];
  }, [items]);

  // Filter produk
  const filtered = useMemo(() => {
    return items
      .map(normalizeProduct)
      .filter((p) => {
        const matchKat = activeKat === "Semua" || p.kategori === activeKat;
        const matchSearch =
          search.trim() === "" ||
          p.nama.toLowerCase().includes(search.toLowerCase()) ||
          p.deskripsi.toLowerCase().includes(search.toLowerCase());
        return matchKat && matchSearch;
      });
  }, [items, activeKat, search]);

  const visible  = filtered.slice(0, visibleCount);
  const hasMore  = visibleCount < filtered.length;
  const remaining = filtered.length - visibleCount;

  const addToCartStorage = (product: any) => {
    const normalized = normalizeProduct(product);
    const stored = typeof window !== "undefined" ? localStorage.getItem("bygadiza_cart") : null;
    let cart: any[] = [];
    try { cart = stored ? JSON.parse(stored) : []; } catch { cart = []; }
    const existing = cart.find((item) => item.id === normalized.id);
    if (existing) { existing.qty = Number(existing.qty || 1) + 1; }
    else { cart.push({ ...normalized, qty: 1 }); }
    localStorage.setItem("bygadiza_cart", JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    setAddedId(normalized.id);
    setTimeout(() => setAddedId(null), 1400);
  };

  // Reset visible saat filter/search berubah
  const handleKat = (kat: string) => { setActiveKat(kat); setVisible(PAGE_SIZE); };
  const handleSearch = (val: string) => { setSearch(val); setVisible(PAGE_SIZE); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* ── TOOLBAR: Search + Filter ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>

        {/* Search */}
        <div style={{ position: "relative", maxWidth: "360px" }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#fda4af", pointerEvents: "none" }}>
            <IconSearch />
          </span>
          <input
            type="text"
            placeholder="Cari produk…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%",
              paddingLeft: "36px",
              paddingRight: "14px",
              paddingTop: "9px",
              paddingBottom: "9px",
              borderRadius: "999px",
              border: "1px solid #fce7f3",
              background: "#fff",
              fontSize: "13px",
              color: "#1e293b",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filter pill kategori */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {kategoris.map((kat) => {
            const active = kat === activeKat;
            return (
              <button
                key={kat}
                onClick={() => handleKat(kat)}
                style={{
                  padding: "6px 16px",
                  borderRadius: "999px",
                  border: active ? "1px solid #f472b6" : "1px solid #fce7f3",
                  background: active ? "#fdf2f8" : "#fff",
                  color: active ? "#db2777" : "#94a3b8",
                  fontSize: "12px",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  transition: "all .15s",
                }}
              >
                {kat}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── GRID PRODUK ── */}
      {visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#cbd5e1", fontSize: "14px" }}>
          Tidak ada produk yang cocok.
        </div>
      ) : (
        <div style={{ display: "grid", gap: "28px", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          {visible.map((prod) => {
            const { id, nama, deskripsi, foto_url, harga, kategori } = prod;
            return (
              <article
                key={id}
                className="group"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                  borderRadius: "20px",
                  background: "#fff",
                  border: "1px solid #fce7f3",
                  boxShadow: "0 1px 4px rgba(244,114,182,.07)",
                  transition: "transform .25s, box-shadow .25s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 24px rgba(244,114,182,.13)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  (e.currentTarget as HTMLElement).style.boxShadow = "0 1px 4px rgba(244,114,182,.07)";
                }}
              >
                {/* Foto */}
                <div style={{ position: "relative", aspectRatio: "4/3", background: "#fff1f5", overflow: "hidden" }}>
                  {foto_url ? (
                    <img src={foto_url} alt={nama} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "11px", color: "#fbb6ce" }}>
                      Belum ada foto
                    </div>
                  )}
                  {kategori && (
                    <span style={{
                      position: "absolute", top: "10px", left: "10px",
                      background: "rgba(255,255,255,.88)", border: "1px solid #fce7f3",
                      borderRadius: "999px", padding: "3px 10px",
                      fontSize: "9px", fontWeight: 600, letterSpacing: ".07em",
                      textTransform: "uppercase", color: "#e879a0",
                    }}>
                      {kategori}
                    </span>
                  )}
                </div>

                {/* Body */}
                <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "14px 16px 16px", gap: "8px" }}>
                  <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "#1e293b", lineHeight: 1.35,
                    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {nama}
                  </h2>

                  <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", lineHeight: 1.6, flex: 1,
                    display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    {deskripsi}
                  </p>

                  <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#0f172a", letterSpacing: "-.02em" }}>
                    {formatRupiah(harga)}
                  </p>

                  {addedId === id && (
                    <p style={{ margin: 0, fontSize: "11px", textAlign: "center", color: "#16a34a", fontWeight: 500 }}>
                      ✓ Ditambahkan ke keranjang
                    </p>
                  )}

                  {/* Tombol */}
                  <div style={{ display: "flex", gap: "8px", marginTop: "2px" }}>
                    <button
                      type="button"
                      onClick={() => { addToCartStorage(prod); router.push("/cart"); }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        borderRadius: "10px", border: "1px solid #bbf7d0", background: "#f0fdf4",
                        padding: "8px 0", fontSize: "12px", fontWeight: 600, color: "#16a34a", cursor: "pointer" }}
                    >
                      <IconWA /> WA
                    </button>
                    <button
                      type="button"
                      onClick={() => { addToCartStorage(prod); router.push("/checkout"); }}
                      style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "5px",
                        borderRadius: "10px", border: "1px solid #bae6fd", background: "#f0f9ff",
                        padding: "8px 0", fontSize: "12px", fontWeight: 600, color: "#0284c7", cursor: "pointer" }}
                    >
                      <IconTruck /> Checkout
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* ── LOAD MORE ── */}
      {hasMore && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", paddingTop: "8px" }}>
          <button
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
            style={{
              padding: "11px 36px",
              borderRadius: "999px",
              border: "1px solid #fce7f3",
              background: "#fff",
              color: "#db2777",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => ((e.target as HTMLElement).style.background = "#fdf2f8")}
            onMouseLeave={(e) => ((e.target as HTMLElement).style.background = "#fff")}
          >
            Tampilkan lebih banyak
          </button>
          <span style={{ fontSize: "11px", color: "#cbd5e1" }}>
            {visibleCount} dari {filtered.length} produk
          </span>
        </div>
      )}

      {/* Info jumlah hasil filter */}
      {!hasMore && filtered.length > 0 && filtered.length !== items.length && (
        <p style={{ textAlign: "center", fontSize: "11px", color: "#cbd5e1", margin: 0 }}>
          Menampilkan {filtered.length} produk
        </p>
      )}
    </div>
  );
}
