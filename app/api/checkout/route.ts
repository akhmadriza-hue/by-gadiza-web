import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing Supabase env vars for server-side checkout: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

// API route: server-side checkout handler
// - Validates request payload and inserts a new order into `pesanan`
// - Uses the Supabase service role key for trusted database access
export async function POST(req: Request) {
  try {
    // Parse and validate the checkout payload from the client.
    const body = await req.json();
    const { nama_pembeli, nomor_whatsapp, alamat, total_harga, detail_produk } = body;

    if (!nama_pembeli || !nomor_whatsapp || !total_harga || !detail_produk) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server misconfiguration: missing Supabase keys" }, { status: 500 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Build the new order payload and insert it into the pesanan table.
    const kode_order = `#GDZ-${Date.now()}`;
    const insertPayload: any = {
      kode_order,
      nama_pembeli,
      nomor_whatsapp,
      alamat,
      total_harga,
      status: "pending",
      detail_produk,
    };

    const insertRes = await supabaseAdmin.from("pesanan").insert(insertPayload);

    if (insertRes.error) {
      console.error("Supabase insert error (server):", insertRes.error);
      return NextResponse.json(
        {
          success: false,
          error: insertRes.error.message ?? "Gagal menyimpan pesanan ke database.",
          details: insertRes.error.details,
          hint: insertRes.error.hint,
          code: insertRes.error.code,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, kode_order });
  } catch (err: any) {
    console.error("Unhandled error in /api/checkout:", err);
    return NextResponse.json(
      {
        success: false,
        error: err?.message ?? String(err),
        details: err?.details,
        hint: err?.hint,
      },
      { status: 500 }
    );
  }
}
