# NusaData — Public Data Indonesia

NusaData menampilkan **data publik Indonesia dari REST/JSON API pemerintah, BUMN, dan BUMD tanpa autentikasi**.

## Kebijakan sumber

Sumber hanya boleh masuk jika:

- dapat diakses publik melalui HTTP GET;
- menghasilkan JSON yang valid;
- tidak membutuhkan API key;
- tidak membutuhkan OAuth;
- tidak membutuhkan login/cookie;
- tidak membutuhkan private network;
- bukan scraping HTML atau file download manual.

Semua sumber aktif diuji melalui GitHub Actions sebelum dipublikasikan.

## Sumber aktif

### Pemerintah
1. BMKG Public Weather REST API
2. BMKG Open Earthquake JSON
3. BIG ArcGIS REST — batas administrasi desa/kelurahan
4. Satu Data Provinsi Banten — CKAN read API
5. Open Data Kabupaten Grobogan — CKAN read API

### BUMD
6. PT Food Station Tjipinang Jaya (Perseroda) — WooCommerce Store REST, katalog produk pangan
7. Perumda Air Minum Jaya (PAM JAYA) — ArcGIS REST, agregat keluhan per kelurahan

### BUMN
8. PT Waskita Karya (Persero) Tbk — WordPress REST, publikasi korporasi

## Arsitektur

`Public REST API → GitHub Actions fetch + validate → same-origin JSON snapshot → GitHub Pages UI`

Snapshot diperbarui otomatis setiap 30 menit.

## Kandidat yang belum dimasukkan

Sumber yang membutuhkan key/OAuth/login, hanya mengembalikan HTML, memakai endpoint internal/dev, atau tidak stabil dari runner tidak dimasukkan. Contohnya BRI API ber-OAuth, TransJakarta route endpoint berbasis HTML POST, dan kandidat PLN/KAI yang belum memenuhi stabilitas/route data publik yang dibutuhkan.
