#!/usr/bin/env node
// Cheapest fuel near a point, from official open data (France, Spain, Italy). No dependencies, Node 18+.
//
//   node fuel-prices.mjs ES 40.4168 -3.7038 5 diesel     # Spain, Madrid, 5 km, diesel
//   node fuel-prices.mjs FR 48.8566 2.3522 3 e10          # France, Paris
//   node fuel-prices.mjs IT 45.4642 9.19 5 e5             # Italy, Milan
//
// Fuels: diesel, e5 (95), e10, super98, lpg

const UA = 'eu-fuel-prices/1.0 (+https://github.com/swiftkit-dev/eu-fuel-prices)';
const get = async (url, json = true) => {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error(`${res.status} for ${url}`);
    return json ? res.json() : res.text();
};
const num = (x) => { const n = Number(String(x ?? '').replace(',', '.')); return n > 0 ? n : null; }; // prices; Spain uses "1,849"
const coord = (x) => { const n = Number(String(x ?? '').replace(',', '.')); return x !== '' && Number.isFinite(n) ? n : null; }; // can be negative

const SOURCES = {
    // Ministère de l'Économie, Licence Ouverte 2.0. The export endpoint returns all ~9,800 stations at once.
    async FR() {
        const rows = await get('https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/exports/json?select=id,adresse,ville,cp,geom,gazole_prix,sp95_prix,e10_prix,sp98_prix,gplc_prix');
        return rows.map((r) => ({ name: `${r.adresse}, ${r.cp} ${r.ville}`, lat: r.geom?.lat, lon: r.geom?.lon,
            prices: { diesel: r.gazole_prix, e5: r.sp95_prix, e10: r.e10_prix, super98: r.sp98_prix, lpg: r.gplc_prix } }));
    },
    // Ministerio para la Transición Ecológica: every station in one JSON. Numbers use comma decimals.
    async ES() {
        const j = await get('https://sedeaplicaciones.minetur.gob.es/ServiciosRESTCarburantes/PreciosCarburantes/EstacionesTerrestres/');
        return j.ListaEESSPrecio.map((r) => ({ name: `${r['Rótulo']}, ${r['Dirección']}, ${r.Localidad}`, lat: coord(r.Latitud), lon: coord(r['Longitud (WGS84)']),
            prices: { diesel: num(r['Precio Gasoleo A']), e5: num(r['Precio Gasolina 95 E5']), e10: num(r['Precio Gasolina 95 E10']), super98: num(r['Precio Gasolina 98 E5']), lpg: num(r['Precio Gases licuados del petróleo']) } }));
    },
    // Ministero delle Imprese e del Made in Italy (IODL 2.0): two '|'-separated CSVs, first line is a date.
    async IT() {
        const [prices, stations] = await Promise.all([
            get('https://www.mimit.gov.it/images/exportCSV/prezzo_alle_8.csv', false),
            get('https://www.mimit.gov.it/images/exportCSV/anagrafica_impianti_attivi.csv', false),
        ]);
        const lines = (t) => t.split(/\r?\n/).slice(2).filter(Boolean).map((l) => l.split('|'));
        const fuel = { Benzina: 'e5', Gasolio: 'diesel', GPL: 'lpg' };
        const byId = new Map();
        for (const [id, desc, price, isSelf] of lines(prices)) {
            const k = fuel[desc];
            if (!k || !num(price)) continue;
            const p = byId.get(id) || {};
            if (isSelf === '1' || p[k] === undefined) p[k] = num(price); // prefer self-service
            byId.set(id, p);
        }
        // The operator name column is skipped on purpose: for small stations it can be a private person.
        return lines(stations).filter(([id]) => byId.has(id)).map(([id, , brand, , , address, city, , lat, lon]) => ({
            name: `${brand}, ${address?.trim()}, ${city}`, lat: coord(lat), lon: coord(lon), prices: byId.get(id) }));
    },
};

const toRad = (d) => (d * Math.PI) / 180;
const km = (a, b, c, d) => 6371 * 2 * Math.asin(Math.sqrt(Math.sin(toRad(c - a) / 2) ** 2 + Math.cos(toRad(a)) * Math.cos(toRad(c)) * Math.sin(toRad(d - b) / 2) ** 2));

const [country = '', lat, lon, radius = '5', fuel = 'diesel'] = process.argv.slice(2);
if (!SOURCES[country.toUpperCase()] || lat === undefined || lon === undefined) {
    console.error('Usage: node fuel-prices.mjs <FR|ES|IT> <lat> <lon> [radiusKm=5] [diesel|e5|e10|super98|lpg]');
    process.exitCode = 1;
} else {
    const stations = await SOURCES[country.toUpperCase()]();
    const near = stations
        .filter((s) => s.lat !== null && s.lon !== null && s.prices[fuel])
        .map((s) => ({ ...s, km: km(Number(lat), Number(lon), s.lat, s.lon) }))
        .filter((s) => s.km <= Number(radius))
        .sort((a, b) => a.prices[fuel] - b.prices[fuel]);
    console.log(`${near.length} stations with ${fuel} within ${radius} km (of ${stations.length} in ${country.toUpperCase()}), cheapest first:\n`);
    for (const s of near.slice(0, 15)) console.log(`€${s.prices[fuel].toFixed(3)}  ${s.km.toFixed(1).padStart(4)} km  ${s.name}`);
}
