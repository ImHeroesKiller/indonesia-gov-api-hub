# NusaData — Public Data Indonesia

NusaData menampilkan **data publik Indonesia dari REST/JSON API pemerintah, BUMN, dan BUMD tanpa autentikasi**.

## Kebijakan sumber

Sumber hanya boleh masuk jika:
- dapat diakses via HTTP GET publik;
- menghasilkan JSON/GeoJSON valid;
- tidak membutuhkan API key, OAuth, login, cookie, atau credential;
- tidak membutuhkan private network;
- bukan scraping HTML atau file download manual.

Semua sumber aktif diuji dari GitHub Actions. Snapshot inti diblokir bila validasi sumber wajib gagal. Discovery/indicator lookups yang bersifat pelengkap memakai fallback agar satu portal daerah tidak menjatuhkan seluruh dashboard.

## Coverage saat ini

- **17 source REST/JSON aktif** dalam registry.
- **6 dari 38 provinsi** sudah diverifikasi langsung dari GitHub Actions sebagai public CKAN REST/no-auth:
  1. Aceh — ±4.175 dataset
  2. Sumatera Barat — ±3.165 dataset
  3. Sumatera Selatan — ±948 dataset
  4. Banten — CKAN + DataStore statistik langsung
  5. Jawa Tengah — ±211.541 dataset
  6. Kalimantan Timur — ±13.245 dataset
- Kabupaten Grobogan dipertahankan sebagai pilot level kabupaten dan tidak dihitung sebagai provinsi.

Angka katalog berasal dari respons `package_search` saat snapshot/probe dan dapat berubah mengikuti portal sumber.

## Domain data aktif

- Cuaca & iklim — BMKG.
- Bencana & geofisika — BMKG.
- Geospasial & administrasi — BIG.
- Transportasi, jalan & RDTR — DKI Jakarta ArcGIS REST.
- Energi & migas — ESDM Data Migas.
- Pendidikan, kesehatan, ekonomi, lingkungan, pertanian, demografi, sosial, ketenagakerjaan & keuangan — katalog CKAN lintas daerah.
- Statistik langsung Banten — pengangguran, kemiskinan, pendapatan daerah, SMK, tempat tidur RS, sampah, produksi perkebunan, IHK.
- Harga pangan — Food Station.
- Pelayanan air — PAM JAYA agregat per kelurahan.
- BUMN infrastruktur — Waskita Karya.

## Sumber regional terverifikasi

- OpenData Aceh
- Satu Data Sumatera Barat
- Open Data Sumatera Selatan
- Satu Data Provinsi Banten
- Open Data Jawa Tengah
- Satu Data Kalimantan Timur
- Open Data Kabupaten Grobogan

## Kandidat regional yang belum lolos

Tidak dimasukkan ke production bila probe no-auth gagal. Contoh hasil terakhir:
- Kalimantan Barat — HTTP 403.
- Jawa Timur — HTTP 403 pada endpoint CKAN yang diuji.
- Bali — DNS gagal.
- Lampung — endpoint kandidat mengembalikan HTTP 404.
- DI Yogyakarta, Kalimantan Tengah, Gorontalo, Sulawesi Tengah, Papua — DNS/resolve gagal pada endpoint kandidat.
- NTB dan Maluku — HTTP 404.
- Kalimantan Selatan dan Sulawesi Selatan — HTTP 403.
- Sulawesi Utara dan Sulawesi Tenggara — timeout.

## Privasi

PAM JAYA hanya menggunakan **data agregat per kelurahan**. Data pelanggan individual tidak diambil atau ditampilkan.

## Arsitektur

`Public REST API → GitHub Actions fetch + validate → normalized same-origin JSON snapshot → GitHub Pages dashboard`

Snapshot dijadwalkan diperbarui setiap 30 menit. Probe/discovery workflow dipisahkan dari production deploy.
