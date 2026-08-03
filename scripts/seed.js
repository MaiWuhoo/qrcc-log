// Seed data awal untuk nama CP (employees) supaya dropdown dalam borang
// terus ada pilihan, tak payah tambah satu-satu guna butang "+ Baru".
//
// CARA GUNA:
// 1. Edit senarai EMPLOYEES di bawah ikut nama sebenar awak.
// 2. Pastikan fail .env (root project) dah diisi dengan Firebase config.
// 3. Run: node scripts/seed.js
//
// Boleh run berkali-kali — script akan skip nama yang dah wujud
// (tak akan duplicate).

import "dotenv/config";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";

// ---- EDIT SENARAI NI IKUT DATA SEBENAR ----
const EMPLOYEES = [
  "Sabar Bin Romli",
  "Zamri Bin Abdul Ghani",
  "Muhammad Syamil Bin Salleh",
  "Mohd. Fadzli Bin Dermawi",
  "Ahmad Rostam Affendi Bin Shamsuddin",
  "Zulkepli Bin Gembor",
  "Jayakumar A/L Balasubramaniam",
  "Muhammad Ridwan Bin Md Jaffrey",
  "Shangkar Rao A/L Sarappatti Rama Naidu",
  "Hazarasim Bin Abas",
  "Rajasekaran A/L Tangaveloo",
  "Syed Ahmad Nasrullah Bin. Syed Mohd.",
  "Zainal Bin. Hassan",
  "Zainol Bin Saad",
  "Aldwin Antong",
  "Mohd Rizal Bin. Mohd Razali",
  "Mohd Azral Bin. Abd Aziz",
  "Rajan Devadason A/L Doraisamy",
  "Chua Chin Tong",
  "Mohd Faizal Bin Yahaya",
  "Loh Chee Keong",
];
// --------------------------------------------

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error(
    "Firebase config tak lengkap. Pastikan fail .env dah diisi (lihat .env.example).",
  );
  process.exit(1);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seedCollection(collectionName, names) {
  const snap = await getDocs(collection(db, collectionName));
  const existing = new Set(snap.docs.map((d) => d.data().name));

  let added = 0;
  for (const name of names) {
    if (existing.has(name)) {
      console.log(`  - "${name}" dah wujud, skip.`);
      continue;
    }
    await addDoc(collection(db, collectionName), {
      name,
      createdAt: serverTimestamp(),
    });
    console.log(`  + "${name}" ditambah.`);
    added++;
  }
  return added;
}

async function main() {
  console.log("Seeding employees (Name CP)...");
  const empAdded = await seedCollection("employees", EMPLOYEES);

  console.log(`\nSelesai. ${empAdded} nama CP baru ditambah.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
