import { NextResponse } from "next/server";

/**
 * API Route untuk mengirim pesan WhatsApp
 * 
 * SETUP INSTRUCTIONS:
 * 1. Pilih WhatsApp API provider (misal: Twilio, WhatsApp Business API, atau Wuzapi)
 * 2. Tambahkan credentials ke .env.local:
 *    - WHATSAPP_API_URL (URL endpoint API)
 *    - WHATSAPP_API_KEY (API Key/Token)
 *    - WHATSAPP_SENDER_PHONE (Nomor pengirim)
 *    - WHATSAPP_ADMIN_PHONE (Nomor admin toko, opsional untuk forward pesanan)
 * 
 * EXAMPLE UNTUK TWILIO:
 *    WHATSAPP_API_URL=https://api.twilio.com/2010-04-01/Accounts/{AccountSID}/Messages
 *    WHATSAPP_API_KEY=Bearer {AuthToken}
 *    WHATSAPP_SENDER_PHONE=whatsapp:+62812345678
 * 
 * EXAMPLE UNTUK WUZAPI:
 *    WHATSAPP_API_URL=https://api.wuzapi.com/sendMessage
 *    WHATSAPP_API_KEY={API_KEY}
 *    WHATSAPP_SENDER_PHONE=62812345678
 */

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { phone_number, message, kode_order } = body;

    // Validasi input
    if (!phone_number || !message) {
      return NextResponse.json(
        { success: false, error: "Phone number dan message diperlukan" },
        { status: 400 }
      );
    }

    // Ambil credentials dari env
    const whatsappApiUrl = process.env.WHATSAPP_API_URL;
    const whatsappApiKey = process.env.WHATSAPP_API_KEY;
    const whatsappSenderPhone = process.env.WHATSAPP_SENDER_PHONE;
    const adminPhone = process.env.WHATSAPP_ADMIN_PHONE;

    if (!whatsappApiUrl || !whatsappApiKey) {
      console.warn(
        "WhatsApp API not configured. Pesanan akan disimpan tapi notifikasi WhatsApp tidak dikirim."
      );
      return NextResponse.json(
        {
          success: true,
          warning: "Pesanan tersimpan tapi WhatsApp belum dikonfigurasi",
          kode_order,
        },
        { status: 200 }
      );
    }

    // Normalize nomor telepon ke format internasional
    let normalizedPhone = phone_number.replace(/\D/g, "");
    if (normalizedPhone.startsWith("0")) {
      normalizedPhone = "62" + normalizedPhone.substring(1);
    } else if (!normalizedPhone.startsWith("62")) {
      normalizedPhone = "62" + normalizedPhone;
    }

    // Kirim ke WhatsApp API
    // Kode di bawah ini adalah template generik yang perlu disesuaikan
    // sesuai dengan WhatsApp API provider yang digunakan
    try {
      const response = await sendWhatsAppMessage({
        phoneNumber: normalizedPhone,
        message,
        apiUrl: whatsappApiUrl,
        apiKey: whatsappApiKey,
        senderPhone: whatsappSenderPhone,
      });

      if (!response.success) {
        console.error("WhatsApp send error:", response.error);
        // Jangan fail, karena pesanan sudah tersimpan
        return NextResponse.json(
          {
            success: true,
            warning: "Pesanan tersimpan tapi pengiriman WhatsApp gagal",
            whatsapp_error: response.error,
            kode_order,
          },
          { status: 200 }
        );
      }

      // Opsional: Forward pesanan ke nomor admin
      if (adminPhone && adminPhone !== normalizedPhone) {
        const adminMessage = `📩 *PESANAN BARU*\n\n${message}\n\n---\nPesan diteruskan untuk konfirmasi admin.`;
        await sendWhatsAppMessage({
          phoneNumber: adminPhone,
          message: adminMessage,
          apiUrl: whatsappApiUrl,
          apiKey: whatsappApiKey,
          senderPhone: whatsappSenderPhone,
        }).catch((err) => console.error("Failed to send admin notification:", err));
      }

      return NextResponse.json(
        {
          success: true,
          message: "Pesanan berhasil dikirim via WhatsApp",
          kode_order,
          message_id: response.message_id,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Error sending WhatsApp:", error);
      // Pesanan sudah tersimpan, jadi jangan fail
      return NextResponse.json(
        {
          success: true,
          warning: "Pesanan tersimpan tapi pengiriman WhatsApp gagal",
          error: error instanceof Error ? error.message : String(error),
          kode_order,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Unhandled error in send-whatsapp:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

/**
 * Generic function untuk mengirim WhatsApp message
 * Perlu disesuaikan dengan API provider yang digunakan
 */
async function sendWhatsAppMessage({
  phoneNumber,
  message,
  apiUrl,
  apiKey,
  senderPhone,
}: {
  phoneNumber: string;
  message: string;
  apiUrl: string;
  apiKey: string;
  senderPhone?: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  try {
    // Deteksi provider berdasarkan URL
    if (apiUrl.includes("twilio")) {
      return await sendViaTwilio({ phoneNumber, message, apiUrl, apiKey, senderPhone });
    } else if (apiUrl.includes("wuzapi")) {
      return await sendViaWuzapi({ phoneNumber, message, apiUrl, apiKey });
    } else {
      // Generic POST request
      return await sendViaGeneric({ phoneNumber, message, apiUrl, apiKey });
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Twilio WhatsApp API
 */
async function sendViaTwilio({
  phoneNumber,
  message,
  apiUrl,
  apiKey,
  senderPhone,
}: {
  phoneNumber: string;
  message: string;
  apiUrl: string;
  apiKey: string;
  senderPhone?: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  const formData = new URLSearchParams();
  formData.append("From", senderPhone || "whatsapp:+62000000000");
  formData.append("To", `whatsapp:+${phoneNumber}`);
  formData.append("Body", message);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(apiKey).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: formData.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Twilio error: ${error}`);
  }

  const data = await response.json();
  return {
    success: true,
    message_id: data.sid,
  };
}

/**
 * Wuzapi WhatsApp API (atau kompatibel dengan API serupa)
 */
async function sendViaWuzapi({
  phoneNumber,
  message,
  apiUrl,
  apiKey,
}: {
  phoneNumber: string;
  message: string;
  apiUrl: string;
  apiKey: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone: phoneNumber,
      message: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Wuzapi error: ${error}`);
  }

  const data = await response.json();
  return {
    success: true,
    message_id: data.message_id || data.id,
  };
}

/**
 * Generic REST API (POST JSON)
 */
async function sendViaGeneric({
  phoneNumber,
  message,
  apiUrl,
  apiKey,
}: {
  phoneNumber: string;
  message: string;
  apiUrl: string;
  apiKey: string;
}): Promise<{ success: boolean; message_id?: string; error?: string }> {
  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      phone_number: phoneNumber,
      message: message,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }

  const data = await response.json();
  return {
    success: true,
    message_id: data.message_id || data.id,
  };
}
