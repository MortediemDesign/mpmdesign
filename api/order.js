// Vercel serverless function: /api/order
// Přijme objednávku z konfigurátoru (index.html + app.js) a pošle e-mail
// s STL souborem (a náhledovým obrázkem) jako přílohou.
//
// Použitý služba: Resend (https://resend.com) – zdarma tier stačí na start,
// jednoduché API, žádné SMTP starosti. Alternativa s Nodemailer + Gmail
// je popsaná v README.md, kdyby ses chtěl Resend vyhnout.
//
// Nastavení (Vercel -> Project -> Settings -> Environment Variables):
//   RESEND_API_KEY   = tvůj API klíč z resend.com
//   ORDER_TO_EMAIL   = e-mail, kam mají objednávky chodit (tvůj)
//   ORDER_FROM_EMAIL = odesílací adresa ověřená v Resend (např. objednavky@mpmdesign.cz)

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS – nutné, protože mpmdesign.cz (GitHub Pages) a tato funkce (Vercel)
  // běží na jiné doméně. Klidně si "*" nahraď přímo za "https://mpmdesign.cz".
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  try {
    const { customer, design, stlBase64, previewImageBase64, createdAt } = req.body;

    if (!customer?.email || !customer?.name || !stlBase64 || !design?.text) {
      res.status(400).json({ error: "Chybí povinné údaje objednávky." });
      return;
    }

    const safeFileName = design.text.replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || "klicenka";

    const html = `
      <h2>Nová objednávka klíčenky – MPMDESIGN</h2>
      <p><strong>Zákazník:</strong> ${customer.name} (${customer.email})</p>
      <p><strong>Počet kusů:</strong> ${customer.qty || 1}</p>
      <p><strong>Text na klíčence:</strong> ${design.text}</p>
      <p><strong>Font:</strong> ${design.font}</p>
      <p><strong>Barva filamentu:</strong> ${design.colorName} (${design.color})</p>
      <p><strong>Rozměry:</strong> ${design.width_mm} × ${(design.width_mm * 0.36).toFixed(1)} mm, tloušťka ${design.thickness_mm} mm</p>
      ${customer.note ? `<p><strong>Poznámka zákazníka:</strong> ${customer.note}</p>` : ""}
      <p><strong>Odesláno:</strong> ${createdAt}</p>
      <p>STL soubor je v příloze – stačí přetáhnout do Bambu Studio a poslat do tiskárny.</p>
    `;

    await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL,
      to: process.env.ORDER_TO_EMAIL,
      reply_to: customer.email,
      subject: `Nová zakázka klíčenky: "${design.text}" (${customer.name})`,
      html,
      attachments: [
        {
          filename: `${safeFileName}.stl`,
          content: stlBase64, // Resend accepts base64 string directly
        },
        ...(previewImageBase64
          ? [{ filename: `${safeFileName}_nahled.jpg`, content: previewImageBase64 }]
          : []),
      ],
    });

    // volitelně: pošli i potvrzovací e-mail zákazníkovi
    if (process.env.SEND_CUSTOMER_CONFIRMATION === "true") {
      await resend.emails.send({
        from: process.env.ORDER_FROM_EMAIL,
        to: customer.email,
        subject: "Potvrzení objednávky – MPMDESIGN klíčenka",
        html: `<p>Ahoj ${customer.name}, díky za objednávku klíčenky s textem "${design.text}". Ozveme se s potvrzením a platebními údaji.</p>`,
      });
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Odeslání objednávky selhalo." });
  }
}
