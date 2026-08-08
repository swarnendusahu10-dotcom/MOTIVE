import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ParticleCanvas from './Animations/ParticleCanvas.jsx';
import GridOverlay from './Animations/GridOverlay.jsx';
import CornerBrackets from './Animations/CornerBrackets.jsx';
import { api } from '../lib/api.js';

// ─────────────────────────────────────────────────────────────────────────
// Static option lists
// ─────────────────────────────────────────────────────────────────────────

const DISTRICTS = [
  'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Tumakuru', 'Kolar',
  'Chikkaballapura', 'Ramanagara', 'Mandya', 'Hassan', 'Chikkamagaluru',
  'Kodagu', 'Dakshina Kannada', 'Udupi', 'Shivamogga', 'Uttara Kannada',
  'Dharwad', 'Gadag', 'Haveri', 'Belagavi', 'Vijayapura', 'Bagalkot',
  'Koppal', 'Ballari', 'Chitradurga', 'Davangere', 'Raichur', 'Yadgir',
  'Kalaburagi', 'Bidar', 'Chamarajanagar', 'State HQ (SCRB)',
];

const CRIME_TYPES = [
  'Chain snatching', 'Cyber fraud', 'Narcotics', 'Burglary', 'Assault',
  'Vehicle theft', 'Robbery', 'Homicide', 'Kidnapping', 'Other',
];

const SEVERITIES = ['Low', 'Medium', 'High', 'Critical'];
const GENDERS = ['Male', 'Female', 'Other', 'Unknown'];
const EVIDENCE_TYPES = ['CCTV', 'Photograph', 'Document', 'Weapon', 'Digital / Cyber', 'Other'];

const STEPS = [
  'FIR Information',
  'Crime Classification',
  'Incident Details',
  'Victim Details',
  'Suspect Details',
  'Evidence & Witnesses',
  'FIR Narrative',
  'Review & Submit',
];

// ─────────────────────────────────────────────────────────────────────────
// Empty record shape — mirrors backend routes/crime_data.py FIRRecordIn
// ─────────────────────────────────────────────────────────────────────────

const emptyVictim = () => ({ name: '', age: '', gender: '', occupation: '', phone: '', address: '' });
const emptySuspect = () => ({
  known: true, name: '', alias: '', age: '', gender: '',
  relationship_to_victim: '', description: '', vehicle_details: '',
});
const emptyEvidence = () => ({ type: 'CCTV', description: '' });
const emptyWitness = () => ({ name: '', phone: '', statement: '' });

const INITIAL_FIR = {
  fir_information: {
    fir_number: '', police_station: '', district: '', state: 'Karnataka', registration_date: '',
  },
  crime_classification: { category: '', subcategory: '', severity: '' },
  incident_details: {
    date: '', time: '',
    location: { address: '', city: '', taluk: '', district: '', state: 'Karnataka', lat: '', lng: '' },
    description: '',
  },
  victims: [emptyVictim()],
  suspects: [emptySuspect()],
  evidence: [],
  witnesses: [],
  narrative: '',
  reported_by: '',
  status: 'open',
};

// ─────────────────────────────────────────────────────────────────────────
// Themed primitives (same visual language as the rest of the app:
// dark glass panels, cyan accents, Rajdhani font, mono labels)
// ─────────────────────────────────────────────────────────────────────────

