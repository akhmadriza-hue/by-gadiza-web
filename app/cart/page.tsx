"use client";

import { useEffect, useState, useRef } from "react";

// Format numbers into Indonesian Rupiah currency strings.
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
}

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [isHydrated, setIsHydrated] = useState(false); // Mencegah flash/mismatch UI
  const [namaPembeli, setNamaPembeli] = useState("");
  const [nomorWhatsApp, setNomorWhatsApp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formError, setFormError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ kodeOrder: string; adminWhatsApp: string; message: string } | null>(null);

  // Ref untuk mengarahkan pandangan pengguna ke Ringkasan Checkout
  const summaryRef = useRef<HTMLDivElement>(null);

  // Load cart data once on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bygadiza_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch (e) {
      console.warn("Gagal baca cart dari localStorage", e);
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Efek untuk otomatis scroll ke bawah saat ringkasan terbuka
  useEffect(() => {
    if (showSummary && summaryRef.current) {
      summaryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showSummary]);

  const saveCart = (nextCart: any[]) => {
  localStorage.setItem("bygadiza_cart", JSON.stringify(nextCart));
  setCart(nextCart);
  window.dispatchEvent(new Event("cart-updated")); // ← ini yang kurang
};

  const updateItemQty = (id: string, qty: number) => {
    const nextCart = cart
      .map((item) => {
        if (item.id !== id) return item;
        return { ...item, qty: Math.max(1, qty) };
      })
      .filter((item) => item.qty > 0);
    saveCart(nextCart);
  };

  const removeItem = (id: string) => {
    const nextCart = cart.filter((item) => item.id !== id);
    saveCart(nextCart);
  };

  const total = cart.reduce((s, i) => s + (typeSafeHarga(i) * Number(i.qty || 1)), 0);

  // Helper aman untuk mengekstrak harga & nama properti cadangan
  function typeSafeHarga(item: any): number {
    return Number(item.harga) || Number(item.price) || 0;
  }

  function typeSafeNama(item: any): string {
    return item.nama || item.name || "Produk";
  }

  // Validate the checkout form before showing the summary.
  function validateCheckout() {
    if (!cart || cart.length === 0) return "Keranjang kosong.";
    if (!namaPembeli.trim()) return "Nama pembeli wajib diisi.";
    if (!nomorWhatsApp.trim()) return "Nomor WhatsApp wajib diisi.";
    if (!/^((\+62|62|0)\d{8,15})$/.test(nomorWhatsApp.trim())) return "Nomor WhatsApp tidak valid (Gunakan format 08xx atau 62xx).";
    if (!alamat.trim()) return "Alamat pengiriman wajib diisi.";
    return "";
  }

  // Show the checkout summary only after form validation succeeds.
  function handleReview() {
    const validationMessage = validateCheckout();
    if (validationMessage) {
      setFormError(validationMessage);
      setShowSummary(false);
      return;
    }

    setFormError("");
    setShowSummary(true);
  }

  function buildWhatsAppMessage(kodeOrder: string) {
    const lines = [
      `Kode Order: ${kodeOrder}`,
      `Nama: ${namaPembeli.trim()}`,
      `Nomor WhatsApp: ${nomorWhatsApp.trim()}`,
      `Alamat: ${alamat.trim()}`,
      "",
      "Daftar Produk:",
      ...cart.map((item) => {
        const namaProduk = typeSafeNama(item);
        const kuantitas = Number(item.qty || 1);
        const hargaSatuan = typeSafeHarga(item);
        const subtotal = kuantitas * hargaSatuan;
        return `- ${namaProduk} x${kuantitas} @ ${formatRupiah(hargaSatuan)} = ${formatRupiah(subtotal)}`;
      }),
      "",
      `Total: ${formatRupiah(total)}`,
    ];
    return lines.join("\n");
  }

  // Send the confirmed order to the server and clear the cart on success.
  async function handleCheckout() {
    setFormError("");
    const detailProduk = cart.map((p) => ({
      id: p.id,
      nama: typeSafeNama(p),
      qty: Number(p.qty) || 1,
      harga: typeSafeHarga(p),
      foto_url: p.foto_url || p.fotoUrl || p.image || "",
    }));

    setIsProcessing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nama_pembeli: namaPembeli.trim(), 
          nomor_whatsapp: nomorWhatsApp.trim(), 
          alamat: alamat.trim(), 
          total_harga: total, 
          detail_produk: detailProduk 
        }),
      });
      
      const data = await res.json();
      if (!res.ok) {
        console.error("API /api/checkout error:", data);
        const message = data?.error || data?.details || "Gagal membuat pesanan";
        throw new Error(message);
      }

      const kodeOrder = data?.kode_order ?? data?.kodeOrder ?? "#GDZ-UNKNOWN";
      const adminNumber = "6289684327334"; 
      const message = buildWhatsAppMessage(kodeOrder);

      // Clear cart
      localStorage.removeItem("bygadiza_cart");
