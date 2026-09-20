# NusaData — Public Government Data Portal

NusaData adalah portal statis GitHub Pages untuk menampilkan **data pemerintah dari REST/JSON API publik tanpa autentikasi**.

## Kebijakan sumber

Sumber hanya boleh masuk jika:

- dapat diakses via HTTP GET publik;
- menghasilkan JSON yang valid;
- tidak membutuhkan API key;
- tidak membutuhkan OAuth;
- tidak membutuhkan login/cookie;
- tidak membutuhkan private network;
- bukan scraping HTML atau file download manual.

Jika validasi otomatis gagal, deployment diblokir untuk sumber inti.

## Sumber aktif

- BMKG Public Weather REST API
- BMKG Open Earthquake JSON

Sumber seperti BPS Web API, SATUSEHAT, Bank Indonesia API, atau portal lain yang membutuhkan credential tidak digunakan di aplikasi ini.

## Arsitektur

`Public REST API → GitHub Actions fetch/validate → same-origin JSON snapshot → GitHub Pages UI`

Snapshot data di-refresh otomatis melalui GitHub Actions.