function Field({ label, required, error, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-mono tracking-[0.2em] flex items-center gap-1"
        style={{ color: error ? '#ff2d55' : 'rgba(0,212,255,0.55)' }}>
        {label}
        {required && <span style={{ color: '#ff2d55' }}>*</span>}
        {error && <span className="ml-auto text-[9px]" style={{ color: '#ff2d55' }}>{error}</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = (focused, error) => ({
  background:   'rgba(0,0,0,0.5)',
  border:       `1px solid ${error ? 'rgba(255,45,85,0.6)' : focused ? 'rgba(0,212,255,0.6)' : 'rgba(0,212,255,0.15)'}`,
  borderRadius: 6,
  color:        'rgba(200,240,255,0.9)',
  fontFamily:   "'Rajdhani', sans-serif",
  fontSize:     14,
  fontWeight:   500,
  padding:      '9px 12px',
  outline:      'none',
  width:        '100%',
  boxShadow:    focused ? '0 0 0 2px rgba(0,212,255,0.08), 0 0 12px rgba(0,212,255,0.1)' : 'none',
  transition:   'all 0.2s',
  caretColor:   '#00d4ff',
});

const panelStyle = {
  background:     'rgba(4,10,20,0.92)',
  border:         '1px solid rgba(0,212,255,0.12)',
  backdropFilter: 'blur(20px)',
  boxShadow:      '0 0 40px rgba(0,0,0,0.8), inset 0 1px 0 rgba(0,212,255,0.1)',
};

const ghostBtn = {
  background: 'rgba(0,212,255,0.08)',
  border: '1px solid rgba(0,212,255,0.3)',
  color: '#00d4ff',
};

const dangerGhostBtn = {
  background: 'rgba(255,45,85,0.08)',
  border: '1px solid rgba(255,45,85,0.35)',
  color: '#ff2d55',
};

function TextInput({ value, onChange, placeholder, type = 'text' }) {
  const [focused, setFocused] = useState(false);
  return (
    <input type={type} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={inputStyle(focused, false)} />
  );
}

function TextArea({ value, onChange, placeholder, rows = 3 }) {
  const [focused, setFocused] = useState(false);
  return (
    <textarea rows={rows} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={{ ...inputStyle(focused, false), resize: 'vertical' }} />
  );
}

function Select({ value, onChange, options, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
      style={inputStyle(focused, false)}>
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function SectionCard({ children }) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-4"
      style={{ background: 'rgba(0,212,255,0.03)', border: '1px solid rgba(0,212,255,0.1)' }}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Step indicator
// ─────────────────────────────────────────────────────────────────────────

function StepIndicator({ step, onJump }) {
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {STEPS.map((label, i) => {
        const state = i === step ? 'active' : i < step ? 'done' : 'todo';
        return (
          <button key={label} onClick={() => onJump(i)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[9px] font-mono tracking-wider uppercase transition-all"
            style={{
              background: state === 'active' ? 'rgba(0,212,255,0.14)' : state === 'done' ? 'rgba(48,209,88,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${state === 'active' ? 'rgba(0,212,255,0.5)' : state === 'done' ? 'rgba(48,209,88,0.3)' : 'rgba(255,255,255,0.08)'}`,
              color: state === 'active' ? '#00d4ff' : state === 'done' ? '#30d158' : 'rgba(200,220,240,0.35)',
              cursor: 'pointer',
            }}>
            <span style={{ opacity: 0.7 }}>{String(i + 1).padStart(2, '0')}</span>
            <span className="hidden md:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────

export default function CrimeDataEntry() {
  const navigate = useNavigate();
  const [fir, setFir] = useState(INITIAL_FIR);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(null);
  const [serverError, setServerError] = useState('');

  // ── nested-field helpers ──────────────────────────────────────────────
  const setGroup = (group, key, value) =>
    setFir((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));

  const setLocation = (key, value) =>
    setFir((f) => ({
      ...f,
      incident_details: {
        ...f.incident_details,
        location: { ...f.incident_details.location, [key]: value },
      },
    }));

  const setListItem = (listKey, index, key, value) =>
    setFir((f) => {
      const list = [...f[listKey]];
      list[index] = { ...list[index], [key]: value };
      return { ...f, [listKey]: list };
    });

  const addListItem = (listKey, factory) =>
    setFir((f) => ({ ...f, [listKey]: [...f[listKey], factory()] }));

  const removeListItem = (listKey, index) =>
    setFir((f) => ({ ...f, [listKey]: f[listKey].filter((_, i) => i !== index) }));

  // ── per-step validation ───────────────────────────────────────────────
  const validateStep = (i) => {
    const e = {};
    if (i === 0) {
      if (!fir.fir_information.district) e.district = 'Required';
      if (!fir.fir_information.registration_date) e.registration_date = 'Required';
    }
    if (i === 1) {
      if (!fir.crime_classification.category) e.category = 'Required';
      if (!fir.crime_classification.severity) e.severity = 'Required';
    }
    if (i === 2) {
      if (!fir.incident_details.date) e.date = 'Required';
      if (!fir.incident_details.description.trim()) e.description = 'Required';
    }
    if (i === 6) {
      if (!fir.narrative.trim()) e.narrative = 'Required';
    }
    return e;
  };

  const goNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => { setErrors({}); setStep((s) => Math.max(s - 1, 0)); };
  const jumpTo = (i) => { setErrors({}); setStep(i); };

  const handleSubmit = async () => {
    for (let i = 0; i <= 2; i++) {
      const e = validateStep(i);
      if (Object.keys(e).length > 0) { setStep(i); setErrors(e); return; }
    }
    const e6 = validateStep(6);
    if (Object.keys(e6).length > 0) { setStep(6); setErrors(e6); return; }

    setServerError('');
    setSubmitting(true);
    try {
      const payload = {
        ...fir,
        incident_details: {
          ...fir.incident_details,
          location: {
            ...fir.incident_details.location,
            lat: fir.incident_details.location.lat ? parseFloat(fir.incident_details.location.lat) : null,
            lng: fir.incident_details.location.lng ? parseFloat(fir.incident_details.location.lng) : null,
          },
        },
        status: 'open',
      };
      const res = await api.submitCrimeRecord(payload);
      setSubmitted(res.record.case_id);
      setFir(INITIAL_FIR);
      setStep(0);
    } catch (err) {
      setServerError(err.message || 'Could not reach the backend.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── step content ──────────────────────────────────────────────────────
  const renderStep = () => {
    switch (step) {
      case 0: // FIR Information
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="FIR NUMBER">
              <TextInput value={fir.fir_information.fir_number}
                onChange={(v) => setGroup('fir_information', 'fir_number', v)}
                placeholder="Auto-generated if left blank" />
            </Field>
            <Field label="POLICE STATION">
              <TextInput value={fir.fir_information.police_station}
                onChange={(v) => setGroup('fir_information', 'police_station', v)}
                placeholder="e.g. Cubbon Park PS" />
            </Field>
            <Field label="DISTRICT" required error={errors.district}>
              <Select value={fir.fir_information.district}
                onChange={(v) => { setGroup('fir_information', 'district', v); setLocation('district', v); }}
                options={DISTRICTS} placeholder="Select district" />
            </Field>
            <Field label="STATE">
              <TextInput value={fir.fir_information.state}
                onChange={(v) => setGroup('fir_information', 'state', v)} />
            </Field>
            <Field label="REGISTRATION DATE" required error={errors.registration_date}>
              <TextInput type="date" value={fir.fir_information.registration_date}
                onChange={(v) => setGroup('fir_information', 'registration_date', v)} />
            </Field>
          </div>
        );

      case 1: // Crime Classification
        return (
          <div className="grid grid-cols-2 gap-4">
            <Field label="CATEGORY" required error={errors.category}>
              <Select value={fir.crime_classification.category}
                onChange={(v) => setGroup('crime_classification', 'category', v)}
                options={CRIME_TYPES} placeholder="Select crime category" />
            </Field>
            <Field label="SUBCATEGORY">
              <TextInput value={fir.crime_classification.subcategory}
                onChange={(v) => setGroup('crime_classification', 'subcategory', v)}
                placeholder="e.g. Two-wheeler theft" />
            </Field>
            <Field label="SEVERITY" required error={errors.severity}>
              <Select value={fir.crime_classification.severity}
                onChange={(v) => setGroup('crime_classification', 'severity', v)}
                options={SEVERITIES} placeholder="Select severity" />
            </Field>
          </div>
        );

      case 2: // Incident Details
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label="DATE" required error={errors.date}>
                <TextInput type="date" value={fir.incident_details.date}
                  onChange={(v) => setGroup('incident_details', 'date', v)} />
              </Field>
              <Field label="TIME">
                <TextInput type="time" value={fir.incident_details.time}
                  onChange={(v) => setGroup('incident_details', 'time', v)} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="ADDRESS">
                <TextInput value={fir.incident_details.location.address}
                  onChange={(v) => setLocation('address', v)} placeholder="Street / landmark" />
              </Field>
              <Field label="CITY">
                <TextInput value={fir.incident_details.location.city}
                  onChange={(v) => setLocation('city', v)} />
              </Field>
              <Field label="TALUK">
                <TextInput value={fir.incident_details.location.taluk}
                  onChange={(v) => setLocation('taluk', v)} />
              </Field>
              <Field label="DISTRICT">
                <Select value={fir.incident_details.location.district}
                  onChange={(v) => setLocation('district', v)} options={DISTRICTS}
                  placeholder="Select district" />
              </Field>
              <Field label="LATITUDE">
                <TextInput value={fir.incident_details.location.lat}
                  onChange={(v) => setLocation('lat', v)} placeholder="12.9716" />
              </Field>
              <Field label="LONGITUDE">
                <TextInput value={fir.incident_details.location.lng}
                  onChange={(v) => setLocation('lng', v)} placeholder="77.5946" />
              </Field>
            </div>
            <Field label="INCIDENT DESCRIPTION" required error={errors.description}>
              <TextArea rows={4} value={fir.incident_details.description}
                onChange={(v) => setGroup('incident_details', 'description', v)}
                placeholder="What happened, sequence of events, MO..." />
            </Field>
          </div>
        );

      case 3: // Victim Details
        return (
          <div className="flex flex-col gap-3">
            {fir.victims.map((v, i) => (
              <SectionCard key={i}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.5)' }}>
                    VICTIM {i + 1}
                  </span>
                  {fir.victims.length > 1 && (
                    <button onClick={() => removeListItem('victims', i)}
                      className="text-[10px] font-mono px-2 py-1 rounded" style={dangerGhostBtn}>
                      REMOVE
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="NAME">
                    <TextInput value={v.name} onChange={(val) => setListItem('victims', i, 'name', val)} />
                  </Field>
                  <Field label="AGE">
                    <TextInput value={v.age} onChange={(val) => setListItem('victims', i, 'age', val)} />
                  </Field>
                  <Field label="GENDER">
                    <Select value={v.gender} onChange={(val) => setListItem('victims', i, 'gender', val)}
                      options={GENDERS} placeholder="Select" />
                  </Field>
                  <Field label="OCCUPATION">
                    <TextInput value={v.occupation} onChange={(val) => setListItem('victims', i, 'occupation', val)} />
                  </Field>
                  <Field label="PHONE">
                    <TextInput value={v.phone} onChange={(val) => setListItem('victims', i, 'phone', val)} />
                  </Field>
                  <Field label="ADDRESS">
                    <TextInput value={v.address} onChange={(val) => setListItem('victims', i, 'address', val)} />
                  </Field>
                </div>
              </SectionCard>
            ))}
            <button onClick={() => addListItem('victims', emptyVictim)}
              className="self-start text-[11px] font-mono px-3 py-1.5 rounded-md tracking-wider" style={ghostBtn}>
              + ADD VICTIM
            </button>
          </div>
        );

      case 4: // Suspect Details
        return (
          <div className="flex flex-col gap-3">
            {fir.suspects.map((s, i) => (
              <SectionCard key={i}>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.5)' }}>
                    SUSPECT {i + 1}
                  </span>
                  {fir.suspects.length > 1 && (
                    <button onClick={() => removeListItem('suspects', i)}
                      className="text-[10px] font-mono px-2 py-1 rounded" style={dangerGhostBtn}>
                      REMOVE
                    </button>
                  )}
                </div>
                <Field label="IDENTITY STATUS">
                  <div className="flex gap-2">
                    {[{ v: true, l: 'KNOWN' }, { v: false, l: 'UNKNOWN' }].map((opt) => (
                      <button key={opt.l} onClick={() => setListItem('suspects', i, 'known', opt.v)}
                        className="px-3 py-1.5 rounded-md text-[10px] font-mono tracking-wider"
                        style={s.known === opt.v ? ghostBtn : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(200,220,240,0.4)' }}>
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </Field>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="NAME">
                    <TextInput value={s.name} onChange={(val) => setListItem('suspects', i, 'name', val)} />
                  </Field>
                  <Field label="ALIAS">
                    <TextInput value={s.alias} onChange={(val) => setListItem('suspects', i, 'alias', val)} />
                  </Field>
                  <Field label="AGE">
                    <TextInput value={s.age} onChange={(val) => setListItem('suspects', i, 'age', val)} />
                  </Field>
                  <Field label="GENDER">
                    <Select value={s.gender} onChange={(val) => setListItem('suspects', i, 'gender', val)}
                      options={GENDERS} placeholder="Select" />
                  </Field>
                  <Field label="RELATION TO VICTIM">
                    <TextInput value={s.relationship_to_victim}
                      onChange={(val) => setListItem('suspects', i, 'relationship_to_victim', val)} />
                  </Field>
                  <Field label="VEHICLE DETAILS">
                    <TextInput value={s.vehicle_details}
                      onChange={(val) => setListItem('suspects', i, 'vehicle_details', val)} placeholder="Plate, make, colour" />
                  </Field>
                </div>
                <Field label="DESCRIPTION">
                  <TextArea rows={2} value={s.description}
                    onChange={(val) => setListItem('suspects', i, 'description', val)}
                    placeholder="Physical description, distinguishing marks..." />
                </Field>
              </SectionCard>
            ))}
            <button onClick={() => addListItem('suspects', emptySuspect)}
              className="self-start text-[11px] font-mono px-3 py-1.5 rounded-md tracking-wider" style={ghostBtn}>
              + ADD SUSPECT
            </button>
          </div>
        );

      case 5: // Evidence & Witnesses
        return (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-mono tracking-[0.2em]" style={{ color: 'rgba(0,212,255,0.4)' }}>EVIDENCE</div>
              {fir.evidence.map((ev, i) => (
                <SectionCard key={i}>
                  <div className="flex items-start gap-3">
                    <div className="w-40 shrink-0">
                      <Field label="TYPE">
                        <Select value={ev.type} onChange={(val) => setListItem('evidence', i, 'type', val)}
                          options={EVIDENCE_TYPES} placeholder="Select" />
                      </Field>
                    </div>
                    <div className="flex-1">
                      <Field label="DESCRIPTION">
                        <TextInput value={ev.description} onChange={(val) => setListItem('evidence', i, 'description', val)} />
                      </Field>
                    </div>
                    <button onClick={() => removeListItem('evidence', i)}
                      className="mt-5 text-[10px] font-mono px-2 py-1.5 rounded" style={dangerGhostBtn}>
                      ✕
                    </button>
                  </div>
                </SectionCard>
              ))}
              <button onClick={() => addListItem('evidence', emptyEvidence)}
                className="self-start text-[11px] font-mono px-3 py-1.5 rounded-md tracking-wider" style={ghostBtn}>
                + ADD EVIDENCE
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div className="text-[10px] font-mono tracking-[0.2em]" style={{ color: 'rgba(0,212,255,0.4)' }}>WITNESSES</div>
              {fir.witnesses.map((w, i) => (
                <SectionCard key={i}>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.5)' }}>
                      WITNESS {i + 1}
                    </span>
                    <button onClick={() => removeListItem('witnesses', i)}
                      className="text-[10px] font-mono px-2 py-1 rounded" style={dangerGhostBtn}>
                      REMOVE
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="NAME">
                      <TextInput value={w.name} onChange={(val) => setListItem('witnesses', i, 'name', val)} />
                    </Field>
                    <Field label="PHONE">
                      <TextInput value={w.phone} onChange={(val) => setListItem('witnesses', i, 'phone', val)} />
                    </Field>
                  </div>
                  <Field label="STATEMENT">
                    <TextArea rows={2} value={w.statement} onChange={(val) => setListItem('witnesses', i, 'statement', val)} />
                  </Field>
                </SectionCard>
              ))}
              <button onClick={() => addListItem('witnesses', emptyWitness)}
                className="self-start text-[11px] font-mono px-3 py-1.5 rounded-md tracking-wider" style={ghostBtn}>
                + ADD WITNESS
              </button>
            </div>
          </div>
        );

      case 6: // FIR Narrative
        return (
          <div className="flex flex-col gap-4">
            <Field label="REPORTED BY">
              <TextInput value={fir.reported_by} onChange={(v) => setFir((f) => ({ ...f, reported_by: v }))}
                placeholder="Officer name / badge no." />
            </Field>
            <Field label="FIR NARRATIVE" required error={errors.narrative}>
              <TextArea rows={10} value={fir.narrative}
                onChange={(v) => setFir((f) => ({ ...f, narrative: v }))}
                placeholder="Full narrative of the FIR in the officer's own words — this is what the AI agents use for pattern matching and case similarity." />
            </Field>
          </div>
        );

      case 7: // Review & Submit
        return (
          <div className="flex flex-col gap-4">
            <ReviewSection title="FIR Information" rows={[
              ['FIR Number', fir.fir_information.fir_number || '—'],
              ['Police Station', fir.fir_information.police_station || '—'],
              ['District', fir.fir_information.district || '—'],
              ['Registration Date', fir.fir_information.registration_date || '—'],
            ]} onEdit={() => jumpTo(0)} />
            <ReviewSection title="Crime Classification" rows={[
              ['Category', fir.crime_classification.category || '—'],
              ['Subcategory', fir.crime_classification.subcategory || '—'],
              ['Severity', fir.crime_classification.severity || '—'],
            ]} onEdit={() => jumpTo(1)} />
            <ReviewSection title="Incident Details" rows={[
              ['Date / Time', `${fir.incident_details.date || '—'} ${fir.incident_details.time || ''}`.trim()],
              ['Location', [fir.incident_details.location.address, fir.incident_details.location.city, fir.incident_details.location.district].filter(Boolean).join(', ') || '—'],
            ]} onEdit={() => jumpTo(2)} />
            <ReviewSection title={`Victims (${fir.victims.length})`}
              rows={fir.victims.map((v, i) => [`Victim ${i + 1}`, v.name || '—'])} onEdit={() => jumpTo(3)} />
            <ReviewSection title={`Suspects (${fir.suspects.length})`}
              rows={fir.suspects.map((s, i) => [`Suspect ${i + 1}`, s.known ? (s.name || '—') : 'Unknown'])} onEdit={() => jumpTo(4)} />
            <ReviewSection title={`Evidence (${fir.evidence.length}) / Witnesses (${fir.witnesses.length})`}
              rows={[
                ...fir.evidence.map((e, i) => [`Evidence ${i + 1}`, `${e.type}: ${e.description || '—'}`]),
                ...fir.witnesses.map((w, i) => [`Witness ${i + 1}`, w.name || '—']),
              ]} onEdit={() => jumpTo(5)} />
            <ReviewSection title="Narrative" rows={[['Summary', fir.narrative ? `${fir.narrative.slice(0, 140)}${fir.narrative.length > 140 ? '…' : ''}` : '—']]} onEdit={() => jumpTo(6)} />

            {serverError && (
              <div className="text-[11px] font-mono" style={{ color: '#ff2d55' }}>⚠ {serverError}</div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="ksp-scroll relative w-screen h-screen overflow-y-auto bg-black flex flex-col items-center"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}>
      {/*
        NOTE ON SCROLLING: the global stylesheet locks html/body/#root to
        a fixed 100vh with overflow:hidden (needed so the full-screen map
        and chat pages never show a page-level scrollbar). That means this
        page must own its own scroll region instead of relying on the
        page/body to scroll — hence h-screen + overflow-y-auto here. Long
        steps (several victims/suspects/evidence entries, the Review step)
        now scroll inside this container instead of being clipped.
      */}
      <style>{`
        .ksp-scroll::-webkit-scrollbar { width: 8px; }
        .ksp-scroll::-webkit-scrollbar-track { background: transparent; }
        .ksp-scroll::-webkit-scrollbar-thumb {
          background: rgba(0,212,255,0.25);
          border-radius: 8px;
        }
        .ksp-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,212,255,0.4); }
        .ksp-scroll { scrollbar-width: thin; scrollbar-color: rgba(0,212,255,0.3) transparent; }
      `}</style>
      <ParticleCanvas />
      <GridOverlay color="0,212,255" opacity={0.02} />
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 70% 60% at 50% 30%, rgba(0,40,60,0.6) 0%, rgba(0,0,0,0) 70%)' }} />
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.75) 100%)' }} />
      <CornerBrackets />

      {/* ── TOP BAR (sticky so it stays visible while the form scrolls) ── */}
      <div className="sticky top-0 z-20 w-full flex items-center justify-between px-6 py-3"
        style={{ borderBottom: '1px solid rgba(0,212,255,0.1)', background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px)' }}>
        <button onClick={() => navigate('/chat')}
          className="text-[11px] font-mono tracking-widest uppercase"
          style={{ color: 'rgba(0,212,255,0.55)' }}>
          ← Back to Assistant
        </button>
        <div className="text-xs font-bold tracking-[0.2em]" style={{ color: '#00d4ff', textShadow: '0 0 10px rgba(0,212,255,0.6)' }}>
          KSP INTEL · FIR REGISTRATION
        </div>
        <button onClick={() => navigate('/agents')}
          className="text-[11px] font-mono tracking-widest uppercase"
          style={{ color: 'rgba(0,212,255,0.55)' }}>
          Case Room →
        </button>
      </div>

      {/* ── WIZARD ── */}
      <div className="relative z-10 w-full max-w-3xl px-6 py-10 pb-16">
        {submitted ? (
          <div className="rounded-2xl p-8 flex flex-col items-center gap-4 text-center" style={{ ...panelStyle, animation: 'fadeIn 0.4s ease-out' }}>
            <div className="relative w-14 h-14 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: '#30d158', animationDuration: '1.2s' }} />
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#30d158" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-sm font-bold tracking-widest" style={{ color: '#30d158' }}>FIR REGISTERED</div>
            <div className="text-xs font-mono" style={{ color: 'rgba(0,212,255,0.6)' }}>Case ID: {submitted}</div>
            <div className="flex gap-3 mt-2">
              <button onClick={() => setSubmitted(null)}
                className="px-4 py-2 rounded-lg text-xs font-mono tracking-wider" style={ghostBtn}>
                + FILE ANOTHER FIR
              </button>
              <button onClick={() => navigate('/agents')}
                className="px-4 py-2 rounded-lg text-xs font-mono tracking-wider" style={ghostBtn}>
                ANALYSE IN CASE ROOM
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl p-7 flex flex-col gap-5" style={panelStyle}>
            <div className="text-xs font-mono tracking-[0.2em]" style={{ color: 'rgba(0,212,255,0.4)' }}>
              NEW FIR → FIRESTORE
            </div>

            <StepIndicator step={step} onJump={jumpTo} />

            <div className="text-sm font-bold tracking-wide" style={{ color: '#00d4ff' }}>
              STEP {step + 1} / {STEPS.length} · {STEPS[step].toUpperCase()}
            </div>

            <div style={{ minHeight: 200 }}>
              {renderStep()}
            </div>

            <div className="flex items-center justify-between mt-2 pt-4" style={{ borderTop: '1px solid rgba(0,212,255,0.08)' }}>
              <button onClick={goBack} disabled={step === 0}
                className="px-4 py-2 rounded-lg text-xs font-mono tracking-wider uppercase"
                style={{ ...ghostBtn, opacity: step === 0 ? 0.3 : 1 }}>
                ← Back
              </button>

              {step < STEPS.length - 1 ? (
                <button onClick={goNext}
                  className="px-5 py-2 rounded-lg text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.5)' }}>
                  Next →
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={submitting}
                  className="px-5 py-2 rounded-lg text-xs font-bold tracking-[0.2em] uppercase"
                  style={{ background: 'rgba(0,212,255,0.12)', border: '1px solid rgba(0,212,255,0.4)', color: '#00d4ff', textShadow: '0 0 8px rgba(0,212,255,0.5)', opacity: submitting ? 0.6 : 1 }}>
                  {submitting ? 'SUBMITTING…' : 'SUBMIT FIR'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReviewSection({ title, rows, onEdit }) {
  return (
    <SectionCard>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono tracking-widest" style={{ color: 'rgba(0,212,255,0.5)' }}>{title.toUpperCase()}</span>
        <button onClick={onEdit} className="text-[10px] font-mono px-2 py-1 rounded" style={ghostBtn}>EDIT</button>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map(([k, v], i) => (
          <div key={i} className="flex justify-between text-xs gap-4">
            <span style={{ color: 'rgba(200,220,240,0.45)' }}>{k}</span>
            <span style={{ color: 'rgba(200,240,255,0.85)', textAlign: 'right' }}>{v}</span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}