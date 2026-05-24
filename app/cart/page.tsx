"use client";

import { useEffect, useState } from "react";

// Format numbers into Indonesian Rupiah currency strings.
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
}

export default function CartPage() {
  const [cart, setCart] = useState<any[]>([]);
  const [namaPembeli, setNamaPembeli] = useState("");
  const [nomorWhatsApp, setNomorWhatsApp] = useState("");
  const [alamat, setAlamat] = useState("");
  const [formError, setFormError] = useState("");
  const [showSummary, setShowSummary] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ kodeOrder: string; adminWhatsApp: string; message: string } | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("bygadiza_cart");
      if (raw) setCart(JSON.parse(raw));
    } catch (e) {
      console.warn("Gagal baca cart dari localStorage", e);
    }
  }, []);

  const saveCart = (nextCart: any[]) => {
    localStorage.setItem("bygadiza_cart", JSON.stringify(nextCart));
    setCart(nextCart);
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

  const total = cart.reduce((s, i) => s + (Number(i.harga) || 0) * (Number(i.qty) || 1), 0);

  // Validate the checkout form before showing the summary.
  function validateCheckout() {
    if (!cart || cart.length === 0) return "Keranjang kosong.";
    if (!namaPembeli.trim()) return "Nama pembeli wajib diisi.";
    if (!nomorWhatsApp.trim()) return "Nomor WhatsApp wajib diisi.";
    if (!/^((\+62|62|0)\d{8,15})$/.test(nomorWhatsApp.trim())) return "Nomor WhatsApp tidak valid.";
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
      `Nama: ${namaPembeli}`,
      `Nomor WhatsApp: ${nomorWhatsApp}`,
      `Alamat: ${alamat}`,
      "",
      "Daftar Produk:",
      ...cart.map((item) => {
        const namaProduk = item.nama || item.name || "Produk";
        const kuantitas = Number(item.qty || 1);
        const hargaSatuan = Number(item.harga || 0);
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
      nama: p.nama,
      qty: p.qty || 1,
      harga: Number(p.harga) || 0,
      foto_url: p.foto_url || p.fotoUrl || "",
    }));

    setIsProcessing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_pembeli: namaPembeli.trim(), nomor_whatsapp: nomorWhatsApp.trim(), alamat: alamat.trim(), total_harga: total, detail_produk: detailProduk }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("API /api/checkout error:", data);
        const message = data?.error || data?.details || "Gagal membuat pesanan";
        throw new Error(message);
      }

      const kodeOrder = data?.kode_order ?? data?.kodeOrder ?? "#GDZ-UNKNOWN";

      // WhatsApp notification with dynamic product list, using the generated message text.
      const adminNumber = "6289684327334"; // change to your admin/notification number
      const message = buildWhatsAppMessage(kodeOrder);

      // Clear cart
      localStorage.removeItem("bygadiza_cart");
      setCart([]);
      setShowSummary(false);

      // Show success receipt
      setSuccessData({
        kodeOrder,
        adminWhatsApp: adminNumber,
        message,
      });
      setCheckoutSuccess(true);
    } catch (err) {
      console.error("Gagal membuat pesanan:", err);
      alert("Gagal membuat pesanan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  }

  // Success receipt view
  if (checkoutSuccess && successData) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-8 shadow-lg">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-200">
              <span className="text-4xl">✓</span>
            </div>
            <h1 className="text-3xl font-bold text-green-700 mb-2">Pesanan Berhasil Dibuat!</h1>
            <p className="text-green-600 mb-6">Terima kasih telah berbelanja di By Gadiza</p>
          </div>

          <div className="space-y-6 rounded-xl bg-white p-6">
            <div className="border-b border-green-200 pb-4">
              <p className="text-sm font-medium text-slate-600">Kode Order Anda</p>
              <p className="mt-1 text-2xl font-bold text-green-700">{successData.kodeOrder}</p>
            </div>

            <div className="rounded-lg bg-green-100 p-4">
              <p className="text-sm font-medium text-slate-600">Status Pesanan</p>
              <p className="mt-1 text-lg font-semibold text-green-700">🕐 PENDING</p>
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
              className="rounded-full bg-green-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-green-700"
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
        <p>Keranjang kosong.</p>
      ) : (
        <div className="space-y-4">
          {cart.map((item, idx) => (
            <div key={idx} className="flex flex-col gap-4 rounded-xl border p-4 sm:flex-row sm:items-center">
              <img src={item.foto_url || item.fotoUrl} alt={item.nama} className="h-24 w-24 rounded-md object-cover" />
              <div className="flex-1 space-y-2">
                <div className="font-semibold">{item.nama}</div>
                <div className="text-sm text-slate-600">Harga satuan: {formatRupiah(Number(item.harga) || 0)}</div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, Number(item.qty || 1) - 1)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700"
                  >
                    -
                  </button>
                  <span className="min-w-[2rem] text-center text-sm font-semibold">{item.qty || 1}</span>
                  <button
                    type="button"
                    onClick={() => updateItemQty(item.id, Number(item.qty || 1) + 1)}
                    className="rounded-full border border-slate-300 px-3 py-1 text-sm text-slate-700"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                  >
                    Hapus
                  </button>
                </div>
              </div>
              <div className="flex flex-col items-end justify-between gap-2">
                <div className="font-medium">{formatRupiah((Number(item.harga) || 0) * (Number(item.qty) || 1))}</div>
              </div>
            </div>
          ))}

          <div className="space-y-4 rounded-xl border p-4 bg-slate-50">
            <h2 className="text-2xl font-semibold">Informasi Pembeli</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium">Nama Pembeli</span>
                <input
                  value={namaPembeli}
                  onChange={(event) => {
                    setNamaPembeli(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Contoh: Siti Aminah"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium">Nomor WhatsApp</span>
                <input
                  value={nomorWhatsApp}
                  onChange={(event) => {
                    setNomorWhatsApp(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Contoh: +6281234567890"
                />
              </label>
              <label className="sm:col-span-2 block">
                <span className="text-sm font-medium">Alamat</span>
                <textarea
                  value={alamat}
                  onChange={(event) => {
                    setAlamat(event.target.value);
                    setShowSummary(false);
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
                  placeholder="Alamat lengkap pengiriman"
                  rows={3}
                />
              </label>
            </div>
            {formError ? <p className="text-sm text-rose-600">{formError}</p> : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border-t pt-4">
            <div className="text-lg font-semibold">Total</div>
            <div className="text-xl font-bold">{formatRupiah(total)}</div>
          </div>

          <div className="grid gap-3 pt-4 sm:grid-cols-[1fr_auto]">
            <button
              onClick={handleReview}
              disabled={isProcessing}
              className="rounded-full bg-slate-800 px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              Tinjau Pesanan
            </button>
            <button
              onClick={() => {
                setShowSummary(false);
                setFormError("");
              }}
              type="button"
              className="rounded-full border border-slate-300 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50"
            >
              Ubah Data
            </button>
          </div>

          {showSummary ? (
            <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-2xl font-semibold">Ringkasan Checkout</h2>
                <span className="rounded-full bg-rose-100 px-3 py-1 text-sm font-medium text-rose-700">Periksa dulu</span>
              </div>

              <div className="space-y-4 text-sm text-slate-700">
                <div>
                  <p className="font-semibold">Nama Pembeli</p>
                  <p>{namaPembeli}</p>
                </div>
                <div>
                  <p className="font-semibold">Nomor WhatsApp</p>
                  <p>{nomorWhatsApp}</p>
                </div>
                <div>
                  <p className="font-semibold">Alamat Tujuan</p>
                  <p>{alamat}</p>
                </div>
                <div>
                  <p className="font-semibold">Daftar Item</p>
                  <div className="mt-2 space-y-3 rounded-xl bg-slate-50 p-4">
                    {cart.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium">{item.nama}</p>
                          <p className="text-sm text-slate-500">
                            Qty: {item.qty || 1} × {formatRupiah(Number(item.harga) || 0)}
                          </p>
                        </div>
                        <div className="font-semibold">{formatRupiah((Number(item.harga) || 0) * (Number(item.qty) || 1))}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Harga Akhir</p>
                  <p className="text-2xl font-semibold">{formatRupiah(total)}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  onClick={() => setShowSummary(false)}
                  type="button"
                  className="rounded-full border border-slate-300 bg-white px-6 py-3 text-slate-700 hover:bg-slate-50"
                >
                  Kembali Edit
                </button>
                <button
                  onClick={handleCheckout}
                  disabled={isProcessing}
                  className="rounded-full bg-rose-600 px-6 py-3 text-white disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isProcessing ? "Mengirim..." : "Konfirmasi Akhir"}
                </button>
              </div>
            </section>
          ) : null}
        </div>
      )}
    </main>
  );
}
