# NusaData — Public Government Data Portal

NusaData menampilkan **data pemerintah Indonesia dari REST/JSON API publik tanpa autentikasi**.

## Kebijakan sumber

Sumber hanya boleh masuk jika:

- dapat diakses via HTTP GET publik;
- menghasilkan JSON valid;
- tidak membutuhkan API key;
- tidak membutuhkan OAuth;
- tidak membutuhkan login/cookie;
- tidak membutuhkan private network;
- bukan scraping HTML atau file download manual.

Semua sumber aktif diuji dari GitHub Actions. Deployment diblokir bila data inti gagal di-fetch atau gagal validasi JSON.

## Sumber aktif

1. BMKG Public Weather REST API
2. BMKG Open Earthquake JSON
3. BIG ArcGIS REST — batas administrasi desa/kelurahan
4. Satu Data Provinsi Banten — CKAN read API
5. Open Data Kabupaten Grobogan — CKAN read API

## Arsitektur

`Public REST API → GitHub Actions fetch + validate → same-origin JSON snapshot → GitHub Pages UI`

Snapshot diperbarui otomatis setiap 30 menit.

## Kandidat yang belum dimasukkan

- BNPB ArcGIS REST tersedia publik, tetapi layer query yang diuji belum konsisten dan belum dimasukkan.
- Satu Data Jayawijaya terdokumentasi menggunakan CKAN API, tetapi endpoint DNS gagal saat probe pada 20 September 2026.
