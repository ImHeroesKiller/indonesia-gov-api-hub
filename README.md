# NusaData — Indonesia Investment Intelligence

NusaData sekarang difokuskan sebagai **investment intelligence dashboard**, bukan portal open-data umum.

## Scope

Dashboard hanya memprioritaskan sumber yang dapat dipakai untuk merumuskan keputusan investasi:

1. Kementerian Keuangan — fiskal, APBN, public capex, transfer ke daerah
2. Direktorat Jenderal Pajak — tax base dan aktivitas sektoral
3. Direktorat Jenderal Bea dan Cukai — customs, bea masuk/keluar, trade friction
4. Bank Indonesia — kurs, policy rate, kredit, likuiditas, sistem pembayaran
5. Kementerian Dalam Negeri — kapasitas fiskal/implementasi daerah
6. Kementerian ESDM — energi, migas, resource depth
7. Kementerian Perdagangan — ekspor, impor, neraca perdagangan, komoditas
8. Kementerian Perindustrian — kapasitas industri, kawasan industri, hilirisasi

## Strict data policy

Input model hanya boleh menggunakan endpoint yang:

- resmi milik institusi;
- machine-readable;
- public REST/JSON;
- tidak membutuhkan API key;
- tidak membutuhkan OAuth/login/cookie;
- tidak membutuhkan private network;
- bukan hasil scraping halaman web.

Sumber yang resmi tetapi memerlukan autentikasi/approval, menggunakan protokol non-REST, atau sedang tidak dapat dijangkau **tetap ditampilkan sebagai gap**, tetapi tidak dihitung sebagai input model.

## Investment Signal Engine

Model menggunakan enam kelompok faktor:

- Macro & Monetary — 20%
- Fiscal & Regional Capacity — 15%
- Trade Momentum — 20%
- Industrial Capacity — 20%
- Energy & Resource Depth — 15%
- Tax & Customs Friction — 10%

**Score tidak boleh dihitung sebelum minimal 70% bobot sumber eligible tersedia.**

Ini adalah screening indicator, bukan prediksi return atau rekomendasi investasi.

## Active verified investment REST

### ESDM
ArcGIS REST Data Migas:
- sumur migas;
- Wilayah Kerja Migas 2026;
- sample atribut operasional/geografis.

### Kemenperin
CKAN REST resmi terdokumentasi untuk kapasitas industri, kawasan industri, nikel/hilirisasi, EV dan industri hijau. Saat ini konektivitas dari cloud/GitHub runner belum konsisten, sehingga source dikeluarkan dari scoring sampai feed sehat.

## Architecture

`Official Investment REST → GitHub Actions validation → normalized snapshots → Investment Signal Engine → dashboard`

Production refresh berjalan setiap 6 jam.

## Files

- `data/investment-sources.json` — source governance dan eligibility.
- `data/investment-model.json` — factor weights dan minimum coverage.
- `live/investment-summary.json` — aggregate snapshot.
- `live/investment-industry.json` — industrial intelligence.
- `live/investment-energy.json` — energy/resource intelligence.

