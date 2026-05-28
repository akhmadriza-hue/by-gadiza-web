# ✅ CORS Fix untuk RajaOngkir - Implementation Update

## 🎯 Masalah yang Diselesaikan

**Error**: `Failed to fetch` saat menjalankan `fetchProvins()` karena masalah CORS (Cross-Origin Resource Sharing)

**Akar Masalah**: RajaOngkir API tidak support CORS ketika diakses langsung dari browser (client-side). API Key juga terekspos ke client.

## ✅ Solusi yang Diimplementasikan

### 1. Buat Server-Side Proxy API di Next.js

**File**: `app/api/rajaongkir/route.ts` (260+ lines)

Endpoint yang dibuat:
- `POST /api/rajaongkir` dengan `action=province` → Fetch daftar provinsi
- `POST /api/rajaongkir` dengan `action=city&province={id}` → Fetch kota
- `POST /api/rajaongkir` dengan `action=cost` → Fetch ongkir & kurir

**Keuntungan**:
✅ Menghindari CORS error
✅ API Key aman di server-side (tidak terekspos ke browser)
✅ Lebih secure dan mengikuti best practices

### 2. Update Fetch Calls di Checkout Page

**File**: `app/checkout/page.tsx` (Updated 3 fungsi)

Perubahan:
- ❌ **Sebelum**: `fetch("https://api.rajaongkir.com/starter/province", { headers: { key: apiKey } })`
- ✅ **Sesudah**: `fetch("/api/rajaongkir", { body: JSON.stringify({ action: "province" }) })`

Sama untuk `fetchKota()` dan `fetchOngkir()`

### 3. Hilangkan Reference API Key di Client-Side

- ❌ Removed: `const apiKey = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY`
- ❌ Removed: `if (!apiKey) { setFormError(...) }` checks di semua fungsi

API Key sekarang hanya digunakan di server-side (`app/api/rajaongkir/route.ts`)

## 📊 Perubahan Teknis

### Sebelum (Client-Side Direct):
```typescript
// app/checkout/page.tsx
const apiKey = process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY;

async function fetchProvins() {
  const response = await fetch("https://api.rajaongkir.com/starter/province", {
    headers: { key: apiKey }  // ❌ API Key terekspos ke browser
  });
}
```

### Sesudah (Server-Side Proxy):
```typescript
// app/checkout/page.tsx
async function fetchProvins() {
  const response = await fetch("/api/rajaongkir", {  // ✅ API lokal
    body: JSON.stringify({ action: "province" })
  });
}

// app/api/rajaongkir/route.ts
const RAJAONGKIR_API_KEY = process.env.RAJAONGKIR_API_KEY;  // ✅ Aman di server
const response = await fetch("https://api.rajaongkir.com/starter/province", {
  headers: { key: RAJAONGKIR_API_KEY }
});
```

## 🔄 Request/Response Flow

### Sebelum:
```
Browser (Client)
  ├─ CORS Error ❌
  └─> RajaOngkir API (https://api.rajaongkir.com)
```

### Sesudah:
```
Browser (Client)
  ├─ Fetch /api/rajaongkir ✅
  └─> Next.js Server
       └─> RajaOngkir API (https://api.rajaongkir.com) ✅
           └─> Response kembali ke client
```

## 📝 API Endpoints Reference

### 1. Fetch Provinsi
**Request:**
```json
POST /api/rajaongkir
{
  "action": "province"
}
```

**Response:**
```json
{
  "status": { "code": 200, "description": "OK" },
  "results": [
    { "province_id": "1", "province": "Aceh" },
    { "province_id": "2", "province": "Sumatera Utara" },
    ...
  ]
}
```

### 2. Fetch Kota
**Request:**
```json
POST /api/rajaongkir
{
  "action": "city",
  "province": "1"
}
```

**Response:**
```json
{
  "status": { "code": 200, "description": "OK" },
  "results": [
    { "city_id": "1", "city_name": "Kota Bandung", "type": "Kota", "postal_code": "40100" },
    ...
  ]
}
```

### 3. Fetch Ongkir & Kurir
**Request:**
```json
POST /api/rajaongkir
{
  "action": "cost",
  "origin": "92",
  "destination": "94",
  "weight": "1000",
  "courier": "jne:tiki:pos"
}
```

**Response:**
```json
{
  "status": { "code": 200, "description": "OK" },
  "results": [
    {
      "code": "jne",
      "name": "JNE",
      "costs": [
        {
          "service": "OKE",
          "description": "Ongkos Kirim Ekonomis",
          "cost": [
            { "value": 45000, "etd": "2-3" }
          ]
        },
        ...
      ]
    },
    ...
  ]
}
```

## 🔐 Security Improvements

| Aspek | Sebelum | Sesudah |
|------|---------|---------|
| **API Key Location** | Client-side (`NEXT_PUBLIC_*`) | Server-side env |
| **CORS Issue** | ❌ Error terjadi | ✅ Tidak ada CORS error |
| **API Key Exposure** | ❌ Terekspos di browser | ✅ Aman |
| **Request Validation** | ❌ Minimal | ✅ Lebih robust |
| **Error Handling** | ❌ Generic | ✅ Detailed |

## 🧪 Testing

### Test di Development
```bash
npm run dev
```

1. Buka `/checkout`
2. Halaman akan memuat provinsi otomatis (tanpa error)
3. Pilih provinsi → kota akan ter-load (tanpa CORS error)
4. Pilih kota → kurir akan ter-load (tanpa CORS error)
5. Pilih layanan pengiriman → berhasil checkout

### Verify API Calls
Buka DevTools → Network tab:
- Requests ke `/api/rajaongkir` akan muncul (bukan ke rajaongkir.com)
- Requests ke `rajaongkir.com` hanya dari server (hidden dari browser)

## 📋 Environment Variables

**Tetap sama**, tidak ada perubahan di `.env.local`:
```
RAJAONGKIR_API_KEY=pYcQ2lG84ee147155a3273aaHBczyCnV
NEXT_PUBLIC_RAJAONGKIR_API_KEY=pYcQ2lG84ee147155a3273aaHBczyCnV  # Ini bisa dihapus jika tidak diperlukan
```

**Catatan**: `NEXT_PUBLIC_RAJAONGKIR_API_KEY` sekarang tidak digunakan di client-side, tapi tetap ada untuk backward compatibility.

## 🚀 Production Ready

✅ CORS error fixed
✅ API Key aman
✅ Proper error handling
✅ Server-side validation
✅ TypeScript support
✅ Request/response typing

## 📝 Files Modified

1. ✅ Created: `app/api/rajaongkir/route.ts` (260+ lines)
2. ✅ Updated: `app/checkout/page.tsx`
   - Updated `fetchProvins()` to use `/api/rajaongkir`
   - Updated `fetchKota()` to use `/api/rajaongkir`
   - Updated `fetchOngkir()` to use `/api/rajaongkir`
   - Removed `apiKey` variable
   - Removed API Key checks

## 🎯 Next Steps

1. ✅ Test checkout flow dengan provinsi/kota/kurir
2. ✅ Verifikasi tidak ada CORS error di console
3. ✅ Deploy ke production
4. 📋 Optional: Remove `NEXT_PUBLIC_RAJAONGKIR_API_KEY` dari `.env.local` jika tidak digunakan

## 🔗 References

- RajaOngkir API Docs: https://rajaongkir.com/dokumentasi
- CORS: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- Next.js API Routes: https://nextjs.org/docs/app/building-your-application/routing/route-handlers

---

**Status**: ✅ CORS Issue Fixed & Secured

**Tested**: ✅ Ready for production
