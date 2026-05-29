// Jalur: app/api/rajaongkir/route.ts
import { NextResponse } from "next/server";

const BITESHIP_API_KEY = process.env.BITESHIP_API_KEY || "";

// DATA SIMULASI (MOCK DATA) UNTUK BYPASS LIMITASI SANDBOX BITESHIP DI LUAR JABODETABEK
const MOCK_COURIER_DATA = [
  {
    code: "jne",
    name: "Jalur Nugraha Ekakurir (JNE)",
    costs: [
      {
        service: "reg",
        description: "JNE Reguler Service",
        cost: [{ value: 36000, etd: "2-3 hari", note: "" }]
      },
      {
        service: "oke",
        description: "JNE Ongkos Kirim Ekonomis",
        cost: [{ value: 29000, etd: "4-5 hari", note: "" }]
      }
    ]
  },
  {
    code: "jnt",
    name: "J&T Express",
    costs: [
      {
        service: "ez",
        description: "J&T Regular Service",
        cost: [{ value: 34000, etd: "2-3 hari", note: "" }]
      }
    ]
  },
  {
    code: "pos",
    name: "POS Indonesia",
    costs: [
      {
        service: "pos reguler",
        description: "POS Kilat Khusus",
        cost: [{ value: 31000, etd: "3-4 hari", note: "" }]
      }
    ]
  }
];

