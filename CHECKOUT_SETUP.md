# Setup Halaman Checkout dengan RajaOngkir & WhatsApp

Dokumentasi lengkap untuk setup dan konfigurasi halaman checkout yang telah dibuat.

## 📦 Fitur yang Tersedia

- ✅ **Tampilan Keranjang Belanja**: Menampilkan semua produk yang dipilih dengan subtotal
- ✅ **Form Data Pemesan**: Nama, No. WhatsApp, No. Telepon (opsional)
- ✅ **Integrasi RajaOngkir**: 
  - Pilih provinsi dan kota tujuan
  - Auto-fetch daftar kurir dan layanan
  - Kalkulasi ongkos kirim otomatis
  - Tampilkan estimasi pengiriman
- ✅ **Nota Rapi**: Format nota yang profesional dan mudah dibaca
- ✅ **Pengiriman via WhatsApp**: Kirim nota otomatis ke nomor pelanggan

## 🔧 Konfigurasi yang Sudah Ada

Sudah dikonfigurasi di `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RAJAONGKIR_API_KEY=pYcQ2lG84ee147155a3273aaHBczyCnV
NEXT_PUBLIC_RAJAONGKIR_API_KEY=pYcQ2lG84ee147155a3273aaHBczyCnV
```

## ⚙️ Setup WhatsApp API

Halaman checkout siap mengirim nota via WhatsApp. Untuk mengaktifkan fitur ini, pilih salah satu opsi di bawah:

### Option 1: Twilio (Recommended - Most Reliable)

