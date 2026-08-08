import { db } from "./firebaseConfig.js";
import {
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";

// Backend used only for embedding generation now (agents read Firestore directly).
export const API_BASE = "http://localhost:8000";

const COLLECTION = "firs";

/** Blank FIR matching the schema exactly. */
export function createEmptyFIR() {
  return {
    firId: generateFirId(),
    metadata: {
      firNumber: "",
      policeStation: "",
      district: "",
      state: "Karnataka",
      registrationDate: new Date().toISOString().slice(0, 10),
    },
    crime: {
      category: "",
      subcategory: "",
      severity: "",
    },
    incident: {
      date: "",
      time: "",
      location: {
        address: "",
        city: "",
        district: "",
        state: "Karnataka",
        latitude: 0,
        longitude: 0,
      },
    },
    victims: [],
    suspects: [],
    evidence: [],
    witnesses: [],
    narrative: "",
    status: "Pending",
    createdAt: "",
    updatedAt: "",
  };
}

export function generateFirId() {
  const year = new Date().getFullYear();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `FIR-${year}-${rand}`;
}

export function emptyVictim() {
  return { name: "", age: "", gender: "", occupation: "", phone: "", address: "" };
}

export function emptySuspect() {
  return {
    known: true,
    name: "",
    alias: "",
    age: "",
    gender: "",
    relationshipToVictim: "",
    description: "",
    vehicleDetails: "",
  };
}

export function emptyEvidence() {
  return { type: "CCTV", description: "" };
}

export function emptyWitness() {
  return { name: "", phone: "", statement: "" };
}

/**
 * Save the FIR as-is to Firestore (called on every change, debounced by the
 * wizard) so nothing is lost if the officer closes the tab mid-entry.
 * status stays "Pending". This is the ONLY place case data is stored —
 * there is no separate database; the backend agents read this same
 * `firs` collection directly.
 */
export async function saveFIRDraft(firData) {
  const ref = doc(db, COLLECTION, firData.firId);
  await setDoc(
    ref,
    {
      ...firData,
      updatedAt: serverTimestamp(),
      createdAt: firData.createdAt || serverTimestamp(),
    },
    { merge: true }
  );
  return firData.firId;
}

/**
 * Final submit: marks status "Submitted" and writes to Firestore.
 * Then asks the backend to generate a text embedding for this case and
 * merge it into the SAME Firestore document (adds one `embedding` field) —
 * that's what lets the Similarity Agent find related cases later. The
 * embedding step is best-effort: if the backend is unreachable, the FIR
 * itself is still safely saved.
 */
export async function submitFIR(firData) {
  const finalData = { ...firData, status: "Submitted" };
  const ref = doc(db, COLLECTION, finalData.firId);
  await setDoc(
    ref,
    {
      ...finalData,
      updatedAt: serverTimestamp(),
      createdAt: finalData.createdAt || serverTimestamp(),
    },
    { merge: true }
  );

  try {
    await requestEmbedding(finalData);
  } catch (err) {
    console.error("Embedding request failed (FIR is still saved in Firestore):", err);
  }

  return finalData.firId;
}

async function requestEmbedding(fir) {
  const text = [
    fir.crime?.category,
    fir.crime?.subcategory,
    fir.narrative,
  ].filter(Boolean).join(". ");

  if (!text.trim()) return;

  const res = await fetch(`${API_BASE}/cases/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fir_id: fir.firId, text }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status}`);
  }
  return res.json();
}