// Helper function dengan Ekstraksi ID Kota (DI-PERTAHANKAN)
async function getBiteShipAreaId(areaName: string): Promise<string | null> {
  const searchArea = async (searchTerm: string) => {
    try {
      console.log(`    🔍 [BiteShip Search] Mencari: "${searchTerm}"`);
      const response = await fetch(
        `https://api.biteship.com/v1/maps/areas?countries=ID&type=administrative&input=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${BITESHIP_API_KEY.trim()}`,
            "Content-Type": "application/json",
          },
        }
      );
      
      if (!response.ok) {
        console.error(`    ❌ [BiteShip Search] API Error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (data.areas && data.areas.length > 0) {
        // --- STRATEGI 1: Filter Berdasarkan Dokumentasi Resmi ---
        const cityLevelCandidates = data.areas.filter((a: any) => !a.administrative_division_level_3_name);

        if (cityLevelCandidates.length > 0) {
            const cleanTerm = searchTerm.replace(/^(Kota|Kabupaten)\s+/i, "").trim();
            const match = cityLevelCandidates.find((a: any) => a.name.toLowerCase().includes(cleanTerm.toLowerCase()));
            const selected = match || cityLevelCandidates[0];
            
            console.log(`    ✅ [Dokumentasi Resmi] Ditemukan Kota/Kab: ${selected.name} (ID: ${selected.id})`);
            return selected.id;
        }
        
        // --- STRATEGI 2: Fallback ID Extraction ---
        console.log(`    ⚠️ [Fallback] API hanya mengembalikan data Kecamatan. Mengekstrak ID Kota...`);
        const firstResult = data.areas[0];
        const rawId = firstResult.id;

        if (rawId.includes("IDND")) {
            const extractedCityId = rawId.substring(0, rawId.indexOf("IDND"));
            console.log(`    ✅ [Ekstraksi ID] Kota ID: ${extractedCityId} (Dari Kecamatan: ${firstResult.administrative_division_level_3_name})`);
            return extractedCityId;
        }
        
        console.log(`    ⚠️ Menggunakan ID mentah karena format tidak dikenali: ${rawId}`);
        return rawId;
      }
      return null;
    } catch (error) {
      console.error(`    ⚠️ [BiteShip Search] Fetch Error untuk "${searchTerm}":`, error);
      return null;
    }
  };

  let areaId = await searchArea(areaName);
  
  if (!areaId) {
    const cleanName = areaName.replace(/^(Kota|Kabupaten)\s+/i, "").trim();
    if (cleanName !== areaName) {
      console.log(`    🔄 [BiteShip Search] Gagal dengan nama asli, mencoba nama bersih: "${cleanName}"`);
      areaId = await searchArea(cleanName);
    }
  }

  return areaId;
}

export async function POST(request: Request) {
  try {
    console.log("=== API ROUTE MURNI BITESHIP (RATES) DIPANGGIL ===");

    if (!BITESHIP_API_KEY) {
      return NextResponse.json(
        { error: "API Key BiteShip belum terkonfigurasi di file .env." },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { action, origin, originName, destinationName, weight, courier } = body;

    if (action !== "cost" || !originName || !destinationName || !weight || !courier) {
      return NextResponse.json({ error: "Parameter tidak lengkap." }, { status: 400 });
    }

    console.log(`\n📦 [BiteShip] Memulai Resolusi Area...`);
    console.log(`📍 Asal: "${originName}"`);
    console.log(`🏁 Tujuan: "${destinationName}"`);

    const finalOriginAreaId = await getBiteShipAreaId(originName);
    
    if (!finalOriginAreaId) {
      console.error(`❌ Gagal Resolusi: Area Asal.`);
      return NextResponse.json(
        { error: `Area asal "${originName}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    const finalDestinationAreaId = await getBiteShipAreaId(destinationName);

    if (!finalDestinationAreaId) {
      console.error(`❌ Gagal Resolusi: Area Tujuan.`);
      return NextResponse.json(
        { error: `Area tujuan "${destinationName}" tidak ditemukan.` },
        { status: 404 }
      );
    }

    console.log(`🚀 [BiteShip] ID Asal: ${finalOriginAreaId} | ID Tujuan: ${finalDestinationAreaId}`);
    console.log(`📡 [BiteShip] Menghitung Tarif...`);

    const couriersArray = courier.split(":").map((c: string) => c.toLowerCase().trim()).filter(Boolean);

    const ratesPayload = {
      origin_area_id: finalOriginAreaId,
      destination_area_id: finalDestinationAreaId,
      couriers: couriersArray.join(","), 
      items: [
        {
          name: "Paket Produk Gadiza",
          description: "Pakaian / Aksesoris",
          value: 100000, 
          weight: parseInt(weight) || 1000, 
          quantity: 1,
          length: 10, 
          width: 10, 
          height: 10
        }
      ]
    };

    const ratesResponse = await fetch("https://api.biteship.com/v1/rates/couriers", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${BITESHIP_API_KEY.trim()}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(ratesPayload)
    });

    const ratesData = await ratesResponse.json();

    // --- BAGIAN PENANGANAN ERROR / INTERSEPSI MOCK DATA ---
    if (!ratesResponse.ok || !ratesData.success) {
      console.error("❌ Kueri ke API Rates BiteShip Gagal:", ratesData);
      
      // Jika dalam mode development lokal, aktifkan trik data tiruan
      if (process.env.NODE_ENV === "development") {
        console.log("💡 [Trik Mock] Mode Lokal Terdeteksi. Mengembalikan Tarif Simulasi agar Checkout Tidak Macet...");
        return NextResponse.json({ 
          status: { code: 200 }, 
          results: MOCK_COURIER_DATA 
        });
      }

      // Jika di production, kirim error asli ke user
      return NextResponse.json({ error: ratesData.error || "Gagal mengambil tarif dari BiteShip." }, { status: ratesResponse.status });
    }

    // Jika API BiteShip Sukses Terpanggil (Misal nanti Akun Anda sudah di-approve)
    const formattedResults = couriersArray.map((cr: string) => {
      const courierPricings = ratesData.pricing.filter((p: any) => p.company === cr);
      
      return {
        code: cr,
        name: cr.toUpperCase(),
        costs: courierPricings.map((p: any) => ({
          service: p.type, 
          description: p.name, 
          cost: [
            {
              value: p.price, 
              etd: p.duration, 
              note: ""
            }
          ]
        }))
      };
    });

    console.log("✅ [BiteShip] Sukses mengambil tarif asli.");
    return NextResponse.json({ status: { code: 200 }, results: formattedResults });

  } catch (error: any) {
    console.error("Global API Route Error (BiteShip):", error);
    
    // Fallback darurat di localhost jika seluruh blok try hancur/crash
    if (process.env.NODE_ENV === "development") {
      return NextResponse.json({ status: { code: 200 }, results: MOCK_COURIER_DATA });
    }
    
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}