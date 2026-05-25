"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_PASSWORD = "adminGadiza2026";

const initialFormState = {
  nama: "",
  harga: "",
  stok: "",
  deskripsi: "",
  foto_url: "",
};

export default function AdminProductsPage() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [nameColumn, setNameColumn] = useState<"name" | "nama" | "nama_produk">("name");
  const [imageColumn, setImageColumn] = useState<"image_url" | "foto_url">("image_url");
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialFormState);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingIds, setDeletingIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const storedSession = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;

    if (storedSession === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      return;
    }

    const password = prompt("Masukkan Password Admin:");
    if (password === ADMIN_PASSWORD) {
      localStorage.setItem("admin_session", ADMIN_PASSWORD);
      setIsAuthenticated(true);
      return;
    }

    alert("Akses Ditolak!");
    router.push("/");
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    async function loadProducts() {
      setLoading(true);
      const { data, error } = await supabase.from("produk").select("*").order("id", { ascending: false });
      if (error) {
        console.error("Supabase fetch produk error:", error);
      } else if (mounted) {
        setProducts(data ?? []);
        if (Array.isArray(data) && data.length > 0) {
          const firstRow = data[0];
          const activeImageKey = firstRow.image_url !== undefined ? "image_url" : firstRow.foto_url !== undefined ? "foto_url" : "image_url";
          const activeNameKey = firstRow.name !== undefined ? "name" : firstRow.nama !== undefined ? "nama" : firstRow.nama_produk !== undefined ? "nama_produk" : "name";
          setImageColumn(activeImageKey);
          setNameColumn(activeNameKey);
        }
      }
      setLoading(false);
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  function formatRupiah(value: number) {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
  }

  function openNewProduct() {
    setForm(initialFormState);
    setEditingId(null);
    setModalOpen(true);
  }

  function getProductName(product: any) {
    return product.name ?? product.nama ?? product.nama_produk ?? "";
  }

  function openEditProduct(product: any) {
    const productImage = product.image_url ?? product.foto_url ?? "";
    setForm({
      nama: getProductName(product),
      harga: String(product.harga ?? ""),
      stok: String(product.stok ?? ""),
      deskripsi: product.deskripsi ?? "",
      foto_url: productImage,
    });
    setEditingId(product.id);
    if (product.image_url !== undefined) {
      setImageColumn("image_url");
    } else if (product.foto_url !== undefined) {
      setImageColumn("foto_url");
    }
    if (product.name !== undefined) {
      setNameColumn("name");
    } else if (product.nama !== undefined) {
      setNameColumn("nama");
    } else if (product.nama_produk !== undefined) {
      setNameColumn("nama_produk");
    }
    setModalOpen(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.nama.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }

    const imageUrlValue = form.foto_url.trim();
    const payload: any = {
      [nameColumn]: form.nama.trim(),
      harga: Number(form.harga) || 0,
      stok: Number(form.stok) || 0,
      deskripsi: form.deskripsi.trim(),
      [imageColumn]: imageUrlValue,
    };

    setSaving(true);
    console.log("Supabase save produk payload:", payload);
    try {
      if (editingId) {
        const { error } = await supabase.from("produk").update(payload).eq("id", editingId);
        if (error) {
          throw error;
        }
        setProducts((prev) => prev.map((item) => (item.id === editingId ? { ...item, ...payload } : item)));
        alert("Produk berhasil diperbarui.");
      } else {
        const { data, error } = await supabase.from("produk").insert(payload).select().single();
        if (error) {
          throw error;
        }
        setProducts((prev) => [data ?? payload, ...prev]);
        alert("Produk baru berhasil ditambahkan.");
      }
      setModalOpen(false);
    } catch (err) {
      const errorDetails = err && typeof err === "object" ? JSON.stringify(err, Object.getOwnPropertyNames(err), 2) : String(err);
      console.error("Supabase save produk error:", err);
      alert(`Gagal menyimpan data produk. Silakan coba lagi.\n\nDetail error:\n${errorDetails}`);
    } finally {
      setSaving(false);
    }
  }

  async function deleteProduct(id: number) {
    const confirmed = confirm("Yakin ingin menghapus produk ini dari database?");
    if (!confirmed) return;

    setDeletingIds((prev) => ({ ...prev, [id]: true }));
    try {
      const { error } = await supabase.from("produk").delete().eq("id", id);
      if (error) {
        throw error;
      }
      setProducts((prev) => prev.filter((item) => item.id !== id));
      alert("Produk berhasil dihapus.");
    } catch (error) {
      console.error("Supabase delete produk error:", error);
      alert("Gagal menghapus produk. Silakan coba lagi.");
    } finally {
      setDeletingIds((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard Admin Produk</h1>
          <p className="mt-2 text-sm text-slate-600">Kelola daftar produk, stok, dan informasi produk secara real-time.</p>
        </div>
        <button
          type="button"
          onClick={openNewProduct}
          className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700"
        >
          + Tambah Produk Baru
        </button>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700">Memuat daftar produk...</div>
      ) : products.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700">Belum ada produk di database.</div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full border-collapse text-left text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Nama</th>
                <th className="px-4 py-3 font-medium text-slate-600">Harga</th>
                <th className="px-4 py-3 font-medium text-slate-600">Stok</th>
                <th className="px-4 py-3 font-medium text-slate-600">Deskripsi</th>
                <th className="px-4 py-3 font-medium text-slate-600">Foto</th>
                <th className="px-4 py-3 font-medium text-slate-600">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id} className="border-t border-slate-200 hover:bg-slate-50">
                  <td className="px-4 py-4 align-top text-slate-900">{getProductName(product)}</td>
                  <td className="px-4 py-4 align-top text-slate-700">{formatRupiah(Number(product.harga) || 0)}</td>
                  <td className="px-4 py-4 align-top text-slate-700">{product.stok ?? 0}</td>
                  <td className="px-4 py-4 align-top text-slate-700 max-w-xl break-words">{product.deskripsi || "-"}</td>
                  <td className="px-4 py-4 align-top text-slate-700">
                    {product.image_url ?? product.foto_url ? (
                      <img src={product.image_url ?? product.foto_url} alt={product.nama} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <span className="text-xs text-slate-400">Tidak ada</span>
                    )}
                  </td>
                  <td className="px-4 py-4 align-top text-slate-700">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => openEditProduct(product)}
                        className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={!!deletingIds[product.id]}
                        onClick={() => deleteProduct(product.id)}
                        className="rounded-full border border-red-500 bg-red-50 px-3 py-2 text-sm text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingIds[product.id] ? "Menghapus..." : "Hapus"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 py-8">
          <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold">{editingId ? "Edit Produk" : "Tambah Produk Baru"}</h2>
                <p className="mt-1 text-sm text-slate-500">Lengkapi detail produk, lalu simpan untuk memperbarui database.</p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
              >
                Tutup
              </button>
            </div>
            <form className="grid gap-4" onSubmit={saveProduct}>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Nama Produk</span>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(event) => setForm((prev) => ({ ...prev, nama: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  placeholder="Contoh: Tas Rajut"
                  required
                />
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Harga (IDR)</span>
                  <input
                    type="number"
                    min="0"
                    value={form.harga}
                    onChange={(event) => setForm((prev) => ({ ...prev, harga: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    placeholder="100000"
                    required
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">Stok</span>
                  <input
                    type="number"
                    min="0"
                    value={form.stok}
                    onChange={(event) => setForm((prev) => ({ ...prev, stok: event.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                    placeholder="10"
                    required
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Deskripsi</span>
                <textarea
                  value={form.deskripsi}
                  onChange={(event) => setForm((prev) => ({ ...prev, deskripsi: event.target.value }))}
                  className="min-h-[120px] w-full rounded-3xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  placeholder="Deskripsi singkat produk"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">URL Foto</span>
                <input
                  type="url"
                  value={form.foto_url}
                  onChange={(event) => setForm((prev) => ({ ...prev, foto_url: event.target.value }))}
                  className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-rose-500 focus:ring-2 focus:ring-rose-200"
                  placeholder="https://..."
                />
              </label>
              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-rose-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? "Menyimpan..." : editingId ? "Simpan Perubahan" : "Tambah Produk"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
