import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export async function POST(req: Request) {
  try {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    const body = await req.json();
    const { id_pesanan, status } = body;
    if (!id_pesanan || !status) {
      return NextResponse.json({ error: "Missing id_pesanan or status" }, { status: 400 });
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    const { data, error } = await supabaseAdmin.from("pesanan").update({ status }).eq("id_pesanan", id_pesanan).select();
    if (error) {
      console.error("Supabase update pesanan error:", error);
      return NextResponse.json({ error }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error("Unhandled error in /api/pesanan/update:", err);
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
