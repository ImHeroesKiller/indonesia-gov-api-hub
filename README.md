# NusaData — Public Data Indonesia

NusaData menampilkan **data publik Indonesia dari REST/JSON API pemerintah, BUMN, dan BUMD tanpa autentikasi**.

## Kebijakan sumber

Sumber hanya boleh masuk jika:

- dapat diakses via HTTP GET publik;
- menghasilkan JSON valid;
- tidak membutuhkan API key;
- tidak membutuhkan OAuth;
- tidak membutuhkan login/cookie;
- tidak membutuhkan private network;
- bukan scraping HTML atau file download manual.

Semua sumber aktif diuji dari GitHub Actions. Deployment diblokir bila data aktif gagal di-fetch atau gagal validasi JSON.

## Sumber aktif

### Pemerintah
1. BMKG Public Weather REST API
2. BMKG Open Earthquake JSON
3. BIG ArcGIS REST — batas administrasi desa/kelurahan
4. Satu Data Provinsi Banten — CKAN read API
5. Open Data Kabupaten Grobogan — CKAN read API

### BUMD
6. PT Food Station Tjipinang Jaya (Perseroda) — WooCommerce Store REST untuk katalog produk pangan
7. Perumda Air Minum Jaya (PAM JAYA) — ArcGIS REST untuk agregat keluhan per kelurahan

### BUMN
8. PT Waskita Karya (Persero) Tbk — WordPress REST untuk publikasi korporasi

## Data yang sengaja tidak ditampilkan

PAM JAYA hanya menggunakan **data agregat per kelurahan**. Data keluhan pelanggan individual tidak diambil atau ditampilkan.

## Arsitektur

`Public REST API → GitHub Actions fetch + validate → same-origin JSON snapshot → GitHub Pages UI`

Snapshot diperbarui otomatis setiap 30 menit.

## Kandidat yang telah diuji tetapi belum lolos

Antara lain KAI/KAI Commuter, PLN, Pelni, Pelindo, Pertamina, Telkom, InJourney, Himbara, Bulog, Pegadaian, Pos Indonesia, Bio Farma, Pupuk Indonesia, ID FOOD, SIG, Antam, Timah, WIKA, ADHI, PTPP, TransJakarta, MRT Jakarta, LRT Jakarta, Pasar Jaya, Bank DKI, Jakpro, dan Ancol. Kandidat tidak dimasukkan bila endpoint memerlukan autentikasi, terkena WAF/403, DNS/SSL gagal, tidak mengembalikan JSON data yang valid, atau bukan REST API milik entitas tersebut.
