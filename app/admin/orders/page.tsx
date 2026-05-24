"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const ADMIN_PASSWORD = "adminGadiza2026";
    
    // Check if session is already stored in localStorage
    const storedSession = typeof window !== "undefined" ? localStorage.getItem("admin_session") : null;
    
    if (storedSession === ADMIN_PASSWORD) {
      // Session exists and is valid, allow access
      setIsAuthenticated(true);
    } else {
      // No valid session, prompt for password
      const password = prompt("Masukkan Password Admin:");
      
      if (password === ADMIN_PASSWORD) {
        // Password correct, save session and allow access
        localStorage.setItem("admin_session", ADMIN_PASSWORD);
        setIsAuthenticated(true);
      } else {
        // Password wrong or cancelled
        alert("Akses Ditolak!");
        router.push("/");
        return;
      }
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let mounted = true;

    async function loadOrders() {
      setLoading(true);
      const { data, error } = await supabase.from("pesanan").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch orders error:", error);
      } else if (mounted && data) {
        setOrders(data);
      }
      setLoading(false);
    }

    loadOrders();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

  const filteredOrders = orders.filter((order) => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const matchesSearch =
      normalizedSearch.length === 0 ||
      order.kode_order?.toLowerCase().includes(normalizedSearch) ||
      order.nama_pembeli?.toLowerCase().includes(normalizedSearch) ||
      order.nomor_whatsapp?.toLowerCase().includes(normalizedSearch);

    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  async function deleteOrder(id: number) {
    const confirmed = confirm("Yakin ingin menghapus pesanan ini dari database?");
    if (!confirmed) return;

    const { error } = await supabase.from("pesanan").delete().eq("id", id);
    if (error) {
      console.error("Supabase delete order error:", error);
      alert("Gagal menghapus pesanan. Silakan coba lagi.");
      return;
    }

    setOrders((prev) => prev.filter((order) => order.id !== id));
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Admin Orders</h1>

      {loading ? (
        <div className="rounded-xl border p-6 text-slate-700">Memuat pesanan...</div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border p-6 text-slate-700">Belum ada pesanan.</div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <span className="text-sm font-medium">Cari pesanan</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Cari kode order, nama, atau WA"
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium">Filter status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-200"
              >
                <option value="all">Semua status</option>
                <option value="pending">Pending</option>
                <option value="diproses">Diproses</option>
                <option value="packing">Packing</option>
                <option value="selesai">Selesai</option>
              </select>
            </label>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="rounded-xl border p-6 text-slate-700">Tidak ada pesanan sesuai filter.</div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => (
                <div key={order.id} className="rounded-2xl border bg-white p-6 shadow-sm">
                  <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-slate-500">Kode Order</p>
                      <p className="text-lg font-semibold">{order.kode_order}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Status</p>
                        <p className="font-semibold text-slate-800">{order.status}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteOrder(order.id)}
                        className="rounded-full border border-red-500 bg-red-50 px-3 py-2 text-red-700 transition hover:bg-red-100"
                      >
                        Hapus Pesanan
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold">Nama Pembeli</p>
                      <p>{order.nama_pembeli}</p>
                      <p className="text-sm font-semibold">WhatsApp</p>
                      <p>{order.nomor_whatsapp}</p>
                    </div>
                    <div className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-semibold">Alamat</p>
                      <p>{order.alamat}</p>
                      <p className="text-sm font-semibold">Total</p>
                      <p>{formatRupiah(Number(order.total_harga) || 0)}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold">Detail Produk</p>
                    {Array.isArray(order.detail_produk) && order.detail_produk.length > 0 ? (
                      <div className="space-y-3">
                        {order.detail_produk.map((item: any, idx: number) => (
                          <div key={idx} className="flex items-center justify-between gap-4 rounded-xl bg-white p-3 shadow-sm">
                            <div>
                              <div className="font-semibold">{item.nama || item.name || "Produk"}</div>
                              <div className="text-sm text-slate-500">Qty: {item.qty ?? item.quantity ?? 1}</div>
                            </div>
                            <div className="text-sm font-semibold">
                              {formatRupiah(Number(item.harga || item.price || 0) * Number(item.qty ?? item.quantity ?? 1))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">Tidak ada detail produk yang tersedia.</p>
                    )}
                  </div>

                  <p className="mt-4 text-sm text-slate-500">Dibuat: {new Date(order.created_at).toLocaleString("id-ID")}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