1. **Daftar di [Twilio.com](https://www.twilio.com)**
   - Buat akun dan verifikasi nomor WhatsApp Anda
   - Dapatkan Twilio Account SID dan Auth Token

2. **Konfigurasi nomor WhatsApp Sandbox atau Business**
   - Ikuti setup wizard di Twilio Console
   - Setup approved sender number

3. **Tambahkan ke `.env.local`:**
   ```
   WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{YOUR_ACCOUNT_SID}/Messages
   WHATSAPP_API_KEY={ACCOUNT_SID}:{AUTH_TOKEN}
   WHATSAPP_SENDER_PHONE=whatsapp:+62812345678
   WHATSAPP_ADMIN_PHONE=62812345678
   ```
   Ganti:
   - `{YOUR_ACCOUNT_SID}` dengan Account SID Anda
   - `{ACCOUNT_SID}:{AUTH_TOKEN}` dengan kredensial
   - `+62812345678` dengan nomor WhatsApp Anda

### Option 2: Wuzapi (Indonesia-Friendly, Cheaper)

1. **Daftar di [Wuzapi.com](https://wuzapi.com)**
   - Setup WhatsApp Business account
   - Dapatkan API Key

2. **Tambahkan ke `.env.local`:**
   ```
   WHATSAPP_API_URL=https://api.wuzapi.com/sendMessage
   WHATSAPP_API_KEY={YOUR_API_KEY}
   WHATSAPP_ADMIN_PHONE=62812345678
   ```
   Ganti:
   - `{YOUR_API_KEY}` dengan API key dari Wuzapi

### Option 3: WhatsApp Business API (Official, For Enterprise)

1. **Aplikasikan di [Facebook for Business](https://business.facebook.com)**
   - Setup WhatsApp Business Account
   - Dapatkan Access Token dan Phone Number ID

2. **Tambahkan ke `.env.local`:**
   ```
   WHATSAPP_API_URL=https://graph.instagram.com/v18.0/{PHONE_NUMBER_ID}/messages
   WHATSAPP_API_KEY=Bearer {ACCESS_TOKEN}
   WHATSAPP_ADMIN_PHONE=62812345678
   ```

## 📱 File dan Route yang Dibuat

### Halaman Checkout
- **File**: `app/checkout/page.tsx`
- **Route**: `/checkout`
- **Fitur**:
  - Menampilkan keranjang dari localStorage
  - Form data pemesan dan alamat
  - Integrasi RajaOngkir real-time
  - Pilih kurir dan layanan
  - Tombol "Selesaikan Pesanan"

### API Route - Send WhatsApp
- **File**: `app/api/send-whatsapp/route.ts`
- **Endpoint**: `POST /api/send-whatsapp`
- **Request Body**:
  ```json
  {
    "phone_number": "08123456789",
    "message": "...",
    "kode_order": "#GDZ-123456"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Pesanan berhasil dikirim via WhatsApp",
    "kode_order": "#GDZ-123456",
    "message_id": "..."
  }
  ```

## 🔑 Konfigurasi RajaOngkir

- **Asal pengiriman (tetap)**: Kota Banjarbaru (ID: 92)
- **API Endpoint**: `https://api.rajaongkir.com/starter/`
- **API Key**: Sudah dikonfigurasi di `.env.local`
- **Kurva yang didukung**: JNE, TIKI, POS (dapat disesuaikan)

### Mengubah Asal Pengiriman

Jika ingin mengubah asal pengiriman dari Banjarbaru ke kota lain, edit file `app/checkout/page.tsx`:

```typescript
const ASAL_KOTA_ID = "92"; // Ubah ke ID kota yang diinginkan
```

Referensi ID kota dapat dilihat di [RajaOngkir Docs](https://rajaongkir.com/dokumentasi).

## 💾 Database Schema

Pesanan disimpan di tabel `pesanan` dengan struktur:
```sql
CREATE TABLE pesanan (
  id_pesanan uuid PRIMARY KEY,
  kode_order text UNIQUE,
  nama_pembeli text,
  nomor_wa text,
  total_harga numeric,
  status text,
  detail_produk jsonb,
  created_at timestamptz
);
```

Data tambahan dari checkout:
- `nomor_telepon`: Nomor telepon alternatif (opsional)
- `alamat`: Alamat lengkap
- `provinsi`: Provinsi tujuan
- `kota`: Kota tujuan
- `ongkir`: Biaya pengiriman
- `kurir`: Kode kurir (jne, tiki, pos)
- `layanan`: Nama layanan pengiriman
- `estimasi_hari`: Estimasi hari pengiriman

Jika diperlukan, update schema di Supabase sesuai kebutuhan.

## 🧪 Testing

### 1. Test Checkout Form
- Buka `/checkout`
- Isi form data pemesan (harus ada item di cart dulu)
- Pilih provinsi → otomatis load kota
- Pilih kota → otomatis load kurir
- Pilih layanan pengiriman
- Klik "Selesaikan Pesanan"

### 2. Test WhatsApp Integration
- Setup `WHATSAPP_API_*` env variables terlebih dahulu
- Lakukan checkout
- Periksa WhatsApp untuk menerima nota

### 3. Test RajaOngkir
- Buka browser DevTools → Network tab
- Lakukan request ke RajaOngkir API
- Verifikasi response ongkir

## 🐛 Troubleshooting

### Tidak bisa load provinsi/kota
- **Masalah**: API Key RajaOngkir tidak valid
- **Solusi**: Verifikasi `NEXT_PUBLIC_RAJAONGKIR_API_KEY` di `.env.local`

### WhatsApp tidak dikirim
- **Masalah**: Environment variable tidak dikonfigurasi
- **Solusi**: Tambahkan `WHATSAPP_API_*` ke `.env.local` dan restart dev server
- **Note**: Jika WhatsApp gagal, pesanan tetap tersimpan (tidak akan fail)

### Pesanan tidak tersimpan
- **Masalah**: Supabase tidak terkonfigurasi atau network error
- **Solusi**: 
  - Verifikasi Supabase credentials di `.env.local`
  - Check Supabase database connection
  - Lihat console error di `/api/checkout` response

### Nomor WhatsApp tidak valid
- **Format diterima**: `08xx`, `+62xx`, `62xx`
- **Auto-normalize**: Sistem otomatis mengubah ke format `62xx`

## 📝 Notes Penting

1. **Keranjang Belanja**: Data keranjang disimpan di `localStorage` dengan key `bygadiza_cart`
2. **Nota Format**: Nota menggunakan emoji dan format markdown untuk WhatsApp
3. **Security**: API Key RajaOngkir public-safe (gunakan starter/basic plan)
4. **Error Handling**: Jika WhatsApp gagal, pesanan tetap tersimpan ke database

## 🚀 Next Steps

Setelah setup:
1. ✅ Setup WhatsApp API di salah satu provider
2. ✅ Update `.env.local` dengan credentials
3. ✅ Restart dev server
4. ✅ Test di halaman checkout
5. ✅ Setup payment method (opsional)
6. ✅ Konfigurasi nomor admin untuk forward pesanan (opsional)

---

**Dibuat**: 2024
**Status**: Production Ready