setCart([]);
window.dispatchEvent(new Event("cart-updated")); // ← tambahkan di sini juga
      setShowSummary(false);

      // Show success receipt
      setSuccessData({
        kodeOrder,
        adminWhatsApp: adminNumber,
        message,
      });
      setCheckoutSuccess(true);
    } catch (err: any) {
      console.error("Gagal membuat pesanan:", err);
      alert(err?.message || "Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Tunggu sinkronisasi dengan localStorage selesai agar tidak salah render UI
  if (!isHydrated) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12 text-center">
        <p className="text-slate-500 animate-pulse">Memuat keranjang...</p>
      </main>
    );
  }

  // Success receipt view
  if (checkoutSuccess && successData) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-200">
              <span className="text-4xl text-green-700">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">Pesanan Berhasil Dibuat!</h1>
            <p className="text-green-600 mb-6">Terima kasih telah berbelanja di By Gadiza</p>
          </div>

          <div className="space-y-6 rounded-xl bg-white p-6 shadow-sm">
            <div className="border-b border-green-200 pb-4">
              <p className="text-sm font-medium text-slate-600">Kode Order Anda</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{successData.kodeOrder}</p>
            </div>

            <div className="rounded-lg bg-green-100 p-4">
              <p className="text-sm font-medium text-slate-600">Status Pesanan</p>
              <p className="mt-1 text-lg font-semibold text-green-700">Ⅰ PENDING</p>
              <p className="mt-1 text-sm text-slate-600">(Menunggu Konfirmasi WhatsApp Admin)</p>
            </div>

            <div className="space-y-2 text-sm text-slate-600">
              <p><span className="font-medium">Atas nama:</span> {namaPembeli}</p>
              <p><span className="font-medium">Nomor WhatsApp:</span> {nomorWhatsApp}</p>
              <p><span className="font-medium">Alamat:</span> {alamat}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href={`https://wa.me/${successData.adminWhatsApp}?text=${encodeURIComponent(successData.message)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full bg-green-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-green-700 shadow-md"
            >
              <span className="inline-flex items-center gap-2">
                <span>💬</span>
                Kirim Konfirmasi ke WhatsApp
              </span>
            </a>
            <a
              href="/"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-center font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Kembali ke Beranda
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Keranjang</h1>

      {cart.length === 0 ? (
        <div className="text-center py-12 border rounded-xl bg-slate-50">
          <p className="text-slate-500 mb-4">Keranjang belanja Anda kosong.</p>
          <a href="/" className="inline-block rounded-full bg-rose-600 px-6 py-2 text-sm font-medium text-white hover:bg-rose-700">
            Mulai Belanja
          </a>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div key={item.id || idx} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center bg-white shadow-sm">
                <img 
                  src={item.foto_url || item.fotoUrl || "/placeholder.jpg"} 
                  alt={typeSafeNama(item)} 
                  className="h-24 w-24 rounded-md object-cover bg-slate-100" 
                />
                <div className="flex-1 space-y-2">
                  <div className="font-semibold text-lg">{typeSafeNama(item)}</div>
                  <div className="text-sm text-slate-600">Harga satuan: {formatRupiah(typeSafeHarga(item))}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.id, Number(item.qty || 1) - 1)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 font-bold"
                    >
                      -
                    </button>
                    <span className="min-w-[2rem] text-center text-sm font-semibold">{item.qty || 1}</span>
                    <button
                      type="button"
                      onClick={() => updateItemQty(item.id, Number(item.qty || 1) + 1)}
                      className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700 hover:bg-slate-50 font-bold"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="ml-2 rounded-full bg-rose-50 px-3 py-1 text-sm font-semibold text-rose-600 hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end justify-between gap-2 min-w-[100px]">
                  <div className="font-semibold text-rose-600 text-base">
                    {formatRupiah(typeSafeHarga(item) * Number(item.qty || 1))}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-xl border p-5 bg-slate-50">
            <h2 className="text-xl font-semibold text-slate-800">Informasi Pembeli</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nama Pembeli</span>
                <input
                  type="text"
                  value={namaPembeli}
                  onChange={(event) => {
                    setNamaPembeli(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
                  placeholder="Contoh: Siti Aminah"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nomor WhatsApp</span>
                <input
                  type="tel"
                  value={nomorWhatsApp}
                  onChange={(event) => {
                    setNomorWhatsApp(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
                  placeholder="Contoh: 081234567890"
                />
              </label>
              <label className="sm:col-span-2 block">
                <span className="text-sm font-medium text-slate-700">Alamat Lengkap</span>
                <textarea
                  value={alamat}
                  onChange={(event) => {
                    setAlamat(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200 bg-white"
                  placeholder="Nama jalan, nomor rumah, RT/RW, kecamatan, kota, dan kode pos"
                  rows={3}
                />
              </label>
            </div>
            {formError ? <p className="text-sm font-medium text-rose-600 bg-rose-50 p-2 rounded-lg">⚠️ {formError}</p> : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border p-4 bg-white shadow-sm">
            <div className="text-lg font-semibold text-slate-700">Total Pembayaran</div>
            <div className="text-2xl font-bold text-rose-600">{formatRupiah(total)}</div>
          </div>

          <div className="grid gap-3 pt-2 sm:grid-cols-[1fr_auto]">
            <button
              onClick={handleReview}
              disabled={isProcessing}
              className="rounded-full bg-slate-800 px-6 py-3 font-medium text-white transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-70 text-center shadow"
            >
              Tinjau Pesanan
            </button>
            <button
              onClick={() => {
                setShowSummary(false);
                setFormError("");
              }}
              type="button"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-slate-700 hover:bg-slate-100 font-medium transition"
            >
              Ubah Data
            </button>
          </div>

          {showSummary ? (
            <div ref={summaryRef} className="rounded-xl border-2 border-rose-300 bg-white p-6 shadow-md space-y-6">
              <div className="mb-2 flex items-center justify-between border-b pb-3">
                <h2 className="text-2xl font-bold text-slate-800">Ringkasan Checkout</h2>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700 animate-pulse">Periksa kembali data Anda</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-xl">
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Nama Pembeli</p>
                  <p className="mt-1 text-base font-medium text-slate-800">{namaPembeli}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Nomor WhatsApp</p>
                  <p className="mt-1 text-base font-medium text-slate-800">{nomorWhatsApp}</p>
                </div>
                <div>
                  <p className="font-semibold text-slate-500 uppercase tracking-wider text-xs">Alamat Tujuan</p>
                  <p className="mt-1 text-base font-medium text-slate-800">{alamat}</p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Daftar Item Belanja</p>
                <div className="space-y-3 rounded-xl border bg-white p-4">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between gap-4 border-b last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-medium text-slate-800">{typeSafeNama(item)}</p>
                        <p className="text-sm text-slate-500">
                          Qty: {item.qty || 1} × {formatRupiah(typeSafeHarga(item))}
                        </p>
                      </div>
                      <div className="font-semibold text-slate-800">{formatRupiah(typeSafeHarga(item) * Number(item.qty || 1))}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-rose-50 p-4 flex justify-between items-center border border-rose-100">
                <div>
                  <p className="text-sm text-rose-700 font-medium">Total Harga Akhir</p>
                  <p className="text-3xl font-extrabold text-rose-600 mt-1">{formatRupiah(total)}</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => {
                      setShowSummary(false);
                      window.scrollTo({ top: 400, behavior: "smooth" });
                    }}
                    type="button"
                    className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Kembali Edit
                  </button>
                  <button
                    onClick={handleCheckout}
                    disabled={isProcessing}
                    className="rounded-full bg-rose-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-70 transition"
                  >
                    {isProcessing ? "Memproses..." : "Konfirmasi & Kirim"}
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}