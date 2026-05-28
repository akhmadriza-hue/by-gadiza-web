# 🚀 Quick Start Guide - By Gadiza Checkout

Panduan cepat untuk menjalankan aplikasi By Gadiza dengan fitur checkout, RajaOngkir, dan WhatsApp.

## 📋 Prasyarat

- Node.js 18+ dan npm/yarn
- Akun Supabase (sudah dikonfigurasi)
- API Key RajaOngkir (sudah ada di `.env.local`)
- (Opsional) Akun WhatsApp API provider

## 🔧 Setup Awal

### 1. Install Dependencies
```bash
npm install
# atau
yarn install
```

### 2. Konfigurasi Environment Variables
```bash
cp .env.example .env.local
# Buka .env.local dan sesuaikan nilai jika diperlukan
```

**Yang sudah dikonfigurasi:**
- ✅ Supabase (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY)
- ✅ RajaOngkir (RAJAONGKIR_API_KEY, NEXT_PUBLIC_RAJAONGKIR_API_KEY)

**Yang perlu dikonfigurasi (opsional):**
- ❌ WhatsApp API (WHATSAPP_API_URL, WHATSAPP_API_KEY, WHATSAPP_ADMIN_PHONE)

### 3. Jalankan Development Server
```bash
npm run dev
# atau
yarn dev
```

Aplikasi akan berjalan di `http://localhost:3000`

## 🛒 Testing Flow Checkout

### Step 1: Tambah Produk ke Keranjang
1. Buka halaman beranda (`http://localhost:3000`)
2. Klik tombol "Tambah ke Keranjang" pada produk yang diinginkan
3. Lihat cart count meningkat di navbar

### Step 2: Buka Halaman Checkout
1. Klik tombol "Checkout" atau "🛒 Keranjang" di navbar
2. Akan redirect ke halaman checkout (`/checkout`)

### Step 3: Isi Form Checkout
1. **Data Pemesan:**
   - Nama Lengkap: Masukkan nama Anda
   - No. WhatsApp: 08xx atau +62xx
   - No. Telepon (Opsional): Nomor alternatif

2. **Alamat Pengiriman:**
   - Alamat Lengkap: Jalan, No Rumah, Rt/Rw
   - Kelurahan: Nama kelurahan/desa
   - Kecamatan: Nama kecamatan
   - Provinsi: Pilih dari dropdown
   - Kota: Auto-load setelah provinsi dipilih

3. **Kurir & Layanan Pengiriman:**
   - Pilih salah satu kurir (JNE, TIKI, POS)
   - Pilih layanan pengiriman (dengan harga dan estimasi)

### Step 4: Review & Checkout
1. Lihat ringkasan di sidebar (subtotal, ongkir, total)
2. Klik tombol "Selesaikan Pesanan"
3. Tunggu proses (pesanan disimpan ke database)
4. Lihat halaman sukses dengan kode pesanan

## 📱 Setup WhatsApp API (Optional)

Jika ingin mengaktifkan pengiriman nota via WhatsApp:

### Pilih Provider (Rekomendasi: Twilio atau Wuzapi)

**Twilio (Most Reliable):**
```bash
# Setup di https://www.twilio.com
# 1. Daftar akun
# 2. Dapatkan Account SID & Auth Token
# 3. Setup WhatsApp Business
# 4. Update .env.local:

WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{ACCOUNT_SID}/Messages
WHATSAPP_API_KEY={ACCOUNT_SID}:{AUTH_TOKEN}
WHATSAPP_SENDER_PHONE=whatsapp:+62812345678
WHATSAPP_ADMIN_PHONE=62812345678
```

**Wuzapi (Indonesia-Friendly, Lebih Murah):**
```bash
# Setup di https://wuzapi.com
# 1. Daftar akun
# 2. Setup WhatsApp Business
# 3. Dapatkan API Key
# 4. Update .env.local:

WHATSAPP_API_URL=https://api.wuzapi.com/sendMessage
WHATSAPP_API_KEY=your-api-key-here
WHATSAPP_ADMIN_PHONE=62812345678
```

