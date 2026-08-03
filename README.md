# QAQC Maintenance Log

Web app untuk track progress QAQC department (maintenance lif). Fasa ini
cover module **Cipta QAQC Baru**. Module lain (Senarai QAQC, Lif & Lokasi,
Pekerja, Laporan) dah ada slot dalam sidebar, tinggal build satu-satu lepas
ni.

Stack: **React (Vite) + Firebase (Firestore) + Vercel**.

---

## 1. Setup Firebase (± 10 minit)

1. Pergi ke [console.firebase.google.com](https://console.firebase.google.com)
   → **Add project** → ikut wizard (boleh off-kan Google Analytics, tak
   perlu untuk app ni).
2. Dalam project baru, klik ikon **`</>`** (Web app) untuk daftar app web →
   bagi nama (cth: `qaqc-app`) → **Register app**.
3. Firebase akan tunjuk `firebaseConfig` macam ni:
   ```js
   const firebaseConfig = {
     apiKey: "AIza...",
     authDomain: "xxx.firebaseapp.com",
     projectId: "xxx",
     storageBucket: "xxx.appspot.com",
     messagingSenderId: "...",
     appId: "...",
   };
   ```
4. Dalam folder project ni, copy `.env.example` jadi `.env`, dan salin
   nilai-nilai di atas masuk:
   ```bash
   cp .env.example .env
   ```
   Isikan setiap `VITE_FIREBASE_...` dengan nilai yang sepadan.
5. Dalam Firebase Console → **Build → Firestore Database** → **Create
   database** → pilih mod **production** → pilih region (cth:
   `asia-southeast1` sebab paling dekat dengan Malaysia).
6. Pergi tab **Rules**, replace dengan kandungan fail `firestore.rules` yang
   disertakan (buat masa ni dibuka untuk semua sebab belum ada login —
   **ingat nak ketatkan bila dah tambah Firebase Auth nanti**).

Collections (`employees`, `lifts`, `qaqc_records`) akan **auto-created**
sendiri bila pertama kali user tambah pekerja/lif atau hantar rekod QAQC —
tak perlu buat manual.

### Isi senarai Name CP sekali gus (bukan satu-satu)

Buka `scripts/seed.js`, edit senarai `EMPLOYEES` ikut nama sebenar,
pastikan `.env` dah diisi (langkah 4 di atas), lepas tu run:

```bash
npm run seed
```

Ini akan isi terus semua nama ke Firestore dalam satu kali jalan — dropdown
Name CP dalam borang terus ada senarai penuh bila awak buka app. Boleh run
berkali-kali (nama yang dah wujud akan di-skip, tak duplicate).

## 2. Run tempatan (local dev)

```bash
npm install
npm run dev
```

Buka `http://localhost:5173`. Form akan mula kosong — guna butang
**"+ Baru"** sebelah dropdown Nama Pekerja / Lif untuk isi data pertama
(cth: nama-nama pekerja QAQC dan kod lif yang ada).

## 3. Deploy ke Vercel

1. Push project ni ke satu GitHub repo.
2. Pergi [vercel.com](https://vercel.com) → **Add New Project** → import
   repo tersebut. Vercel akan auto-detect Vite, tak perlu ubah build
   settings.
3. Dalam **Environment Variables** semasa setup (atau Project Settings →
   Environment Variables lepas tu), tambah kesemua 6 key yang sama macam
   dalam `.env`:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`
4. Klik **Deploy**. Selesai — dapat URL production.
5. **Penting:** dalam Firebase Console → Authentication → Settings →
   **Authorized domains**, tambah domain Vercel awak (cth:
   `qaqc-app.vercel.app`).

## 4. Struktur data (Firestore)

```
employees/{id}          { name, createdAt }     // untuk dropdown Name CP

qaqc_records/{id}        {
  cpId, cpName,           // Name CP (dropdown)
  siteName,                // Job Site Name (taip)
  date,                     // Date of Checking "YYYY-MM-DD" (taip/pilih)
  unitNo,                   // Unit No (Lift/Esc/DW/I-walk) (taip)
  finding,                  // Finding During Check (taip)
  notes,                    // Catatan tambahan (pilihan)

  // Diisi semasa "update" dari Senarai QAQC:
  categories: [
    { key, label, count }
    // Motor, Main Rope, Gear Box, Pulley, Gov Rope, Brake,
    // Lift Elec, ESC Mechanical, ESC Electrical
    // — label ni TETAP (macam column hijau dalam sheet asal),
    // hanya "count" boleh diisi/ubah.
  ],
  updateRemark,             // Update defect / Remark (teks bebas)
  onProgress,                // true/false
  status,                    // Statuts (teks bebas, ikut apa ditaip)

  createdAt, updatedAt
}
```

## 5. Module sekarang

- **Cipta QAQC Baru** (`/`) — hanya **Name CP** dropdown; Job Site Name,
  Date of Checking, Unit No, dan Finding During Check semua ditaip.
- **Senarai QAQC** (`/senarai`) — semua rekod, boleh tapis ikut **Name
  CP** (ni jugak fungsi "sejarah" — pilih nama untuk tengok semua QAQC
  yang dia dah buat). Klik rekod untuk buka & update.
- **Update rekod** (`/senarai/:id`) — grid kategori defect (Motor, Main
  Rope, Gear Box, dst.) ikut gaya sheet asal: **label kategori tetap**,
  isi je nombor defect setiap kategori. Ada juga Update Defect/Remark,
  toggle On Progres (Ya/Tidak), dan Statuts (teks bebas). Klik **Simpan
  Kemaskini** untuk save.

## 6. Apa yang belum ada (sengaja, ikut skop fasa ni)

- **Login (Firebase Auth)** — awak pilih tambah lepas ni. Bila dah siap
  sedia, saya boleh bantu wire up + ketatkan `firestore.rules`.
- **Site name / Unit No jadi dropdown terurus** — buat masa ni sengaja
  ditaip terus (ikut permintaan awak). Kalau lepas ni nak jadikan senarai
  tetap (macam Name CP), boleh guna balik pattern `DropdownAdd` yang
  sama.
- **Urus Pekerja secara admin** (edit/padam nama CP) dan **Laporan** —
  struktur sidebar dah sedia, tinggal tambah `<Route>` baru dalam
  `src/App.jsx`.
- **Log siapa/bila update setiap rekod** (audit trail penuh) — buat
  masa ni hanya `updatedAt` pada rekod disimpan, bukan log berasingan
  setiap perubahan.

## 7. Struktur fail penting

```
src/
  constants.js              # kategori defect tetap + pengiraan jumlah
  firebase.js               # init Firebase, baca dari .env
  App.jsx / App.css         # layout + sidebar navigation
  components/
    DropdownAdd.jsx          # dropdown + "tambah baru" terus ke Firestore
    StatusStamp.jsx           # stamp DRAF/SEDIA HANTAR/DIHANTAR
  pages/
    CreateQAQC.jsx / .css     # module Cipta QAQC Baru
    QAQCList.jsx / .css       # module Senarai QAQC (+ tapis/sejarah)
    QAQCDetails.jsx / .css    # update rekod (grid kategori defect)
```
