// Vercel serverless funkce: /api/order
// Prijme objednavku z konfiguratoru (klicenky, samolepky, gravirovani) a posle
// e-mail s vyrobnim souborem v priloze. Poptavky z DTF, polepu a CNC maji
// vlastni vetev (handleInquiry): prehledne shrnuti, vic priloh nebo odkaz
// a kopie zakaznikovi.
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

const INQUIRY_PRODUCTS = {
  dtf: {
    label: "DTF potisk textilu",
    promise: "Objednávku zkontroluji a potvrdím vám e-mailem, teprve tím vzniká smlouva.",
  },
  polepy: {
    label: "Polepy a reklamní grafika",
    promise: "Cena je orientační. Závaznou nabídku pošlu po prohlídce nebo z fotek.",
  },
  cnc: {
    label: "CNC frézování",
    promise: "Cenovou nabídku pošlu do 24 hodin v pracovní dny.",
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_FILES = 10;

const str = (v, max) => String(v ?? "").trim().slice(0, max);

function pairs(list, maxItems) {
  if (!Array.isArray(list)) return [];
  return list
    .filter((p) => Array.isArray(p) && p.length === 2)
    .slice(0, maxItems)
    .map(([k, v]) => [str(k, 120), str(v, 2000)]);
}

function table(list) {
  return `<table style="border-collapse:collapse;">${rows(list)}</table>`;
}

async function handleInquiry(body, res) {
  const kind = INQUIRY_PRODUCTS[body.product];
  const c = body.customer || {};
  const name = str(c.name, 120);
  const email = str(c.email, 200);

  if (!name || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "Vyplňte prosím jméno a platný e-mail." });
  }
  const summary = pairs(body.summary, 80);
  if (!summary.length) {
    return res.status(400).json({ error: "Poptávka neobsahuje žádné zadání." });
  }
  const priceLines = pairs(body.priceLines, 20);
  const link = str(body.fileLink, 500);
  if (link && !/^https?:\/\//i.test(link)) {
    return res.status(400).json({ error: "Odkaz na soubory musí začínat http:// nebo https://." });
  }
  const files = (Array.isArray(body.files) ? body.files : [])
    .filter((f) => f && typeof f.base64 === "string" && f.base64.length)
    .slice(0, MAX_FILES)
    .map((f) => ({
      filename: str(f.name, 120).replace(/[^\w.\- ]+/g, "_") || "soubor",
      content: f.base64,
    }));

  const customerRows = [
    ["Jméno", name],
    ["E-mail", email],
    ["Telefon", str(c.phone, 40)],
    ["Adresa", c.address ? `${str(c.address.street, 120)}, ${str(c.address.zip, 12)} ${str(c.address.city, 80)}` : ""],
    ["Poznámka", str(c.note, 2000)],
  ];
  const fileRows = [
    ...files.map((f, i) => [`Příloha ${i + 1}`, f.filename]),
    ["Odkaz na soubory", link],
  ];

  const section = (title, html) => `<h3 style="margin:18px 0 6px;">${esc(title)}</h3>${html}`;
  const priceHtml = priceLines.length
    ? section("Cena", table(priceLines) + (body.priceNote ? `<p style="color:#666;font-size:13px;">${esc(str(body.priceNote, 600))}</p>` : ""))
    : "";
  const filesHtml = fileRows.some(([, v]) => v) ? section("Soubory", table(fileRows)) : "";

  const ownerHtml = `
    <h2 style="margin:0 0 4px;">Nová poptávka – ${esc(kind.label)}</h2>
    <p style="margin:0 0 12px;color:#666;">Přijato ${esc(str(body.createdAt, 40) || new Date().toISOString())}</p>
    ${section("Zákazník", table(customerRows))}
    ${section("Zadání", table(summary))}
    ${priceHtml}
    ${filesHtml}`;

  const sent = await resend.emails.send({
    from: process.env.ORDER_FROM_EMAIL,
    to: process.env.ORDER_TO_EMAIL,
    replyTo: email,
    subject: `Nová poptávka – ${kind.label}: ${name}`,
    html: ownerHtml,
    attachments: files,
  });
  if (sent?.error) {
    console.error(sent.error);
    return res.status(500).json({ error: "Odeslání poptávky selhalo." });
  }

  // Kopie zakaznikovi je jen potvrzeni - kdyz selze, poptavka uz dorazila.
  try {
    const copy = await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL,
      to: email,
      replyTo: process.env.ORDER_TO_EMAIL,
      subject: `Shrnutí vaší poptávky – ${kind.label} – MPMDESIGN`,
      html: `
        <p>Dobrý den ${esc(name)},</p>
        <p>děkuji za poptávku. ${esc(kind.promise)}</p>
        ${section("Vaše zadání", table(summary))}
        ${priceHtml}
        ${files.length ? `<p style="color:#666;font-size:13px;">Přiložené soubory (${files.length}) jsem obdržel.</p>` : ""}
        <p>Miguel Pérez Morales, MPMDESIGN</p>`,
    });
    if (copy?.error) console.error(copy.error);
  } catch (err) {
    console.error(err);
  }

  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (INQUIRY_PRODUCTS[req.body?.product]) {
      return await handleInquiry(req.body, res);
    }

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
    const isEngraving = product === "gravirovani";
    const label = isSticker ? "samolepek" : isEngraving ? "gravírování" : "klíčenky";
    const baseName =
      (design?.text || design?.instagram || design?.imageName || product).toString()
        .replace(/[^a-z0-9_-]/gi, "_").slice(0, 30) || product;
    const attachmentName = fileName || `${baseName}.stl`;

    const a = customer.address;
    const addressLine = a ? `${a.street}, ${a.zip} ${a.city}` : "osobní převzetí";

    const detail = isEngraving
      ? rows([
          ["Produkt", design?.produkt],
          ["Text", design?.text],
          ["Druhý řádek", design?.text2],
          ["Font", design?.font],
          ["Hvězdičky", design?.hvezdicky],
          ["Fotka", design?.imageName],
          ["Tvar", design?.tvar],
          ["Rozměr", design?.rozmer],
          ["Materiál", design?.material],
          ["Příslušenství", design?.prislusenstvi],
          ["Spotřeba", design?.vyroba],
        ])
      : isSticker
      ? rows([
          ["Motiv", design?.mode === "image" ? `obrázek ${design?.imageName || ""}`
            : design?.mode === "instagram" ? `Instagram ${design?.instagram || ""}`
            : design?.text],
          ["Font", design?.font],
          ["Barva motivu", design?.textColor],
          ["Podklad", design?.bgColor],
          ["Tvar", design?.shape],
          ["Rozměr", `${design?.width_cm} × ${design?.height_cm} cm`],
          ["Materiál", design?.material],
          ["Spotřeba", design?.vyroba],
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

    const warning = design?.pozor
      ? `<p style="padding:10px 12px;background:#fff4e5;border-left:4px solid #ff8000;">
           <strong>Pozor:</strong> ${esc(design.pozor)}</p>`
      : "";

    const html = `
      <h2 style="margin:0 0 4px;">Nová objednávka ${esc(label)} – MPMDESIGN</h2>
      <p style="margin:0 0 16px;color:#666;">Přijato ${esc(createdAt || new Date().toISOString())}</p>

      <h3 style="margin:16px 0 4px;">Zákazník</h3>
      <table>${rows([
        ["Jméno", customer.name],
        ["E-mail", customer.email],
        ["Počet kusů", customer.qty || 1],
        ["Doručení", pricing?.shippingName || "neuvedeno"],
        ["Adresa", addressLine],
        ["Poznámka", customer.note],
      ])}</table>

      <h3 style="margin:16px 0 4px;">Návrh</h3>
      <table>${detail}</table>
      ${warning}

      <h3 style="margin:16px 0 4px;">Cena</h3>
      <table>${rows([
        ["Celkem", czk(pricing?.total)],
        ["Za kus", czk(pricing?.perPiece)],
        ["Doprava", czk(pricing?.shipping)],
      ])}</table>
      <p style="color:#888;font-size:12px;">Cena je orientační z konfigurátoru – potvrď ji zákazníkovi.</p>

      <p style="margin-top:16px;">Výrobní soubor <strong>${esc(attachmentName)}</strong> je v příloze${
        isEngraving
          ? " – gravírování je ve vrstvě <em>Engrave</em>, obrys ve vrstvě <em>CutContour</em>."
          : isSticker
          ? " – řezná kontura je ve vrstvě <em>CutContour</em>."
          : " – stačí přetáhnout do Bambu Studio."
      }</p>
    `;

    // Resend SDK v3 chyby nevyhazuje, ale vraci v { error } - bez kontroly by
    // zakaznik videl "odeslano", i kdyz e-mail nikdy neodesel.
    const sent = await resend.emails.send({
      from: process.env.ORDER_FROM_EMAIL,
      to: process.env.ORDER_TO_EMAIL,
      replyTo: customer.email, // Resend SDK v3 ocekava camelCase
      subject: `Nová zakázka ${label}: "${design?.text || design?.instagram || design?.imageName || baseName}" (${customer.name})`,
      html,
      attachments: [
        { filename: attachmentName, content: attachmentContent },
        ...(previewImageBase64
          ? [{ filename: `${baseName}_nahled.jpg`, content: previewImageBase64 }]
          : []),
      ],
    });
    if (sent?.error) {
      console.error(sent.error);
      return res.status(500).json({ error: "Odeslání objednávky selhalo." });
    }

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
