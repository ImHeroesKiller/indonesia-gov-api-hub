# NusaAPI — Indonesia Government Data Hub

Portal web statis HTML5 untuk menginventarisasi, mencari, dan mengeksplorasi REST API serta portal data pemerintah pusat dan daerah di Indonesia.

## Fitur

- Dashboard sumber API pusat & daerah
- Katalog terfilter berdasarkan level, kategori, dan autentikasi
- Detail endpoint + copy URL/cURL
- Live test untuk endpoint browser-friendly
- Unified Explorer untuk portal CKAN yang dapat diakses dari browser
- Status akses + catatan CORS/WAF/credential
- Light/dark theme, mobile-first, PWA/offline shell
- Tidak memakai framework atau build step

## Arsitektur

`data/apis.json` adalah single source of truth. Tambah/edit sumber API di file itu tanpa perlu mengubah UI.

> Catatan: GitHub Pages adalah static hosting. API yang membutuhkan secret, OAuth client secret, login, private network, atau tidak mengizinkan CORS tidak boleh dipanggil langsung dari browser. Untuk sumber tersebut NusaAPI menampilkan katalog/dokumentasi dan menandainya sebagai server-side/restricted.

## Jalankan lokal

```bash
python3 -m http.server 8080
# buka http://localhost:8080
```

## Deploy GitHub Pages

Workflow `.github/workflows/pages.yml` sudah tersedia. Pada repository GitHub, buka **Settings → Pages → Build and deployment → Source: GitHub Actions**, lalu push ke `main`.

## Menambah sumber

Tambahkan object baru ke `data/apis.json` dengan minimal:

```json
{
  "id": "nama-unik",
  "name": "Nama API",
  "agency": "Instansi",
  "level": "pusat",
  "category": "Statistik",
  "kind": "rest",
  "protocol": "REST/JSON",
  "auth": "none",
  "portalStatus": "unknown",
  "browserAccess": "maybe",
  "portalUrl": "https://...",
  "baseUrl": "https://...",
  "description": "...",
  "endpoints": []
}
```

## Prinsip keamanan

Jangan pernah menaruh API key, OAuth client secret, token, cookie, atau credential lain di repository/static frontend. Untuk integrasi authenticated gunakan backend/serverless proxy milik sendiri.

## Disclaimer

Registry ini adalah katalog teknis yang terus berkembang, bukan daftar resmi tunggal dari Pemerintah Indonesia. Endpoint pemerintah dapat berubah, berpindah, memakai WAF/CORS, atau membutuhkan registrasi. Selalu verifikasi dokumentasi instansi sebelum penggunaan produksi.
