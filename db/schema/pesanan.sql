-- SQL schema for `pesanan` (orders) table
-- Run this in Supabase SQL editor or via psql to create the table.

-- Ensure pgcrypto is available for gen_random_uuid()
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pesanan (
  id_pesanan uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_order text UNIQUE NOT NULL,
  nama_pembeli text NOT NULL,
  nomor_wa text,
  total_harga numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  detail_produk jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for faster listing by creation time
CREATE INDEX IF NOT EXISTS idx_pesanan_created_at ON pesanan (created_at DESC);

-- Example of inserting a sample order:
-- INSERT INTO pesanan (kode_order, nama_pembeli, nomor_wa, total_harga, detail_produk)
-- VALUES ('#GDZ-1623456789012', 'Budi', '+628123456789', 150000, '[{"id":"prod-1","nama":"Gelang Anyaman","qty":2,"foto_url":"https://..."}]');
