"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getProvinces, getCities } from "./dataWilayah";

const RAJAONGKIR_API_KEY = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY || "";
// Format numbers into Indonesian Rupiah currency strings
function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value);
}

interface CartItem {
  id: string;
  nama: string;
  harga: number;
  qty: number;
  foto_url?: string;
}

interface Province {
  province_id: string;
  province: string;
}

interface City {
  city_id: string;
  city_name: string;
  type: string;
  postal_code: string;
}

interface Courier {
  code: string;
  name: string;
  costs: {
    service: string;
    description: string;
    cost: { value: number; etd: string; }[];
  }[];
}

export default function CheckoutPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loadingCart, setLoadingCart] = useState(true);
  const [metodePengiriman, setMetodePengiriman] = useState<"kurir" | "manual">("kurir");

  // Form state
  const [namaPembeli, setNamaPembeli] = useState("");
  const [nomorWhatsApp, setNomorWhatsApp] = useState("");
  const [nomorTelepon, setNomorTelepon] = useState("");

  const [alamat, setAlamat] = useState("");
  const [kelurahan, setKelurahan] = useState("");
  const [kecamatan, setKecamatan] = useState("");

  // RajaOngkir state
  const [provins, setProvins] = useState<Province[]>([]);
  const [kota, setKota] = useState<City[]>([]);
  const [loadingProvins, setLoadingProvins] = useState(false);
  const [loadingKota, setLoadingKota] = useState(false);
  const [loadingOngkir, setLoadingOngkir] = useState(false);

  const [provinsiTerpilih, setProvinsiTerpilih] = useState("");
  const [kotaTerpilih, setKotaTerpilih] = useState("");
  const [kurir, setKurir] = useState<Courier[]>([]);
  const [kurirTerpilih, setKurirTerpilih] = useState("");
  const [servisTerpilih, setServisTerpilih] = useState("");
  const [ongkir, setOngkir] = useState(0);
  const [estimasiHari, setEstimasiHari] = useState("");

  // Checkout state
  const [formError, setFormError] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [successData, setSuccessData] = useState<{ kodeOrder: string } | null>(null);

  // KONFIGURASI ASAL
  const ASAL_KOTA_NAMA = "Kota Banjarbaru"; 

  // Load cart dari localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bygadiza_cart");
      if (raw) {
        setCart(JSON.parse(raw));
      }
    } catch (e) {
      console.warn("Gagal baca cart dari localStorage", e);
    }
    setLoadingCart(false);
  }, []);

  // Fetch daftar provinsi saat component mount
  useEffect(() => {
    fetchProvins();
  }, []);

  // Fetch kota ketika provinsi berubah
  useEffect(() => {
    if (provinsiTerpilih) {
      fetchKota(provinsiTerpilih);
      setKotaTerpilih("");
      setKurir([]);
      setOngkir(0);
      setKurirTerpilih("");
      setServisTerpilih("");
      setEstimasiHari("");
    }
  }, [provinsiTerpilih]);

  async function fetchProvins() {
    try {
      setLoadingProvins(true);
      const provinces = getProvinces();
      setProvins(provinces);
    } catch (error) {
      console.error("Error loading provinces:", error);
      setFormError("Gagal memuat daftar provinsi");
    } finally {
      setLoadingProvins(false);
    }
  }

  async function fetchKota(provinceId: string) {
    try {
      setLoadingKota(true);
      const cities = getCities(provinceId);
      setKota(cities);
    } catch (error) {
      console.error("Error loading cities:", error);
      setFormError("Gagal memuat daftar kota");
    } finally {
      setLoadingKota(false);
    }
  }

  // FUNGSI ONGKIR
  async function fetchOngkir(destinationCityId: string, destinationName: string = "") {
    console.log(`🚀 fetchOngkir mulai. Tujuan ID: ${destinationCityId}, Nama Wilayah: "${destinationName}"`);
    try {
      setLoadingOngkir(true);
      setFormError("");

      const response = await fetch("/api/rajaongkir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cost",
          destinationName: destinationName, 
          originName: ASAL_KOTA_NAMA, 
          weight: 1000, 
          courier: "jne:tiki:pos", 
        }),
      });

      const data = await response.json();

      console.log("STATUS HTTP:", response.status);
      console.log("DATA dari /api/rajaongkir:", JSON.stringify(data, null, 2));

      if (!response.ok) throw new Error("HTTP error: " + response.status);

      if (data.status?.code === 200 && data.results?.length > 0) {
        setKurir(data.results);
        setOngkir(0);
        setServisTerpilih("");
        setEstimasiHari("");
      } else {
        setFormError(data.error || data.status?.description || "Gagal load ongkir");
      }
    } catch (error) {
      console.error("Error fetchOngkir:", error);
      setFormError("Gagal menghitung ongkos kirim: " + String(error));
    } finally {
      setLoadingOngkir(false);
    }
  }

  // LOGIKA PEMILIHAN KOTA (DISEDERHANAKAN AGAR BITESHIP AKURAT)
  async function handleKotaChange(cityId: string) {
    console.log("🔥 handleKotaChange dipanggil, cityId:", cityId);
    setKotaTerpilih(cityId);
    
    if (cityId) { 
        const targetCity = kota.find((c) => c.city_id === cityId);
        if (!targetCity) return;
      
        const fullCityName = targetCity.city_name.trim();
        
        // Hanya panggil API Biteship jika memilih opsi ekspedisi resmi
        if (metodePengiriman === "kurir") {
          await fetchOngkir(cityId, fullCityName);
        }
    } else { 
        setKurir([]);
        setOngkir(0);
    }
  }

  function handleKurirServiceChange(courierIndex: number, serviceIndex: number) {
    const selectedCourier = kurir[courierIndex];
    const selectedService = selectedCourier.costs[serviceIndex];
    const cost = selectedService.cost[0];

    setKurirTerpilih(selectedCourier.code);
    setServisTerpilih(selectedService.service);
    setOngkir(cost.value);
    setEstimasiHari(cost.etd || "");
  }

  const subtotal = cart.reduce((sum, item) => sum + item.harga * item.qty, 0);
  const totalHarga = subtotal + ongkir;

  function validateCheckout(): string {
    if (cart.length === 0) return "Keranjang belanja Anda kosong";
    if (!namaPembeli.trim()) return "Nama pembeli harus diisi";
    if (!nomorWhatsApp.trim()) return "Nomor WhatsApp harus diisi";
    if (!/^(\+62|62|0)(\d{8,15})$/.test(nomorWhatsApp.replace(/\D/g, ""))) return "Format nomor WhatsApp tidak valid";
    if (!alamat.trim()) return "Alamat pengiriman harus diisi";
    if (!kelurahan.trim()) return "Kelurahan harus diisi";
    if (!kecamatan.trim()) return "Kecamatan harus diisi";
    if (!provinsiTerpilih) return "Provinsi tujuan harus dipilih";
    if (!kotaTerpilih) return "Kota tujuan harus dipilih";
    
    // Validasi kurir hanya jika menggunakan opsi Ekspedisi Resmi
    if (metodePengiriman === "kurir") {
      if (!kurirTerpilih) return "Kurir pengiriman harus dipilih";
      if (ongkir === 0) return "Layanan pengiriman harus dipilih";
    }
    
    return "";
  }

  function buildWhatsAppMessage(kodeOrder: string): string {
    const teksKurir = metodePengiriman === "kurir" 
      ? `Ongkir (${kurirTerpilih.toUpperCase()} - ${servisTerpilih}): ${formatRupiah(ongkir)}`
      : `Ongkir: Gratis Ongkir (Diantar Langsung/COD)`;

    const teksEstimasi = metodePengiriman === "kurir"
      ? `Estimasi pengiriman: ${estimasiHari} hari kerja`
      : `Estimasi: Segera diantar ke sekolah / waktu COD kesepakatan`;

    const lines = [
      "====== NOTA PESAN ======",
      `Kode Order: *${kodeOrder}*`,
      "",
      "📋 *DATA PEMESAN*",
      `Nama: ${namaPembeli}`,
      `No. WhatsApp: ${nomorWhatsApp}`,
      nomorTelepon ? `No. Telepon: ${nomorTelepon}` : "",
      "",
      "📍 *ALAMAT PENGIRIMAN*",
      `${alamat}`,
      `Kel. ${kelurahan}, Kec. ${kecamatan}`,
      `${kota.find((k) => k.city_id === kotaTerpilih)?.city_name || "Kota"} ${provins.find((p) => p.province_id === provinsiTerpilih)?.province || "Provinsi"}`,
      "",
      "🚚 *METODE PENGANTARAN*",
      metodePengiriman === "kurir" ? "Ekspedisi Resmi (Biteship)" : "Diantar Langsung / COD Teman Sekolah",
      "",
      "📦 *DAFTAR PRODUK*",
      ...cart.map((item) => {
        const subtotalItem = item.harga * item.qty;
        return `• ${item.nama}\n  Qty: ${item.qty} × ${formatRupiah(item.harga)} = ${formatRupiah(subtotalItem)}`;
      }),
      "",
      "💳 *RINGKASAN PEMBAYARAN*",
      `Subtotal: ${formatRupiah(subtotal)}`,
      teksKurir,
      `*TOTAL: ${formatRupiah(totalHarga)}*`,
      "",
      teksEstimasi,
      "",
      metodePengiriman === "manual" 
        ? "Silakan lakukan pembayaran secara Tunai (COD) saat barang diterima atau Transfer Bank."
        : "Silakan lakukan pembayaran sesuai instruksi yang akan dikirimkan. Terima kasih.",
      "=========================",
    ];
    return lines.filter((line) => line !== "").join("\n");
  }

  async function handleCheckout() {
    const validationMsg = validateCheckout();
    if (validationMsg) {
      setFormError(validationMsg);
      return;
    }

    setIsProcessing(true);
    setFormError("");

    try {
      const detailProduk = cart.map((p) => ({
        id: p.id,
        nama: p.nama,
        qty: p.qty,
        harga: p.harga,
        foto_url: p.foto_url,
      }));

      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nama_pembeli: namaPembeli,
          nomor_whatsapp: nomorWhatsApp,
          nomor_telepon: nomorTelepon,
          alamat: `${alamat}, Kel. ${kelurahan}, Kec. ${kecamatan}, ${kota.find((k) => k.city_id === kotaTerpilih)?.city_name || "Kota"} ${provins.find((p) => p.province_id === provinsiTerpilih)?.province || "Provinsi"}`,
          provinsi: provins.find((p) => p.province_id === provinsiTerpilih)?.province || "",
          kota: kota.find((k) => k.city_id === kotaTerpilih)?.city_name || "",
          ongkir,
          kurir: metodePengiriman === "kurir" ? kurirTerpilih : "MANUAL",
          layanan: metodePengiriman === "kurir" ? servisTerpilih : "DIANTAR LANGSUNG",
          estimasi_hari: metodePengiriman === "kurir" ? estimasiHari : "0",
          total_harga: totalHarga,
          detail_produk: detailProduk,
        }),
      });

      if (!checkoutResponse.ok) {
        const errData = await checkoutResponse.json();
        throw new Error(errData.error || "Gagal menyimpan pesanan");
      }

      const checkoutData = await checkoutResponse.json();
      const kodeOrder = checkoutData.kode_order;

      const pesan = buildWhatsAppMessage(kodeOrder);

      const whatsappResponse = await fetch("/api/send-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_number: nomorWhatsApp,
          message: pesan,
          kode_order: kodeOrder,
        }),
      });

      if (!whatsappResponse.ok) {
        console.warn("Peringatan: Pesan WhatsApp gagal dikirim, tapi pesanan sudah tersimpan");
      }

      localStorage.removeItem("bygadiza_cart");
      setCart([]);
      setCheckoutSuccess(true);
      setSuccessData({ kodeOrder });

    } catch (error) {
      console.error("Checkout error:", error);
      setFormError(error instanceof Error ? error.message : "Terjadi kesalahan saat checkout");
    } finally {
      setIsProcessing(false);
    }
  }

  if (loadingCart) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat keranjang...</p>
        </div>
      </div>
    );
  }

  if (checkoutSuccess && successData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h1 className="text-3xl font-bold text-green-600 mb-2">Pesanan Berhasil!</h1>
            <p className="text-gray-600 mb-6">Terima kasih atas pembelian Anda</p>

            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <p className="text-sm text-gray-600 mb-2">Kode Pesanan Anda:</p>
              <p className="text-2xl font-bold text-purple-600">{successData.kodeOrder}</p>
            </div>

            <div className="space-y-3 mb-8 text-left bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-3">📝 Langkah Selanjutnya:</h3>
              <ul className="space-y-2 text-blue-800">
                <li>✓ Nota pesanan telah dikirim ke WhatsApp Anda</li>
                <li>✓ Silakan lakukan pembayaran sesuai instruksi yang akan dikirimkan</li>
                <li>✓ Pesanan akan diproses setelah pembayaran dikonfirmasi</li>
                <li>✓ Anda akan menerima notifikasi pengiriman via WhatsApp</li>
              </ul>
            </div>

            <Link
              href="/"
              className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Keranjang Anda Kosong</h1>
            <p className="text-gray-600 mb-8">Tambahkan produk terlebih dahulu untuk melakukan checkout</p>
            <Link href="/" className="inline-block bg-purple-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-purple-700 transition">
              Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Checkout Pesanan</h1>

        {formError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <p className="font-semibold">⚠️ Error:</p>
            <p>{formError}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            {/* Ringkasan Keranjang */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">📦 Ringkasan Keranjang</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between items-start border-b pb-3">
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800">{item.nama}</p>
                      <p className="text-sm text-gray-600">Qty: {item.qty}</p>
                    </div>
                    <p className="font-semibold text-purple-600">{formatRupiah(item.harga * item.qty)}</p>
                  </div>
                ))}
              </div>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Subtotal:</span>
                  <span className="font-bold text-purple-600">{formatRupiah(subtotal)}</span>
                </div>
              </div>
            </div>

            {/* Data Pemesan */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">👤 Data Pemesan</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Nama Lengkap *</label>
                  <input
                    type="text"
                    value={namaPembeli}
                    onChange={(e) => setNamaPembeli(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="Masukkan nama lengkap Anda"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">No. WhatsApp *</label>
                    <input
                      type="text"
                      value={nomorWhatsApp}
                      onChange={(e) => setNomorWhatsApp(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="08xx atau +62xx"
                    />
                    <p className="text-xs text-gray-500 mt-1">Format: 08xx atau +62xx</p>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">No. Telepon (Opsional)</label>
                    <input
                      type="text"
                      value={nomorTelepon}
                      onChange={(e) => setNomorTelepon(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="(Opsional)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Alamat Lengkap *</label>
                  <textarea
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                    placeholder="Jalan, No. Rumah, Rt/Rw, dll"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kelurahan *</label>
                    <input
                      type="text"
                      value={kelurahan}
                      onChange={(e) => setKelurahan(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="Kelurahan/Desa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kecamatan *</label>
                    <input
                      type="text"
                      value={kecamatan}
                      onChange={(e) => setKecamatan(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500"
                      placeholder="Kecamatan"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Provinsi Tujuan *</label>
                    <select
                      value={provinsiTerpilih}
                      onChange={(e) => setProvinsiTerpilih(e.target.value)}
                      disabled={loadingProvins}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 disabled:bg-gray-100"
                    >
                      <option value="">-- Pilih Provinsi --</option>
                      {provins.map((p) => (
                        <option key={p.province_id} value={p.province_id}>
                          {p.province}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Kota Tujuan *</label>
                    <select
                      value={kotaTerpilih}
                      onChange={(e) => handleKotaChange(e.target.value)}
                      disabled={!provinsiTerpilih || loadingKota}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 disabled:bg-gray-100"
                    >
                      <option value="">-- Pilih Kota --</option>
                      {kota.map((c) => (
                        <option key={c.city_id} value={c.city_id}>
                          {c.city_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ================= PILIHAN METODE PENGIRIMAN ================= */}
            <div className="bg-white p-6 rounded-lg shadow border mb-6">
              <h3 className="font-bold text-lg mb-4 text-gray-800">Mekanisme Pengantaran</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Opsi 1: Pakai Ekspedisi Resmi */}
                <label className={`p-4 border rounded-lg cursor-pointer flex flex-col transition-all ${metodePengiriman === 'kurir' ? 'border-purple-600 bg-purple-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <input 
                      type="radio" 
                      name="metode_pengiriman" 
                      checked={metodePengiriman === "kurir"}
                      onChange={() => {
                        setMetodePengiriman("kurir");
                        setOngkir(0); 
                        setKurirTerpilih("");
                        setServisTerpilih("");
                        setEstimasiHari("");
                        if (kotaTerpilih) {
                          const targetCity = kota.find((c) => c.city_id === kotaTerpilih);
                          if (targetCity) fetchOngkir(kotaTerpilih, targetCity.city_name.trim());
                        }
                      }}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>Kirim via Ekspedisi Resmi</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-5">Menggunakan kurir Biteship (JNE, J&T, POS) sesuai tarif asli.</span>
                </label>

                {/* Opsi 2: Antar Sendiri / COD Teman Sekolah */}
                <label className={`p-4 border rounded-lg cursor-pointer flex flex-col transition-all ${metodePengiriman === 'manual' ? 'border-purple-600 bg-purple-50/40' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                    <input 
                      type="radio" 
                      name="metode_pengiriman" 
                      checked={metodePengiriman === "manual"}
                      onChange={() => {
                        setMetodePengiriman("manual");
                        setOngkir(0); 
                        setKurir([]); 
                        setKurirTerpilih("");
                        setServisTerpilih("");
                        setEstimasiHari("");
                      }}
                      className="text-purple-600 focus:ring-purple-500"
                    />
                    <span>Diantar Langsung / COD</span>
                  </div>
                  <span className="text-xs text-slate-500 mt-1 pl-5">Khusus teman sekolah gadiza atau area terdekat (Bebas Ongkir).</span>
                </label>

              </div>
            </div>
            {/* ============================================================= */}

            {/* Pilih Kurir & Layanan Kondisional */}
            {kotaTerpilih && (
              <>
                {metodePengiriman === "kurir" ? (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4">🚚 Pilih Kurir & Layanan</h2>
                    
                    {loadingOngkir ? (
                      <div className="text-center py-8">
                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
                        <p className="mt-2 text-gray-600">Memuat pilihan kurir...</p>
                      </div>
                    ) : kurir.length > 0 ? (
                      <div className="space-y-4">
                        {kurir.map((courier, courierIdx) => (
                          <div key={courier.code} className="border border-gray-300 rounded-lg p-4">
                            <h3 className="font-bold text-gray-800 mb-3 uppercase">{courier.name}</h3>
                            <div className="space-y-2 pl-4">
                              {courier.costs.map((service, serviceIdx) => (
                                <label
                                  key={`${courier.code}-${service.service}`}
                                  className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                >
                                  <input
                                    type="radio"
                                    name="shipping"
                                    checked={kurirTerpilih === courier.code && servisTerpilih === service.service}
                                    onChange={() => handleKurirServiceChange(courierIdx, serviceIdx)}
                                    className="mr-3"
                                  />
                                  <div className="flex-1">
                                    <div className="font-semibold text-gray-800">{service.description}</div>
                                    <div className="text-sm text-gray-600">
                                      ETD: {service.cost[0]?.etd || "Tidak tersedia"} hari kerja
                                    </div>
                                  </div>
                                  <div className="font-bold text-purple-600">{formatRupiah(service.cost[0]?.value || 0)}</div>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <p className="text-amber-800 font-medium">
                          ⚠️ Opsi pengiriman otomatis tidak tersedia untuk rute ini.
                        </p>
                        <p className="text-sm text-amber-600 mt-1">
                          Silakan hubungi admin via WhatsApp untuk pengiriman manual atau pastikan nama wilayah terdaftar.
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-amber-50 p-6 rounded-lg border border-amber-200 text-center shadow-sm">
                    <p className="font-bold text-amber-800 text-lg mb-1">🛵 Mode Diantar Langsung Aktif!</p>
                    <p className="text-sm text-amber-700 max-w-md mx-auto">
                      Tanpa biaya kurir komersial. Pesanan akan dikoordinasikan langsung oleh gadiza untuk diantar ke sekolah atau COD. Pembayaran bisa via transfer bank atau cash langsung saat serah terima barang.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Summary Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow sticky top-6">
              <div className="p-6 border-b">
                <h2 className="text-lg font-bold text-gray-800 mb-4">💳 Ringkasan Total</h2>

                <div className="space-y-3 mb-4 pb-4 border-b">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-semibold text-gray-800">{formatRupiah(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ongkir:</span>
                    <span className="font-semibold text-gray-800">
                      {metodePengiriman === "manual" ? "Gratis" : formatRupiah(ongkir)}
                    </span>
                  </div>
                  {metodePengiriman === "kurir" && estimasiHari && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimasi:</span>
                      <span className="font-semibold text-gray-800">{estimasiHari} hari</span>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center mb-6">
                  <span className="text-lg font-bold text-gray-800">Total:</span>
                  <span className="text-2xl font-bold text-purple-600">{formatRupiah(totalHarga)}</span>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={isProcessing || (!kotaTerpilih) || (metodePengiriman === "kurir" && ongkir === 0)}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isProcessing ? "Memproses..." : "Selesaikan Pesanan"}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  Nota pesanan akan dikirim ke WhatsApp Anda setelah berhasil checkout
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}