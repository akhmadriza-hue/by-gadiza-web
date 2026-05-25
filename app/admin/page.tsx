"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PRODUCT_TABLE } from "@/lib/productTable";

export default function AdminPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFeedback(null);
    setIsSaving(true);

    const formData = new FormData(event.currentTarget);
    const nama = (formData.get("nama") as string)?.trim() ?? "";
    const hargaRaw = (formData.get("harga") as string)?.trim() ?? "";
    const kategori = (formData.get("kategori") as string)?.trim() ?? "";
    const deskripsi = (formData.get("deskripsi") as string)?.trim() ?? "";
    const fotoFile = formData.get("foto");

    if (!nama || !hargaRaw || !kategori || !deskripsi || !(fotoFile instanceof File)) {
      setFeedback({ type: "error", message: "Lengkapi semua kolom produk dan unggah file gambar terlebih dahulu." });
      setIsSaving(false);
      return;
    }

    const harga = Number(hargaRaw.replace(/[^0-9]/g, ""));
    if (!Number.isFinite(harga) || harga <= 0) {
      setFeedback({ type: "error", message: "Harga harus diisi dengan angka valid." });
      setIsSaving(false);
      return;
    }

    const fileName = `produk-${Date.now()}-${fotoFile.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const filePath = `foto-produk/${fileName}`;

    try {
      // upload file to Supabase Storage
      const uploadRes = await supabase.storage.from("foto-produk").upload(filePath, fotoFile, {
        cacheControl: "3600",
        upsert: false,
      });
      console.info("Supabase upload result:", uploadRes);

      if (uploadRes?.error) {
        // throw the error object from Supabase (may be PostgrestError-like)
        throw uploadRes.error;
      }

      const publicUrlRes = await supabase.storage.from("foto-produk").getPublicUrl(filePath);
      console.info("Supabase getPublicUrl result:", publicUrlRes);
      const publicUrl = publicUrlRes?.data?.publicUrl ?? "";
      if (!publicUrl) {
        throw new Error("Gagal membuat public URL untuk gambar.");
      }
      const insertRes = await supabase.from(PRODUCT_TABLE).insert({
        nama_produk: nama,
        deskripsi: deskripsi,
        harga: harga,
        foto_url: publicUrl,
        kategori: kategori,
        tipe_produk: "fisik",
      });
      console.info("Supabase insert result:", insertRes);
      if (insertRes?.error) {
        throw insertRes.error;
      }

      setFeedback({ type: "success", message: "Produk berhasil disimpan ke database." });
      try {
        const form = event?.currentTarget as HTMLFormElement | null;
        if (form && typeof form.reset === "function") {
          form.reset();
        } else {
          // Fallback: try to find a nearby form element and reset it safely
          const el = document.querySelector("form");
          if (el instanceof HTMLFormElement) el.reset();
        }
      } catch (resetErr) {
        console.warn("Gagal mereset form otomatis:", resetErr);
      }

      try {
        router.push("/");
      } catch (navErr) {
        console.warn("Gagal navigasi setelah menyimpan produk:", navErr);
      }
    } catch (error: any) {
      console.error("=== DETAIL ERROR LENGKAP ===");
      console.error("Pesan Error:", error?.message || error);
      console.error("Error Name:", error?.name);
      console.error("Error Stack:", error?.stack);
      console.error("Detail Error:", error?.details);
      console.error("Hint/Petunjuk:", error?.hint);
      console.error("Objek Error Utuh:", error);
      console.error("Typeof error:", typeof error);
      console.error("Is instance of Error:", error instanceof Error);
      try {
        console.error("Own Property Names:", Object.getOwnPropertyNames(error || {}));
      } catch (e) {
        console.error("Gagal ambil property names:", e);
      }
      // safe stringify (handles non-enumerable props)
      try {
        console.error("Stringified (own props):", JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      } catch (stringifyErr) {
        console.error("Gagal stringify error:", stringifyErr);
      }
      // Jika error berasal dari response Supabase, print semua kunci
      if (error && typeof error === "object") {
        for (const key in error) {
          // @ts-ignore
          console.error(`Key [${key}]:`, error[key]);
        }
      }
      // Helpful hint for next step
      console.info("Jika memungkinkan, juga kirim baris yang dimulai dengan: 'Supabase upload result:', 'Supabase getPublicUrl result:', 'Supabase insert result:'");
      alert("Gagal menyimpan produk. Silakan cek Console Inspect dan kirimkan log lengkap.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f2eb] text-slate-900">
      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-10 rounded-[2rem] border border-slate-200/70 bg-white/90 p-8 shadow-[0_25px_80px_-50px_rgba(15,23,42,0.35)] backdrop-blur-xl sm:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-rose-600">Admin By Gadiza</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">Tambah Produk Baru</h1>
              <p className="mt-4 text-base leading-7 text-slate-600">
                Gunakan formulir ini untuk menambahkan produk baru ke katalog. Isian gambar akan diupload ke Supabase Storage dan URL akan disimpan ke tabel produk.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="mb-6 text-2xl font-semibold text-slate-900">Form Produk</h2>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid gap-6 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Nama Produk</span>
                <input
                  type="text"
                  name="nama"
                  placeholder="Contoh: Gelang Anyaman Cantik"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Harga</span>
                <input
                  type="text"
                  name="harga"
                  placeholder="Contoh: 75000"
                  className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Kategori Produk</span>
              <input
                type="text"
                name="kategori"
                placeholder="Contoh: Gelang, Kalung, Aksesoris, Pakaian, dll"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Deskripsi</span>
              <textarea
                name="deskripsi"
                rows={5}
                placeholder="Deskripsi singkat produk akan tampil di sini..."
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Unggah Foto</span>
              <input
                type="file"
                name="foto"
                accept="image/*"
                className="mt-2 block w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 shadow-sm transition file:mr-4 file:rounded-full file:border-0 file:bg-rose-600 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-rose-700 focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-100"
              />
            </label>

            {feedback ? (
              <div className={`rounded-2xl px-4 py-3 text-sm ${feedback.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {feedback.message}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">Formulir ini tersambung ke Supabase dan menyimpan produk baru langsung ke database.</p>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center justify-center rounded-full bg-rose-600 px-6 py-3 text-sm font-semibold text-white transition duration-300 hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-rose-300"
              >
                {isSaving ? "Menyimpan..." : "Simpan Produk"}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
