"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PRODUCT_TABLE, getProductName, getProductImage } from "@/lib/productTable";

export default function AdminProductsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<any>({ nama: "", harga: "", stok: "", deskripsi: "", foto_file: null, foto_url: "" });
  const [editingId, setEditingId] = useState<any>(null);
  const [editingKey, setEditingKey] = useState<string | null>("id");
  const [editingKeyValue, setEditingKeyValue] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const ADMIN_PASSWORD = "adminGadiza2026";
    const stored = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;
    if (stored === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
    } else {
      const pw = prompt("Masukkan Password Admin:");
      if (pw === ADMIN_PASSWORD) {
        localStorage.setItem("admin_session", ADMIN_PASSWORD);
        setIsAuthenticated(true);
      } else {
        alert("Akses Ditolak!");
        router.push("/");
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from(PRODUCT_TABLE).select("*").order("id", { ascending: false });
      console.log("Daftar isi object data yang diterima:", data);
      if (error) console.error("Supabase fetch produk error:", error);
      if (mounted) setProducts(data ?? []);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  function openNew() {
    setForm({ nama: "", harga: "", stok: "", deskripsi: "", foto_file: null, foto_url: "" });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(product: any) {
    // detect primary key name and value from product object
    const pkCandidates = ["id", "id_produk", "id_product", "product_id", "id_pesanan", "id_p"];
    let detectedKey: string | null = null;
    // prefer common custom keys first
    if (product && typeof product === "object") {
      if ("id_produk" in product) detectedKey = "id_produk";
      else if ("product_id" in product) detectedKey = "product_id";
      else if ("id" in product) detectedKey = "id";
      else {
        for (const k of pkCandidates) {
          if (product[k] !== undefined && product[k] !== null) { detectedKey = k; break; }
        }
      }
    }
    const detectedVal = detectedKey ? product[detectedKey] : (product.id ?? null);
    setEditingKey(detectedKey);
    setEditingKeyValue(detectedVal);
    setEditingId(detectedVal);
    setForm({
      nama: getProductName(product),
      harga: String(product.harga ?? ""),
      stok: String(product.stok ?? ""),
      deskripsi: product.deskripsi ?? "",
      foto_file: null,
      foto_url: getProductImage(product),
    });
    setModalOpen(true);
  }

  async function uploadFile(file: File) {
    const fileName = `produk-${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "-")}`;
    const filePath = `foto-produk/${fileName}`;
    const uploadRes = await supabase.storage.from("foto-produk").upload(filePath, file, { cacheControl: "3600", upsert: false });
    if (uploadRes.error) throw uploadRes.error;
    const publicUrlRes = await supabase.storage.from("foto-produk").getPublicUrl(filePath);
    return publicUrlRes.data?.publicUrl ?? "";
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.nama || String(form.nama).trim() === "") { alert("Nama wajib diisi"); return; }
    setSaving(true);
    try {
      let imageUrl = form.foto_url || "";
      if (form.foto_file instanceof File) {
        imageUrl = await uploadFile(form.foto_file);
      }
      const payload: any = {
        nama_produk: form.nama.trim(),
        harga: Number(form.harga) || 0,
        stok: Number(form.stok) || 0,
        deskripsi: form.deskripsi?.trim() || "",
        foto_url: imageUrl,
      };

      if (editingKeyValue != null) {
        // use detected primary key if available
        const pk = editingKey || "id";
        const pkVal = editingKeyValue;
        const { error } = await supabase.from(PRODUCT_TABLE).update(payload).eq(pk, pkVal);
        if (error) throw error;
        setProducts((prev) => prev.map((p) => ((p[pk] === pkVal) ? { ...p, ...payload } : p)));
        alert("Produk berhasil diperbarui.");
      } else {
        const { data, error } = await supabase.from(PRODUCT_TABLE).insert(payload).select().single();
        if (error) throw error;
        setProducts((prev) => [data ?? payload, ...prev]);
        alert("Produk baru berhasil ditambahkan.");
      }

      setModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error("Supabase save produk error:", err);
      alert(`Gagal menyimpan produk: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`);
    } finally { setSaving(false); }
  }

  async function handleDelete(productOrId: any) {
    // accept either a product object or an id
    const product = typeof productOrId === "object" ? productOrId : null;
    const id = product ? null : productOrId;
    const pkCandidates = ["id", "id_produk", "id_product", "product_id", "id_pesanan", "id_p"];
    let pk: string | null = null;
    let pkVal: any = null;

    // log product for debugging available identifier properties
    if (product) console.log("handleDelete - product:", product);

    if (product) {
      // prefer explicit custom columns
      if ("id_produk" in product) { pk = "id_produk"; pkVal = product[pk]; }
      else if ("product_id" in product) { pk = "product_id"; pkVal = product[pk]; }
      else if ("id" in product) { pk = "id"; pkVal = product[pk]; }
      else {
        for (const k of pkCandidates) {
          if (product[k] !== undefined && product[k] !== null) { pk = k; pkVal = product[k]; break; }
        }
        if (!pk) { pk = "id"; pkVal = product.id ?? null; }
      }
    } else {
      pk = "id"; pkVal = id;
    }

    const ok = confirm("Yakin ingin menghapus produk ini?");
    if (!ok) return;

    setDeletingIds((s) => ({ ...s, [String(pkVal)]: true }));
    try {
      // send delete request to Supabase
      console.log(`handleDelete - deleting ${pk}=${pkVal}`);
      const { error } = await supabase.from(PRODUCT_TABLE).delete().eq(pk, pkVal);
      if (error) throw error;
      
      // Optimistic update: remove from UI immediately after successful delete request
      // (regardless of RLS restrictions or rows affected)
      console.log(`handleDelete - delete request completed successfully for ${pk}=${pkVal}, updating UI optimistically`);
      setProducts((prev) => prev.filter((p) => p[pk] !== pkVal));
      alert("Produk dihapus.");
      router.refresh();
    } catch (err: any) {
      console.error("Supabase delete produk error:", err);
      alert(`Gagal menghapus produk: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`);
    } finally {
      setDeletingIds((s) => { const c = { ...s }; delete c[String(pkVal)]; return c; });
    }
  }

  if (!isAuthenticated) return null;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard Admin Produk</h1>
          <p className="mt-2 text-sm text-slate-600">Kelola daftar produk, stok, dan informasi produk secara real-time.</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white">+ Tambah Produk Baru</button>
      </div>

      {loading ? <div className="rounded-3xl border p-8">Memuat daftar produk...</div> : (
        <div className="overflow-hidden rounded-3xl border bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3">Nama</th>
                <th className="px-4 py-3">Harga</th>
                <th className="px-4 py-3">Stok</th>
                <th className="px-4 py-3">Deskripsi</th>
                <th className="px-4 py-3">Foto</th>
                <th className="px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const productKey = p.id ?? p.id_produk ?? p.id_product ?? p.product_id ?? p.id_pesanan ?? p.id_p ?? p.id;
                const deleting = !!deletingIds[String(productKey)];
                return (
                  <tr key={String(productKey)} className="border-t hover:bg-slate-50">
                    <td className="px-4 py-3 align-top">{getProductName(p)}</td>
                    <td className="px-4 py-3">Rp {Number(p.harga || 0).toLocaleString("id-ID")}</td>
                    <td className="px-4 py-3">{p.stok ?? 0}</td>
                    <td className="px-4 py-3 max-w-xl break-words">{p.deskripsi ?? "-"}</td>
                    <td className="px-4 py-3">
                      {getProductImage(p) ? <img src={getProductImage(p)} alt={getProductName(p)} className="h-16 w-16 rounded-xl object-cover" /> : <span className="text-xs text-slate-400">Tidak ada</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(p)} className="rounded-full border px-3 py-2 text-sm">Edit</button>
                        <button onClick={() => handleDelete(p)} disabled={deleting} className="rounded-full border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700">{deleting ? "..." : "Hapus"}</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-6">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{editingId ? "Edit Produk" : "Tambah Produk Baru"}</h2>
              <button onClick={() => setModalOpen(false)} className="px-3 py-2 rounded-full border">Tutup</button>
            </div>
            <form onSubmit={handleSave} className="grid gap-4">
              <label>
                <span className="text-sm font-medium">Nama Produk</span>
                <input value={form.nama} onChange={(e) => setForm((s:any)=>({...s, nama: e.target.value}))} className="mt-2 w-full rounded-xl border px-4 py-3" required />
              </label>
              <div className="grid sm:grid-cols-2 gap-4">
                <label>
                  <span className="text-sm font-medium">Harga</span>
                  <input type="number" value={form.harga} onChange={(e) => setForm((s:any)=>({...s, harga: e.target.value}))} className="mt-2 w-full rounded-xl border px-4 py-3" />
                </label>
                <label>
                  <span className="text-sm font-medium">Stok</span>
                  <input type="number" value={form.stok} onChange={(e) => setForm((s:any)=>({...s, stok: e.target.value}))} className="mt-2 w-full rounded-xl border px-4 py-3" />
                </label>
              </div>
              <label>
                <span className="text-sm font-medium">Deskripsi</span>
                <textarea value={form.deskripsi} onChange={(e)=>setForm((s:any)=>({...s, deskripsi: e.target.value}))} className="mt-2 w-full rounded-xl border px-4 py-3" />
              </label>
              <label>
                <span className="text-sm font-medium">Unggah Foto (opsional)</span>
                <input type="file" accept="image/*" onChange={(e)=>setForm((s:any)=>({...s, foto_file: e.target.files && e.target.files[0] ? e.target.files[0] : null }))} className="mt-2 w-full" />
                {form.foto_url ? <img src={form.foto_url} alt="preview" className="mt-3 h-24 w-24 object-cover rounded-md" /> : null}
              </label>

              <div className="flex justify-end gap-3">
                <button type="button" onClick={()=>setModalOpen(false)} className="rounded-full border px-5 py-3">Batal</button>
                <button type="submit" disabled={saving} className="rounded-full bg-rose-600 px-5 py-3 text-white">{saving ? "Menyimpan..." : "Simpan"}</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
