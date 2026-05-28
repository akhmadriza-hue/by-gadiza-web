/**
 * Utility functions untuk checkout dan WhatsApp formatting
 */

/**
 * Format nomor telepon ke format WhatsApp standar (62xxx)
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = phone.replace(/\D/g, "");

  // Handle 0xxx format
  if (cleaned.startsWith("0")) {
    cleaned = "62" + cleaned.substring(1);
  }
  // Handle non-62 prefix
  else if (!cleaned.startsWith("62")) {
    cleaned = "62" + cleaned;
  }

  return cleaned;
}

/**
 * Validasi format nomor WhatsApp
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  const cleaned = formatWhatsAppNumber(phone);
  // Minimal 10 digit setelah 62, maksimal 15
  return cleaned.length >= 12 && cleaned.length <= 17;
}

/**
 * Format currency ke Rupiah
 */
export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse cart dari localStorage
 */
export function getCartFromLocalStorage(): any[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem("bygadiza_cart");
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    console.error("Error parsing cart:", error);
    return [];
  }
}

/**
 * Simpan cart ke localStorage
 */
export function saveCartToLocalStorage(cart: any[]): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("bygadiza_cart", JSON.stringify(cart));
    }
  } catch (error) {
    console.error("Error saving cart:", error);
  }
}

/**
 * Clear cart dari localStorage
 */
export function clearCartFromLocalStorage(): void {
  try {
    if (typeof window !== "undefined") {
      localStorage.removeItem("bygadiza_cart");
    }
  } catch (error) {
    console.error("Error clearing cart:", error);
  }
}
