/*!
 * MPMDESIGN - společná konfigurace konfigurátorů.
 *
 * Objednávky se VŽDY odesílají na server, který je přepošle e-mailem.
 * Zákazníkovi se nikdy nic nestahuje.
 *
 * orderMode:
 *   "vercel"    - vlastní funkce api/order.js nasazená na Vercelu.
 *                 Doporučeno: zvládne i velké STL modely.
 *                 Vyplň orderEndpoint, např.
 *                 "https://mpmdesign.vercel.app/api/order"
 *
 *   "web3forms" - služba web3forms.com, není potřeba nic nasazovat.
 *                 Stačí vyplnit web3formsKey (přístupový klíč přijde e-mailem
 *                 po zadání adresy na web3forms.com).
 *                 Pozor: volný tarif má limit velikosti přílohy.
 *
 * Dokud není vyplněný ani jeden režim, konfigurátory objednávku neodešlou
 * a zobrazí zákazníkovi kontaktní e-mail.
 */
window.MPM_CONFIG = {
  orderMode: "vercel",
  orderEndpoint: "https://mpmdesign.vercel.app/api/order",
  web3formsKey: "",
  orderEmail: "mpmdesign@outlook.cz"
};
