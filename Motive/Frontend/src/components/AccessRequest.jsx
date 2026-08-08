import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const DESIGNATIONS = [
  'SCRB Admin',
  'Senior Officer (IPS)',
  'Superintendent of Police (SP)',
  'Deputy SP (DSP)',
  'Inspector',
  'Sub-Inspector (SI)',
  'Assistant Sub-Inspector (ASI)',
  'Crime Analyst',
  'Data Officer',
];

const DISTRICTS = [
  'Bengaluru Urban', 'Bengaluru Rural', 'Mysuru', 'Tumakuru', 'Kolar',
  'Chikkaballapura', 'Ramanagara', 'Mandya', 'Hassan', 'Chikkamagaluru',
  'Kodagu', 'Dakshina Kannada', 'Udupi', 'Shivamogga', 'Uttara Kannada',
  'Dharwad', 'Gadag', 'Haveri', 'Belagavi', 'Vijayapura', 'Bagalkot',
  'Koppal', 'Ballari', 'Chitradurga', 'Davangere', 'Raichur', 'Yadgir',
  'Kalaburagi', 'Bidar', 'Chamarajanagar', 'State HQ (SCRB)',
];

const INITIAL = {
  officerName:  '',
  employeeId:   '',
  designation:  '',
  district:     '',
  officialEmail:'',
  phoneNumber:  '',
  purpose:      '',
};

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
  background:    'rgba(0,0,0,0.5)',
  border:        `1px solid ${error ? 'rgba(255,45,85,0.6)' : focused ? 'rgba(0,212,255,0.6)' : 'rgba(0,212,255,0.15)'}`,
  borderRadius:  6,
  color:         'rgba(200,240,255,0.9)',
  fontFamily:    "'Rajdhani', sans-serif",
  fontSize:      14,
  fontWeight:    500,
  padding:       '9px 12px',
  outline:       'none',
  width:         '100%',
  boxShadow:     focused ? `0 0 0 2px rgba(0,212,255,0.08), 0 0 12px rgba(0,212,255,0.1)` : 'none',
  transition:    'all 0.2s',
  caretColor:    '#00d4ff',
});