### Restart Dev Server
```bash
# Stop server dengan Ctrl+C
# Jalankan ulang:
npm run dev
```

### Test WhatsApp
1. Lakukan checkout dengan nomor WhatsApp yang benar
2. Periksa WhatsApp untuk menerima nota pesanan
3. Pesanan akan tetap tersimpan meski WhatsApp gagal (fallback safety)

## 📦 File Structure Checkout

```
app/
├── checkout/
│   └── page.tsx              # Halaman checkout utama
├── api/
│   ├── checkout/
│   │   └── route.ts          # Save pesanan ke database
│   └── send-whatsapp/
│       └── route.ts          # Kirim nota via WhatsApp
├── components/
│   ├── Navigation.tsx        # Navigation bar dengan cart count
│   └── ProductGrid.tsx       # Komponen grid produk
└── layout.tsx                # Root layout dengan Navigation

lib/
├── checkoutUtils.ts          # Utility functions
├── productTable.ts           # Product table name
└── supabase.js               # Supabase client

CHECKOUT_SETUP.md             # Dokumentasi lengkap setup
.env.example                  # Template environment variables
```

## 🐛 Troubleshooting

### Error: "Keranjang Kosong"
**Penyebab:** Tidak ada produk di keranjang
**Solusi:** Tambahkan produk ke keranjang dari halaman beranda

### Error: "Nama pembeli wajib diisi"
**Penyebab:** Form tidak lengkap
**Solusi:** Isi semua field yang ditandai dengan asterisk (*)

### Error: "Gagal memuat provinsi"
**Penyebab:** API Key RajaOngkir tidak valid
**Solusi:** Verifikasi `NEXT_PUBLIC_RAJAONGKIR_API_KEY` di `.env.local`

### Nomor WhatsApp tidak valid
**Format yang diterima:**
- `08123456789` (dimulai dengan 0)
- `62123456789` (format internasional tanpa +)
- `+62123456789` (format internasional dengan +)

### WhatsApp tidak menerima nota
**Penyebab:** WhatsApp API belum dikonfigurasi
**Solusi:** Setup credentials di `.env.local` atau lihat CHECKOUT_SETUP.md

## 📊 Database Schema

### Tabel: pesanan
```sql
id_pesanan         UUID (Primary Key)
kode_order         TEXT (Unique)
nama_pembeli       TEXT
nomor_wa           TEXT
nomor_telepon      TEXT (Optional)
alamat             TEXT
provinsi           TEXT
kota               TEXT
ongkir             NUMERIC
kurir              TEXT
layanan            TEXT
estimasi_hari      TEXT
total_harga        NUMERIC
status             TEXT (default: 'pending')
detail_produk      JSONB
created_at         TIMESTAMPTZ
```

## 🚀 Deployment

### Build Production
```bash
npm run build
npm start
```

### Environment Variables untuk Production
- Setup semua `WHATSAPP_API_*` di platform hosting (Vercel, Netlify, dll)
- Pastikan `.env.local` tidak di-commit ke git

## 📞 Support

Untuk bantuan lebih lanjut:
1. Baca CHECKOUT_SETUP.md untuk dokumentasi lengkap
2. Cek RajaOngkir docs: https://rajaongkir.com/dokumentasi
3. Cek WhatsApp provider docs (Twilio/Wuzapi)
4. Review kode di `app/checkout/page.tsx`

## 🎯 Features Status

- ✅ Keranjang belanja
- ✅ Form data pemesan
- ✅ Integrasi RajaOngkir
- ✅ Kalkulasi ongkir otomatis
- ✅ Nota rapi dengan format markdown
- ✅ Pengiriman via WhatsApp (optional)
- ✅ Save pesanan ke Supabase
- ⏳ Payment gateway (untuk dikembangkan)
- ⏳ Order tracking (untuk dikembangkan)

---

**Dibuat:** 2024 | **Updated:** Sesuai kebutuhan
