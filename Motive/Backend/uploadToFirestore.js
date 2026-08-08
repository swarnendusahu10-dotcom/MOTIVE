// uploadToFirestore.js
//
// Bulk upload the Karnataka FIR dataset into Firestore.
//
// IMPORTANT: This must write into the exact same collection and shape that
// the backend agents read (services/firebase_service.py -> CRIMES = "crimes",
// and routes/crime_data.py -> _flatten_for_agents). Previously this script
// pushed raw nested records into a different collection ("crime_records")
// with auto-generated doc IDs, which the chatbot could never see -- it was
// always querying "crimes" and looking cases up by doc ID. That's why the
// bot reported "no record found" even though the data existed in Firestore.
//
// This script now mirrors routes/crime_data.py's _flatten_for_agents():
// every record is stored with the flat top-level fields the agent tools
// query (district, taluk, crime_type, description, date, location,
// reported_by, case_id, status) AND the full original nested payload
// (fir_information, crime_classification, incident_details, victims,
// suspects, evidence, witnesses, narrative) preserved in the same document
// -- so nothing is lost and the chatbot can still drill into full detail.
//
// The document ID is the FIR number (e.g. "KAR-2025-1008"), matching how
// fb.get_crime_record()/get_case_by_id() look records up (a direct doc-ID
// get, no query) -- so officers can search by the FIR number they actually
// have.
//
// Run:
// npm install firebase-admin
// node uploadToFirestore.js
//
// If you've run the old version of this script before, delete the stray
// "crime_records" collection in the Firebase console afterwards -- it's
// dead data nothing reads anymore.

const fs = require("fs");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// ── CONFIG ────────────────────────────────────────────────────────────
const SERVICE_ACCOUNT_PATH = "./firebase-service-account.json";
const DATA_PATH = "./data/karnataka_fir_dataset.json";
// This MUST match services/firebase_service.py's CRIMES constant -- that
// module (and everything the chatbot uses: agents/tools_db.py,
// tools_geo.py, tools_pattern.py) only ever reads from this one
// collection. There is exactly one collection for case data; keep it that
// way for anything uploaded in the future too.
const COLLECTION_NAME = "crimes";
const BATCH_SIZE = 400;

// ── FIREBASE INIT ─────────────────────────────────────────────────────
const serviceAccount = require(SERVICE_ACCOUNT_PATH);

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// ── FLATTEN (mirrors routes/crime_data.py::_flatten_for_agents) ────────
function flattenForAgents(record, index) {
  const firInfo = record.fir_information || {};
  const crime = record.crime_classification || {};
  const incident = record.incident_details || {};
  const location = incident.location || {};

  const district = location.district || firInfo.district || "";
  const caseId =
    firInfo.fir_number || `KSP-${Date.now().toString(36).toUpperCase()}-${index}`;

  return {
    // Full original nested FIR, preserved as-is for detailed lookups.
    ...record,

    // Flat fields the agent tools (services/firebase_service.py and
    // everything built on it) actually query.
    case_id: caseId,
    district,
    taluk: location.taluk || "",
    crime_type: crime.category || "",
    crime_subcategory: crime.subcategory || "",
    severity: crime.severity || "",
    description: record.narrative || incident.description || "",
    date: incident.date || firInfo.registration_date || "",
    location: {
      lat: location.lat ?? null,
      lng: location.lng ?? null,
    },
    reported_by: record.reported_by || firInfo.police_station || "",
    status: record.status || "open",

    // Match the format Python's datetime.now(timezone.utc).isoformat()
    // produces, since existing docs in this collection already use that
    // (string) format for created_at -- keeping the type consistent
    // matters for order_by("created_at") queries.
    created_at: new Date().toISOString(),
  };
}

// ── UPLOAD FUNCTION ───────────────────────────────────────────────────
async function upload() {
  const raw = fs.readFileSync(DATA_PATH, "utf8");
  const records = JSON.parse(raw);

  console.log(
    `Loaded ${records.length} records. Uploading to "${COLLECTION_NAME}"...`
  );

  let uploaded = 0;

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const chunk = records.slice(i, i + BATCH_SIZE);

    const batch = db.batch();

    for (let j = 0; j < chunk.length; j++) {
      const flattened = flattenForAgents(chunk[j], i + j);
      // Doc ID = case_id (the FIR number), NOT an auto-generated ID, so
      // fb.get_crime_record(case_id) / get_case_by_id can fetch it
      // directly instead of only ever finding it via a full scan.
      const docRef = db.collection(COLLECTION_NAME).doc(flattened.case_id);
      batch.set(docRef, flattened, { merge: true });
    }

    await batch.commit();

    uploaded += chunk.length;

    console.log(`Committed ${uploaded}/${records.length}`);
  }

  console.log(`Upload completed successfully into "${COLLECTION_NAME}".`);
  process.exit(0);
}

// ── RUN ───────────────────────────────────────────────────────────────
upload().catch((err) => {
  console.error("Upload failed:");
  console.error(err);
  process.exit(1);
});