export default function AccessRequest() {
  const navigate  = useNavigate();
  const [form, setForm]       = useState(INITIAL);
  const [errors, setErrors]   = useState({});
  const [focused, setFocused] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading]    = useState(false);

  const update = (k, v) => {
    setForm(f => ({ ...f, [k]: v }));
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.officerName.trim())   e.officerName  = 'Required';
    if (!form.employeeId.trim())    e.employeeId   = 'Required';
    if (!form.designation)          e.designation  = 'Required';
    if (!form.district)             e.district     = 'Required';
    if (!form.officialEmail.trim()) e.officialEmail = 'Required';
    else if (!/\S+@\S+\.\S+/.test(form.officialEmail)) e.officialEmail = 'Invalid email';
    if (!form.phoneNumber.trim())   e.phoneNumber  = 'Required';
    else if (!/^\d{10}$/.test(form.phoneNumber.replace(/\s/g,''))) e.phoneNumber = '10 digits required';
    if (!form.purpose.trim())       e.purpose      = 'Required';
    return e;
  };

  const handleSubmit = () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setTimeout(() => {
          navigate('/chat', {
            state: {
              officerName: form.officerName,
              officerid:form.employeeId,
              designation:form.designation,
              district:form.district,
              email:form.officialEmail,
            },
          });
        }, 1800);
            }, 1400);
          };

  // ── SUCCESS SCREEN
  if (submitted) {
    return (
      <div className="w-screen h-screen bg-black flex items-center justify-center"
        style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        <div className="flex flex-col items-center gap-4 text-center" style={{ animation: 'fadeIn 0.5s ease-out' }}>
          <div className="relative w-16 h-16 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 animate-ping" style={{ borderColor: '#30d158', animationDuration: '1s' }} />
            <div className="w-14 h-14 rounded-full border-2 flex items-center justify-center" style={{ borderColor: '#30d158', boxShadow: '0 0 20px rgba(48,209,88,0.4)' }}>
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="#30d158" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-widest" style={{ color: '#30d158', textShadow: '0 0 20px rgba(48,209,88,0.5)' }}>ACCESS GRANTED</div>
            <div className="text-sm font-mono tracking-wider mt-1" style={{ color: 'rgba(160,220,255,0.4)' }}>Redirecting to Intelligence Map…</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-black overflow-auto flex flex-col items-center justify-start py-8 px-4"
      style={{ fontFamily: "'Rajdhani', sans-serif" }}>

      {/* ── BG ── */}
      <div className="fixed inset-0 z-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 60% at 50% 20%, rgba(0,30,50,0.7) 0%, rgba(0,0,0,0) 70%)',
          backgroundImage: `linear-gradient(rgba(0,212,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(0,212,255,0.02) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }} />

      {/* ── CORNER BRACKETS ── */}
      {[
        { cls: 'top-4 left-4',     path: 'M0 16 L0 0 L16 0'   },
        { cls: 'top-4 right-4',    path: 'M20 16 L20 0 L4 0'  },
        { cls: 'bottom-4 left-4',  path: 'M0 4 L0 20 L16 20'  },
        { cls: 'bottom-4 right-4', path: 'M20 4 L20 20 L4 20' },
      ].map((c, i) => (
        <div key={i} className={`fixed z-10 pointer-events-none w-5 h-5 ${c.cls}`}>
          <svg viewBox="0 0 20 20" className="w-full h-full" style={{ opacity: 0.3 }}>
            <path d={c.path} fill="none" stroke="#00d4ff" strokeWidth="1.5" />
          </svg>
        </div>
      ))}

      <div className="relative z-10 w-full max-w-2xl" style={{ animation: 'fadeIn 0.5s ease-out' }}>

        {/* ── HEADER ── */}
        <div className="flex items-center gap-3 mb-8">
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 transition-opacity hover:opacity-70"
            style={{ color: 'rgba(0,212,255,0.45)', fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.1em' }}>
            ← BACK
          </button>
          <div className="flex-1 h-px" style={{ background: 'rgba(0,212,255,0.1)' }} />
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#30d158', boxShadow: '0 0 6px #30d158' }} />
            <span className="text-[9px] font-mono tracking-widest" style={{ color: 'rgba(48,209,88,0.6)' }}>SECURE FORM</span>
          </div>
        </div>

        {/* ── TITLE ── */}
        <div className="mb-8">
          <div className="text-[10px] font-mono tracking-[0.35em] mb-2" style={{ color: 'rgba(0,212,255,0.45)' }}>
            KARNATAKA STATE POLICE · SCRB
          </div>
          <h1 className="font-bold leading-tight" style={{ fontSize: 36, color: '#ffffff', letterSpacing: '0.02em' }}>
            ACCESS <span style={{ color: '#00d4ff', textShadow: '0 0 20px rgba(0,212,255,0.5)' }}>REQUEST</span>
          </h1>
          <p className="mt-2 text-sm font-mono" style={{ color: 'rgba(160,220,255,0.4)', letterSpacing: '0.03em' }}>
            Submit your credentials to request access to the Crime Intelligence Platform.
            All fields marked <span style={{ color: '#ff2d55' }}>*</span> are mandatory.
          </p>
        </div>

        {/* ── FORM CARD ── */}
        <div className="rounded-xl p-6 flex flex-col gap-5"
          style={{ background: 'rgba(5,12,22,0.88)', border: '1px solid rgba(0,212,255,0.12)', backdropFilter: 'blur(20px)', boxShadow: '0 0 60px rgba(0,0,0,0.6), inset 0 1px 0 rgba(0,212,255,0.06)' }}>

          {/* Section label */}
          <div className="text-[9px] font-mono tracking-[0.3em] pb-2 border-b" style={{ color: 'rgba(0,212,255,0.3)', borderBottomColor: 'rgba(0,212,255,0.08)' }}>
            ● OFFICER IDENTIFICATION
          </div>

          {/* Row 1: Name + Employee ID */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="OFFICER FULL NAME" required error={errors.officerName}>
              <input type="text" value={form.officerName} placeholder="e.g. Rajesh Kumar"
                onChange={e => update('officerName', e.target.value)}
                onFocus={() => setFocused('officerName')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'officerName', errors.officerName)} />
            </Field>
            <Field label="EMPLOYEE / BADGE ID" required error={errors.employeeId}>
              <input type="text" value={form.employeeId} placeholder="e.g. KSP-2024-0847"
                onChange={e => update('employeeId', e.target.value)}
                onFocus={() => setFocused('employeeId')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'employeeId', errors.employeeId)} />
            </Field>
          </div>

          {/* Row 2: Designation + District */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="DESIGNATION / RANK" required error={errors.designation}>
              <select value={form.designation} onChange={e => update('designation', e.target.value)}
                onFocus={() => setFocused('designation')} onBlur={() => setFocused('')}
                style={{ ...inputStyle(focused === 'designation', errors.designation), cursor: 'pointer' }}>
                <option value="" disabled>Select rank…</option>
                {DESIGNATIONS.map(d => <option key={d} value={d} style={{ background: '#050a14', color: '#c8f0ff' }}>{d}</option>)}
              </select>
            </Field>
            <Field label="POSTING DISTRICT" required error={errors.district}>
              <select value={form.district} onChange={e => update('district', e.target.value)}
                onFocus={() => setFocused('district')} onBlur={() => setFocused('')}
                style={{ ...inputStyle(focused === 'district', errors.district), cursor: 'pointer' }}>
                <option value="" disabled>Select district…</option>
                {DISTRICTS.map(d => <option key={d} value={d} style={{ background: '#050a14', color: '#c8f0ff' }}>{d}</option>)}
              </select>
            </Field>
          </div>

          {/* Section label 2 */}
          <div className="text-[9px] font-mono tracking-[0.3em] pb-2 border-b pt-1" style={{ color: 'rgba(0,212,255,0.3)', borderBottomColor: 'rgba(0,212,255,0.08)' }}>
            ● CONTACT & VERIFICATION
          </div>

          {/* Row 3: Email + Phone */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="OFFICIAL EMAIL ADDRESS" required error={errors.officialEmail}>
              <input type="email" value={form.officialEmail} placeholder="name@ksp.gov.in"
                onChange={e => update('officialEmail', e.target.value)}
                onFocus={() => setFocused('officialEmail')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'officialEmail', errors.officialEmail)} />
            </Field>
            <Field label="OFFICIAL PHONE NUMBER" required error={errors.phoneNumber}>
              <input type="tel" value={form.phoneNumber} placeholder="10-digit mobile"
                onChange={e => update('phoneNumber', e.target.value)}
                onFocus={() => setFocused('phoneNumber')} onBlur={() => setFocused('')}
                style={inputStyle(focused === 'phoneNumber', errors.phoneNumber)} />
            </Field>
          </div>

          {/* Row 4: Purpose textarea */}
          <Field label="PURPOSE OF ACCESS REQUEST" required error={errors.purpose}>
            <textarea value={form.purpose} rows={3}
              placeholder="Briefly describe the investigative or operational purpose for requesting access to the crime intelligence platform…"
              onChange={e => update('purpose', e.target.value)}
              onFocus={() => setFocused('purpose')} onBlur={() => setFocused('')}
              style={{ ...inputStyle(focused === 'purpose', errors.purpose), resize: 'vertical', minHeight: 80 }} />
          </Field>

          {/* Disclaimer */}
          <div className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,159,10,0.05)', border: '1px solid rgba(255,159,10,0.15)' }}>
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#ff9f0a" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-[11px] font-mono leading-relaxed" style={{ color: 'rgba(255,159,10,0.6)' }}>
              Unauthorized access is a punishable offence under the IT Act 2000. All access requests are logged and subject to verification by SCRB administrators.
            </p>
          </div>

          {/* SUBMIT BUTTON */}
          <button onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 rounded-lg font-bold tracking-[0.2em] text-sm uppercase transition-all duration-300 flex items-center justify-center gap-3"
            style={{
              background:   loading ? 'rgba(0,212,255,0.08)' : 'rgba(0,212,255,0.12)',
              border:       '1px solid rgba(0,212,255,0.4)',
              color:        loading ? 'rgba(0,212,255,0.4)' : '#00d4ff',
              textShadow:   loading ? 'none' : '0 0 10px rgba(0,212,255,0.4)',
              boxShadow:    loading ? 'none' : '0 0 20px rgba(0,212,255,0.15)',
              cursor:       loading ? 'not-allowed' : 'pointer',
            }}>
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="#00d4ff" strokeWidth="3" />
                  <path className="opacity-75" fill="#00d4ff" d="M4 12a8 8 0 018-8v4l3-3-3-3V4a10 10 0 100 20v-4l-3 3 3 3v-3a8 8 0 01-8-8z" />
                </svg>
                VERIFYING CREDENTIALS…
              </>
            ) : (
              <>⬡ SUBMIT ACCESS REQUEST</>
            )}
          </button>
        </div>

        {/* Footer */}
        <p className="text-center mt-5 text-[10px] font-mono tracking-widest" style={{ color: 'rgba(160,220,255,0.15)' }}>
          MOTIVE-KSP · SECURE ACCESS PORTAL · ALL RIGHTS RESERVED
        </p>
      </div>
    </div>
  );
}