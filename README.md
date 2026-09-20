# NusaData — Business Cost & Compliance

NusaData difokuskan menjadi kalkulator biaya bisnis Indonesia untuk kebutuhan budgeting dan compliance.

## Fokus

1. **Business Tax**
   - PPh Badan umum 22%
   - fasilitas Pasal 31E
   - PPh Final UMKM 0,5% sesuai PP 20/2026 untuk subjek yang eligible
   - PPN efektif 11% untuk non-mewah dan 12% untuk barang mewah
   - quick reference PPh 22 dan PPh 23

2. **Payroll Cost**
   - UMP / UMK / UMSK 2026
   - employer cost per employee
   - total monthly cost berdasarkan headcount
   - optional THR accrual

3. **BPJS**
   - BPJS Kesehatan PPU
   - JHT
   - JP
   - JKK per kelas risiko
   - JKM
   - employee deductions sebelum PPh 21

## Data policy

Ruleset disimpan di `data/business-rates.json` dan hanya memakai parameter yang memiliki dasar regulasi atau publikasi resmi. Minimum wage adalah regulatory snapshot, bukan live API.

## Catatan penting

- Istilah resmi adalah **UMP/UMK/UMSK**, bukan UMR.
- Upah minimum terutama berlaku bagi pekerja dengan masa kerja kurang dari 1 tahun. Pekerja dengan masa kerja 1 tahun atau lebih menggunakan Struktur dan Skala Upah.
- PPh 21 belum dimasukkan ke employer cost karena metode TER/PTKP dan kebijakan gross-up berbeda per perusahaan.
- Hasil kalkulator digunakan untuk estimasi budgeting, bukan pengganti perhitungan pajak/payroll resmi.

