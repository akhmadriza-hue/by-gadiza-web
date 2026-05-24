"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR" }).format(value);
}

export default function AdminPesananPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingIds, setUpdatingIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.from("pesanan").select("*").order("created_at", { ascending: false });
      console.info("Supabase fetch pesanan:", { data, error });
      if (error) {
        console.error(error);
      } else if (mounted) {
        setOrders(data ?? []);
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function updateStatus(id_pesanan: string, newStatus: string) {
    try {
      setUpdatingIds((s) => ({ ...s, [id_pesanan]: true }));
      const res = await fetch("/api/pesanan/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_pesanan, status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error("Update status API error:", data);
        alert("Gagal mengupdate status pesanan.");
        return;
      }

      // optimistic update in UI
      setOrders((prev) => prev.map((o) => (o.id_pesanan === id_pesanan ? { ...o, status: newStatus } : o)));
    } catch (err) {
      console.error("Gagal update status:", err);
      alert("Gagal mengupdate status pesanan.");
    } finally {
      setUpdatingIds((s) => {
        const copy = { ...s };
        delete copy[id_pesanan];
        return copy;
      });
    }
  }

  if (loading) return <div className="p-8">Memuat pesanan...</div>;

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-semibold mb-6">Daftar Pesanan</h1>
      {orders.length === 0 ? (
        <p>Tidak ada pesanan.</p>
      ) : (
        <div className="grid gap-6">
          {orders.map((o) => (
            <div key={o.id_pesanan} className="rounded-xl border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold">{o.kode_order}</div>
                  <div className="text-sm text-slate-600">{o.nama_pembeli} — {o.nomor_wa}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatRupiah(Number(o.total_harga || 0))}</div>
                  <div className="text-sm text-slate-500">{o.status}</div>
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(() => {
                  const rawItems = o.detail_produk ?? o.items ?? o.order_items ?? o.detail_produk_json ?? null;
                  let items: any[] = [];
                  if (Array.isArray(rawItems)) {
                    items = rawItems;
                  } else if (rawItems && typeof rawItems === "object") {
                    items = Object.values(rawItems);
                  }
                  if (items.length > 0) {
                    return items.map((p: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 rounded-md border p-3">
                        <img src={p.foto_url || p.fotoUrl || ""} alt={p.nama || p.name || "Item"} className="h-16 w-16 rounded-md object-cover" />
                        <div>
                          <div className="font-medium">{p.nama || p.name || "Nama Produk"}</div>
                          <div className="text-sm text-slate-600">Qty: {p.qty ?? p.quantity ?? 1}</div>
                        </div>
                      </div>
                    ));
                  }
                  return <div>Tidak ada detail produk.</div>;
                })()}
              </div>
              <div className="mt-4 flex gap-3">
                <button
                  disabled={!!updatingIds[o.id_pesanan]}
                  onClick={() => updateStatus(o.id_pesanan, "diproses")}
                  className="rounded-full bg-yellow-500 px-4 py-2 text-white disabled:opacity-60"
                >
                  {updatingIds[o.id_pesanan] ? "..." : "Mark Diproses"}
                </button>
                <button
                  disabled={!!updatingIds[o.id_pesanan]}
                  onClick={() => updateStatus(o.id_pesanan, "packing")}
                  className="rounded-full bg-indigo-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {updatingIds[o.id_pesanan] ? "..." : "Mark Packing"}
                </button>
                <button
                  disabled={!!updatingIds[o.id_pesanan]}
                  onClick={() => updateStatus(o.id_pesanan, "selesai")}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-white disabled:opacity-60"
                >
                  {updatingIds[o.id_pesanan] ? "..." : "Mark Selesai"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
