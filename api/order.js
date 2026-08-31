// Vercel serverless funkce: /api/order
// Prijme objednavku z konfiguratoru (klicenky i samolepky) a posle e-mail
// s vyrobnim souborem v priloze.
//
// Nastaveni (Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY   = API klic z resend.com
//   ORDER_TO_EMAIL   = kam maji objednavky chodit
//   ORDER_FROM_EMAIL = odesilaci adresa overena v Resend
//   SEND_CUSTOMER_CONFIRMATION = "true" pro potvrzeni zakaznikovi (volitelne)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const esc = (v) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const czk = (v) => (typeof v === "number" ? Math.round(v) + " Kč" : "neuvedeno");

function rows(pairs) {
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `<tr><td style="padding:4px 10px 4px 0;color:#666;">${esc(k)}</td>` +
      `<td style="padding:4px 0;"><strong>${esc(v)}</strong></td></tr>`)
    .join("");
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const {
      product = "klicenka",
      customer,
      design,
      pricing,
      stlBase64,
      fileBase64,
      fileName,
      previewImageBase64,
      createdAt,
    } = req.body || {};

    if (!customer?.email || !customer?.name) {
      return res.status(400).json({ error: "Chybí jméno nebo e-mail zákazníka." });
    }

    const attachmentContent = fileBase64 || stlBase64;
    if (!attachmentContent) {
      return res.status(400).json({ error: "Chybí výrobní soubor objednávky." });
    }

    const isSticker = product === "samolepky";
    const label = isSticker ? "samolepek" : "klíčenky";
    const baseName =
      (design?.text || design?.imageName || product).toString()
        .replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || product;
    const attachmentName = fileName || `${baseName}.stl`;

    const detail = isSticker
      ? rows([
          ["Motiv", design?.mode === "image" ? `obrázek ${design?.imageName || ""}` : design?.text],
          ["Font", design?.font],
          ["Barva textu", design?.textColor],
          ["Barva podkladu", design?.bgColor],
          ["Tvar", design?.shape],
          ["Rozměr", `${design?.width_cm} × ${design?.height_cm} cm`],
          ["Materiál", design?.material],
        ])
      : rows([
          ["Text", design?.text],
          ["Font", design?.font],
          ["Barva podkladu", `${design?.baseColorName || ""} (${design?.baseColor || ""})`],
          ["Barva textu", `${design?.textColorName || ""} (${design?.textColor || ""})`],
          ["Výška textu", `${design?.textHeight_mm ?? 1.6} mm`],
          ["Tvar", design?.shape],
          ["Rozměry", `${design?.width_mm} mm, tloušťka ${design?.thickness_mm} mm`],
          ["Otvor", design?.hasHole === false ? "bez otvoru" : `${design?.holeDiameter_mm || "?"} mm`],
        ]);

    const html = `
      <h2 style="margin:0 0 4px;">Nová objednávka ${esc(label)} – MPMDESIGN</h2>
      <p style="margin:0 0 16px;color:#666;">Přijato ${esc(createdAt || new Date().toISOString())}</p>

      <h3 style="margin:16px 0 4px;">Zákazník</h3>
      <table>${rows([
        ["Jméno", customer.name],
        ["E-mail", customer.email],
        ["Počet kusů", customer.qty || 1],
        ["Poznámka", customer.note],
      ])}</table>

      <h3 style="margin:16px 0 4px;">Návrh</h3>
      <table>${detail}</table>

      <h3 style="margin:16px 0 4px;">Cena</h3>
      <table>${rows([
        ["Celkem", czk(pricing?.total)],
        ["Za kus", czk(pricing?.perPiece)],
        ["Doprava", pricing?.shippingName || czk(pricing?.shipping)],
      ])}</table>
      <p style="color:#888;font-size:12px;">Cena je orientační z konfigurátoru – potvrď ji zákazníkovi.</p>

      <p style="margin-top:16px;">Výrobní soubor <strong>${esc(attachmentName)}</strong> je v příloze${
        isSticker
          ? " – řezná kontura je ve vrstvě <em>CutContour</em>."
          : " – stačí přetáhnout do Bambu Studio."
      }</p>
    `;

    await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL,
      to: process.env.ORDER_TO_EMAIL,
      reply_to: customer.email,
      subject: `Nová zakázka ${label}: "${design?.text || design?.imageName || baseName}" (${customer.name})`,
      html,
      attachments: [
        { filename: attachmentName, content: attachmentContent },
        ...(previewImageBase64
          ? [{ filename: `${baseName}_nahled.jpg`, content: previewImageBase64 }]
          : []),
      ],
    });

    if (process.env.SEND_CUSTOMER_CONFIRMATION === "true") {
      await resend.emails.send({
        from: process.env.ORDER_FROM_EMAIL,
        to: customer.email,
        subject: `Potvrzení objednávky – MPMDESIGN`,
        html: `<p>Dobrý den ${esc(customer.name)}, děkujeme za objednávku ${esc(label)}.` +
          ` Ozveme se s potvrzením ceny a platebními údaji.</p>`,
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Odeslání objednávky selhalo." });
  }
}
