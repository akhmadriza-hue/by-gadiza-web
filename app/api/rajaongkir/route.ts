// Jalur: app/api/rajaongkir/route.ts
import { NextResponse } from "next/server";
import https from "https";

const RAJAONGKIR_API_KEY = 
  process.env.RAJAONGKIR_API_KEY || 
  process.env.NEXT_PUBLIC_RAJAONGKIR_API_KEY || 
  "";

export async function POST(request: Request) {
  try {
    console.log("=== API ROUTE RAJAONGKIR DIPANGGIL ===");
    
    if (!RAJAONGKIR_API_KEY) {
      return NextResponse.json({ error: "API Key RajaOngkir belum terkonfigurasi di file .env." }, { status: 500 });
    }

    const body = await request.json();
    const { action, origin, destination, weight, courier, provinceId } = body;

    if (action === "cost") {
      if (!origin || !destination || !weight || !courier) {
        return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });
      }
      return await handleCostRequest(
        origin.toString(),
        destination.toString(),
        weight.toString(),
        courier.toString()
      );
    }

    return NextResponse.json({ error: "Action tidak valid." }, { status: 400 });

  } catch (error: any) {
    console.error("Global API Route Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Fungsi tangguh menggunakan modul Native HTTPS Node.js untuk bypass bug Fetch di Windows
function requestRajaOngkirNative(singleCourier: string, origin: string, destination: string, weight: string): Promise<any> {
  return new Promise((resolve) => {
    const postData = new URLSearchParams({
      origin: origin,
      destination: destination,
      weight: weight,
      courier: singleCourier
    }).toString();

    const options = {
      hostname: 'api.rajaongkir.com',
      path: '/starter/cost',
      method: 'POST',
      headers: {
        'key': RAJAONGKIR_API_KEY.trim(),
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': 'application/json'
      },
      timeout: 6000 // Batasi timeout internal 6 detik agar tidak menggantung lama
    };

    console.log(`[Native HTTPS] Mengetuk server RajaOngkir untuk kurir: [${singleCourier}]...`);

    const req = https.request(options, (res) => {
      let dataChunks = '';

      res.on('data', (chunk) => {
        dataChunks += chunk;
      });

      res.on('end', () => {
        try {
          const parsedData = JSON.parse(dataChunks);
          if (parsedData.rajaongkir?.status?.code === 200 && parsedData.rajaongkir?.results?.length > 0) {
            console.log(`✅ [Native HTTPS] Kurir [${singleCourier}] BERHASIL.`);
            resolve(parsedData.rajaongkir.results);
          } else {
            console.warn(`⚠️ [Native HTTPS] Kurir [${singleCourier}] ditolak/kosong:`, parsedData.rajaongkir?.status?.description);
            resolve(null);
          }
        } catch (e) {
          console.error(`❌ [Native HTTPS] Gagal parsing JSON kurir [${singleCourier}]`);
          resolve(null);
        }
      });
    });

    req.on('error', (err) => {
      console.error(`❌ [Native HTTPS] Jaringan gagal total untuk kurir [${singleCourier}]:`, err.message);
      resolve(null);
    });

    req.on('timeout', () => {
      console.error(`❌ [Native HTTPS] Waktu habis (Timeout) untuk kurir [${singleCourier}]`);
      req.destroy();
      resolve(null);
    });

    // Kirim data payload form-url-encoded
    req.write(postData);
    req.end();
  });
}

async function handleCostRequest(origin: string, destination: string, weight: string, courier: string) {
  try {
    const courierList = courier.split(":").map(c => c.toLowerCase().trim()); 
    const allResults: any[] = [];

    // Fungsi pembantu untuk memberikan jeda waktu (delay) milidetik
    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    console.log(`[Sekuensial] Mulai memproses total ${courierList.length} kurir bergantian...`);

    // Menggunakan perulangan FOR-OF biasa agar berjalan BERURUTAN (Satu per satu), bukan paralel
    for (const singleCourier of courierList) {
      if (!singleCourier) continue;

      // Jalankan request native untuk satu kurir
      const result = await requestRajaOngkirNative(singleCourier, origin, destination, weight);
      
      if (result) {
        allResults.push(...result);
      }

      // Berikan jeda istirahat 350ms sebelum mengetuk kurir berikutnya agar tidak dicurigai sebagai BOT/DDOS
      console.log(`[Sekuensial] Memberikan jeda 350ms sebelum beralih dari [${singleCourier}]...`);
      await sleep(350);
    }

    // Jika seluruh kurir gagal merespons karena IP masih diblokir sementara oleh RajaOngkir
    if (allResults.length === 0) {
      return NextResponse.json({ 
        status: { code: 200 }, 
        results: [], 
        error: "Server RajaOngkir mendeteksi request terlalu cepat atau IP Anda dibatasi sementara. Silakan coba lagi beberapa saat atau gunakan pengiriman manual." 
      });
    }

    return NextResponse.json({ status: { code: 200 }, results: allResults });
  } catch (error) {
    console.error("Error pada handleCostRequest sekuensial:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}