/*!
 * MPMDESIGN - spolecna konfigurace konfiguratoru.
 *
 * orderEndpoint: URL nasazene serverless funkce api/order.js.
 * GitHub Pages neumi spoustet serverovy kod, proto funkce bezi zvlast
 * (Vercel). Dokud je hodnota prazdna, konfiguratory objednavku neodesilaji
 * na server, ale nabidnou zakaznikovi stazeni vyrobniho souboru a
 * predvyplneny e-mail - stranka tedy funguje i bez nasazeni.
 *
 * Po nasazeni na Vercel sem vloz napr.:
 *   orderEndpoint: "https://mpmdesign.vercel.app/api/order"
 */
window.MPM_CONFIG = {
  orderEndpoint: "",
  orderEmail: "info@mpmdesign.cz"
};
