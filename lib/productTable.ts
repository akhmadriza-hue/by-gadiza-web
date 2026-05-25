export const PRODUCT_TABLE = process.env.NEXT_PUBLIC_PRODUCT_TABLE || "produk";

export const NAME_COLUMNS = ["name", "nama", "nama_produk"] as const;
export const IMAGE_COLUMNS = ["image_url", "foto_url"] as const;

export function getProductName(product: any) {
  return product?.name ?? product?.nama ?? product?.nama_produk ?? product?.title ?? "";
}

export function getProductImage(product: any) {
  if (typeof product?.foto_url === "string") return product.foto_url;
  if (typeof product?.image_url === "string") return product.image_url;
  return product?.fotoUrl ?? "";
}
