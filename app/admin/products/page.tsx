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
  const [form, setForm] = useState<any>({ nama: "", harga: "", stok: "", deskripsi: "", kategori: "", foto_file: null, foto_url: "" });
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
      if (error) console.error("Supabase fetch produk error:", error);
      if (mounted) setProducts(data ?? []);
      setLoading(false);
    }
    load();
    return () => { mounted = false; };
  }, [isAuthenticated]);

  function openNew() {
    setForm({ nama: "", harga: "", stok: "", deskripsi: "", kategori: "", foto_file: null, foto_url: "" });
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(product: any) {
    const pkCandidates = ["id", "id_produk", "id_product", "product_id", "id_pesanan", "id_p"];
    let detectedKey: string | null = null;
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
      kategori: product.kategori ?? "",
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
      if (form.foto_file instanceof File) imageUrl = await uploadFile(form.foto_file);
      const payload: any = {
        nama_produk: form.nama.trim(),
        harga: Number(form.harga) || 0,
        stok: Number(form.stok) || 0,
        deskripsi: form.deskripsi?.trim() || "",
        kategori: form.kategori?.trim() || "",
        foto_url: imageUrl,
      };
      if (editingKeyValue != null) {
        const pk = editingKey || "id";
        const { error } = await supabase.from(PRODUCT_TABLE).update(payload).eq(pk, editingKeyValue);
        if (error) throw error;
        setProducts((prev) => prev.map((p) => (p[pk] === editingKeyValue ? { ...p, ...payload } : p)));
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
      alert(`Gagal menyimpan produk: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`);
    } finally { setSaving(false); }
  }

  async function handleDelete(product: any) {
    const pkCandidates = ["id", "id_produk", "id_product", "product_id", "id_pesanan", "id_p"];
    let pk = "id";
    let pkVal: any = null;
    if ("id_produk" in product) { pk = "id_produk"; pkVal = product[pk]; }
    else if ("product_id" in product) { pk = "product_id"; pkVal = product[pk]; }
    else if ("id" in product) { pk = "id"; pkVal = product[pk]; }
    else {
      for (const k of pkCandidates) {
        if (product[k] !== undefined) { pk = k; pkVal = product[k]; break; }
      }
    }
    if (!confirm("Yakin ingin menghapus produk ini?")) return;
    setDeletingIds((s) => ({ ...s, [String(pkVal)]: true }));
    try {
      const { error } = await supabase.from(PRODUCT_TABLE).delete().eq(pk, pkVal);
      if (error) throw error;
      setProducts((prev) => prev.filter((p) => p[pk] !== pkVal));
      alert("Produk dihapus.");
      router.refresh();
    } catch (err: any) {
      alert(`Gagal menghapus: ${JSON.stringify(err, Object.getOwnPropertyNames(err), 2)}`);
    } finally {
      setDeletingIds((s) => { const c = { ...s }; delete c[String(pkVal)]; return c; });
    }
  }

  if (!isAuthenticated) return null;

  return (
    <>
      {/* Media query — tidak bergantung Tailwind sama sekali */}
      <style>{`
        .bg-admin-desktop { display: block; }
        .bg-admin-mobile  { display: none;  }
        @media (max-width: 639px) {
          .bg-admin-desktop { display: none;  }
          .bg-admin-mobile  { display: flex; flex-direction: column; gap: 16px; }
        }
      `}</style>

      <main className="mx-auto max-w-6xl px-4 py-10">

        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Admin Produk</h1>
            <p className="mt-1 text-sm text-slate-500">Kelola produk, stok, dan foto secara real-time.</p>
          </div>
          <button
            onClick={openNew}
            className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 transition"
          >
            + Tambah Produk
          </button>
        </div>

        {loading ? (
          <div className="rounded-3xl border p-8 text-center text-slate-400">Memuat daftar produk...</div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border p-8 text-center text-slate-400">Belum ada produk.</div>
        ) : (
          <>
            {/* ── DESKTOP: Tabel compact ── */}
            <div className="bg-admin-desktop" style={{ overflowX: "auto", borderRadius: "16px", border: "1px solid #e2e8f0", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.06)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", tableLayout: "fixed" }}>
                <colgroup>
                  <col style={{ width: "52px" }} />
                  <col />
                  <col style={{ width: "130px" }} />
                  <col style={{ width: "60px" }} />
                  <col style={{ width: "150px" }} />
                </colgroup>
                <thead style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                  <tr>
                    {["Foto", "Nama Produk", "Harga", "Stok", "Aksi"].map((h, i) => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: i >= 3 ? "center" : "left", fontSize: "11px", color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: ".05em" }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const pk = "id_produk" in p ? "id_produk" : "product_id" in p ? "product_id" : "id";
                    const pkVal = p[pk] ?? p.id;
                    const deleting = !!deletingIds[String(pkVal)];
                    return (
                      <tr key={String(pkVal)} style={{ borderTop: "1px solid #f1f5f9" }}>
                        <td style={{ padding: "6px 12px" }}>
                          {getProductImage(p)
                            ? <img src={getProductImage(p)} alt={getProductName(p)} style={{ height: 36, width: 36, borderRadius: 8, objectFit: "cover", display: "block" }} />
                            : <div style={{ height: 36, width: 36, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#94a3b8" }}>—</div>
                          }
                        </td>
                        <td style={{ padding: "6px 12px", overflow: "hidden" }}>
                          <p style={{ margin: 0, fontWeight: 600, color: "#1e293b", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{getProductName(p)}</p>
                          <p style={{ margin: 0, fontSize: 11, color: "#94a3b8", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{p.deskripsi ?? ""}</p>
                        </td>
                        <td style={{ padding: "6px 12px", color: "#475569", whiteSpace: "nowrap" }}>
                          Rp {Number(p.harga || 0).toLocaleString("id-ID")}
                        </td>
                        <td style={{ padding: "6px 12px", color: "#475569", textAlign: "center" }}>{p.stok ?? 0}</td>
                        <td style={{ padding: "6px 12px" }}>
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <button onClick={() => openEdit(p)} style={{ borderRadius: 999, border: "1px solid #e2e8f0", padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#475569", background: "#fff", cursor: "pointer" }}>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(p)} disabled={deleting} style={{ borderRadius: 999, border: "1px solid #fecaca", padding: "4px 12px", fontSize: 12, fontWeight: 500, color: "#dc2626", background: "#fef2f2", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}>
                              {deleting ? "..." : "Hapus"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE: Card list ── */}
            <div className="bg-admin-mobile">
              {products.map((p) => {
                const pk = "id_produk" in p ? "id_produk" : "product_id" in p ? "product_id" : "id";
                const pkVal = p[pk] ?? p.id;
                const deleting = !!deletingIds[String(pkVal)];
                return (
                  <div key={String(pkVal)} style={{ display: "flex", gap: 12, borderRadius: 16, border: "1px solid #e2e8f0", background: "#fff", padding: 16, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
                    {getProductImage(p)
                      ? <img src={getProductImage(p)} alt={getProductName(p)} style={{ height: 72, width: 72, borderRadius: 12, objectFit: "cover", flexShrink: 0 }} />
                      : <div style={{ height: 72, width: 72, borderRadius: 12, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "#94a3b8", flexShrink: 0 }}>—</div>
                    }
                    <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: "#1e293b", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>{getProductName(p)}</p>
                      <p style={{ margin: 0, fontSize: 13, color: "#e11d48", fontWeight: 500 }}>Rp {Number(p.harga || 0).toLocaleString("id-ID")}</p>
                      <p style={{ margin: 0, fontSize: 12, color: "#94a3b8" }}>Stok: {p.stok ?? 0}</p>
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        <button onClick={() => openEdit(p)} style={{ flex: 1, borderRadius: 999, border: "1px solid #e2e8f0", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#475569", background: "#fff", cursor: "pointer" }}>
                          ✏️ Edit
                        </button>
                        <button onClick={() => handleDelete(p)} disabled={deleting} style={{ flex: 1, borderRadius: 999, border: "1px solid #fecaca", padding: "7px 0", fontSize: 12, fontWeight: 600, color: "#dc2626", background: "#fef2f2", cursor: "pointer", opacity: deleting ? 0.5 : 1 }}>
                          {deleting ? "..." : "🗑️ Hapus"}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── MODAL ── */}
        {modalOpen && (
          <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(15,23,42,.5)", padding: 16 }}>
            <div style={{ width: "100%", maxWidth: 520, borderRadius: 20, background: "#fff", padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,.15)", maxHeight: "90vh", overflowY: "auto" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{editingId ? "Edit Produk" : "Tambah Produk Baru"}</h2>
                <button onClick={() => setModalOpen(false)} style={{ borderRadius: 999, border: "1px solid #e2e8f0", padding: "6px 14px", fontSize: 13, color: "#475569", background: "#fff", cursor: "pointer" }}>
                  Tutup
                </button>
              </div>
              <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Nama Produk</span>
                  <input value={form.nama} onChange={(e) => setForm((s: any) => ({ ...s, nama: e.target.value }))} required style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none" }} />
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Harga</span>
                    <input type="number" value={form.harga} onChange={(e) => setForm((s: any) => ({ ...s, harga: e.target.value }))} style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none" }} />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Stok</span>
                    <input type="number" value={form.stok} onChange={(e) => setForm((s: any) => ({ ...s, stok: e.target.value }))} style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none" }} />
                  </label>
                </div>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Deskripsi</span>
                  <textarea value={form.deskripsi} onChange={(e) => setForm((s: any) => ({ ...s, deskripsi: e.target.value }))} rows={3} style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none", resize: "vertical" }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Kategori</span>
                  <input
                    value={form.kategori}
                    onChange={(e) => setForm((s: any) => ({ ...s, kategori: e.target.value }))}
                    placeholder="Contoh: Gelang, Gantungan, Charm"
                    style={{ borderRadius: 12, border: "1px solid #e2e8f0", padding: "10px 14px", fontSize: 14, outline: "none" }}
                  />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "#374151" }}>Foto Produk</span>
                  <input type="file" accept="image/*" onChange={(e) => setForm((s: any) => ({ ...s, foto_file: e.target.files?.[0] ?? null }))} style={{ fontSize: 13 }} />
                  {form.foto_url && <img src={form.foto_url} alt="preview" style={{ marginTop: 8, height: 80, width: 80, borderRadius: 10, objectFit: "cover" }} />}
                </label>
                <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ borderRadius: 999, border: "1px solid #e2e8f0", padding: "10px 20px", fontSize: 13, fontWeight: 500, color: "#475569", background: "#fff", cursor: "pointer" }}>
                    Batal
                  </button>
                  <button type="submit" disabled={saving} style={{ borderRadius: 999, padding: "10px 20px", fontSize: 13, fontWeight: 600, color: "#fff", background: "#e11d48", border: "none", cursor: "pointer", opacity: saving ? 0.6 : 1 }}>
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </>
  );
}
