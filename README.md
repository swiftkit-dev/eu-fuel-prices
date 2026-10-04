# eu-fuel-prices

Cheapest petrol or diesel near any point in **France, Spain or Italy**, from the governments'
official open data. One file, no dependencies, no API key, Node 18+.

```bash
node fuel-prices.mjs ES 40.4168 -3.7038 3 diesel    # Madrid, 3 km
node fuel-prices.mjs FR 48.8566 2.3522 3 e10         # Paris
node fuel-prices.mjs IT 45.4642 9.19 3 e5            # Milan
```

```
24 stations with diesel within 3 km (of 11470 in ES), cheapest first:

€1.899   1.4 km  BALLENOIL, RONDA SEGOVIA, 37, MADRID
€1.935   2.1 km  SHELL, PASEO SANTA MARIA DE LA CABEZA, 90, MADRID
€1.949   1.5 km  SHELL, CALLE ALBERTO AGUILERA, 18, MADRID
```

## Sources

| Country | Stations | Source | License |
|---|---|---|---|
| France | ~9,800 | Ministère de l'Économie, *Prix des carburants – flux instantané v2* | Licence Ouverte 2.0 |
| Spain | ~11,500 | Ministerio para la Transición Ecológica, Geoportal de Hidrocarburos | Reuse with attribution |
| Italy | ~21,500 | Ministero delle Imprese e del Made in Italy, Osservaprezzi carburanti | IODL 2.0 |

Please attribute the source when you publish the data.

## Parsing notes

- **France:** the dataset's records API pages at 100. The `/exports/json` endpoint returns everything
  in one request, and `select=` keeps it small.
- **Spain:** all numbers are strings with **comma decimals** (`"1,849"`, `"-3,717528"`).
  Longitudes are negative in most of Spain, so don't filter out values ≤ 0.
- **Italy:** two `|`-separated CSVs joined on `idImpianto`; skip the first line (`Estrazione del …`).
  Each fuel can appear as self-service and served; the script prefers self-service. The operator
  name column is skipped on purpose (it can be a private person).
- Prices are compared **within one country** only (taxes differ).

## Need more?

The hosted version adds the **UK** (retailers' open feeds), all fuels (premium diesel, E85, CNG),
search by city or postcode, stale-price and typo filtering, per-country price summaries, and a
JSON/CSV/Excel export. It runs on Apify: **[Fuel Prices Europe](https://apify.com/swiftkit/fuel-prices)**.

## License

MIT (code). Data under each source's license above.
