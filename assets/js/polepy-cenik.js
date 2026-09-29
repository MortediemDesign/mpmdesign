/*!
 * MPMDESIGN – ORIENTAČNÍ ceník polepů (výstup je rozpětí od–do).
 *
 * Sestaveno podle veřejných ceníků konkurence (září 2026), k doladění s Miguelem:
 *   [PA] polepy-aut.cz/cenik-polepu-aut.html   – polepy vozidel (bez DPH)
 *   [CH] chcipolepy.cz/cenik                   – polepy dle plochy, zadní okno (bez DPH)
 *   [BM] bonamedia.cz/cenik-polepu.html        – polepy dle plochy (bez DPH)
 *   [RZ] rezana.cz/cenik-polepu                – osobní/dodávka/výloha, minimum (bez DPH)
 *   [DD] ddtisk.cz – ceník velkoplošného tisku – fólie za m² dle materiálu
 *   [OG] okolo-grafiky.cz/cenik                – fólie za m², montáž za m² (neplátce DPH)
 *   [ST] studiodomino.cz, igelityfol.cz, taishi.cz – celopolepy
 * Konkurence většinou uvádí ceny bez DPH; Miguel není plátce DPH, čísla jsou
 * převzata tak, jak jsou (konečná cena).
 * ODHAD = číslo, které v ceníku konkurence není a je dopočítané – ověřit.
 */
(function (root) {
  "use strict";

  var CENIK = {
    minOrder: 590, // [RZ] minimální zakázka u objednávek e-mailem/telefonem

    rozsahy: {
      loga: "Loga a texty",
      castecny: "Částečný polep",
      celopolep: "Celopolep"
    },

    // Vozidla: vyroba = tisk/řezání fólie; montaz = aplikace u nás.
    // Montáž = 400 Kč/m² na nerovném povrchu [OG] × ODHAD plochy v m².
    // celkem = cena celopolepu včetně montáže, jak ji uvádí konkurence.
    // null na místě horní hranice = konkurence uvádí jen „od“.
    vozidla: {
      osobni: {
        label: "Osobní auto",
        loga: { vyroba: [800, 3000], montaz: [400, 1000] }, // [CH] 800–3000 (do 4 m²); ODHAD 1–2,5 m²
        castecny: { vyroba: [3000, 6500], montaz: [1000, 2400] }, // [CH]/[BM] od 3000, [PA] od 6500; ODHAD 2,5–6 m²
        celopolep: { celkem: [25000, 50000] } // [ST] od 25 000–38 500, [PA] od 50 000 (digitální tisk)
      },
      dodavka: {
        label: "Dodávka",
        loga: { vyroba: [2000, 6500], montaz: [800, 2000] }, // [RZ] 2098, [PA] od 6500; ODHAD 2–5 m²
        castecny: { vyroba: [6500, 11000], montaz: [2000, 4000] }, // [PA] od 6500 / od 11 000; ODHAD 5–10 m²
        celopolep: { celkem: [35000, 60000] } // [ST] VAN od 35 000–45 000, [PA] od 60 000
      },
      nakladni: {
        label: "Nákladní auto",
        loga: { vyroba: [8000, null], montaz: [2000, 4000] }, // [PA] od 8000; ODHAD 5–10 m²
        castecny: { vyroba: [35000, null], montaz: [4000, 8000] }, // [PA] od 35 000; ODHAD 10–20 m²
        celopolep: null // konkurence neuvádí – individuálně
      }
    },

    plochy: {
      typy: {
        vyloha: "Výloha a okna",
        cedule: "Cedule a deska",
        stena: "Stěna"
      },
      // Cena fólie s tiskem za m² (bez laminace, pokud není uvedeno jinak).
      materialy: {
        mat: { label: "Matná fólie", m2: [300, 540] }, // [DD] 300, [OG] monomer 400–540
        lesk: { label: "Lesklá fólie", m2: [300, 540] }, // [DD] 300, [OG] monomer 400–540
        oneway: { label: "One-way vision (zevnitř průhledná)", m2: [650, 1290], jenTypy: ["vyloha"] }, // [DD] 650, [OG] 690–1290
        odraziva: { label: "Odrazivá (reflexní)", m2: [750, 900], laminaceVcetne: true } // [DD] 750–900 s laminací
      },
      laminace: { m2: [250, 300] }, // [DD] rozdíl ceny s laminací a bez
      montaz: { m2: [200, 200] }, // [OG] rovné plochy cca 200 Kč/m²
      maxStranaCm: 2000
    },

    // Grafický návrh: Miguelova sazba 600 Kč/h (z DTF ceníku) × ODHAD 1–3 h.
    grafika: { navrh: [600, 1800] }
  };

  if (typeof module === "object" && module.exports) module.exports = CENIK;
  if (root) root.MPM_POLEPY_CENIK = CENIK;
})(typeof window !== "undefined" ? window : null);
