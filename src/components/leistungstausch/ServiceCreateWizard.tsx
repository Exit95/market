import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon?: string;
}

interface Props {
  categories: Category[];
}

const EFFORT_OPTIONS = [
  { value: 'UNTER_1_STUNDE', label: 'Unter 1 Stunde' },
  { value: 'EIN_BIS_DREI_STUNDEN', label: '1–3 Stunden' },
  { value: 'DREI_BIS_ACHT_STUNDEN', label: '3–8 Stunden (Tagesaufgabe)' },
  { value: 'MEHRERE_TAGE', label: 'Mehrere Tage' },
  { value: 'FORTLAUFEND', label: 'Fortlaufend / Regelmäßig' },
];

const EXPERIENCE_OPTIONS = [
  { value: 'ANFAENGER', label: 'Anfänger' },
  { value: 'FORTGESCHRITTEN', label: 'Fortgeschritten' },
  { value: 'PROFI', label: 'Profi' },
];

const LOCATION_OPTIONS = [
  { value: 'VOR_ORT', label: 'Vor Ort' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'BEIDES', label: 'Beides möglich' },
];

const AVAILABILITY_OPTIONS = [
  { value: 'WERKTAGS', label: 'Werktags' },
  { value: 'ABENDS', label: 'Abends' },
  { value: 'WOCHENENDE', label: 'Wochenende' },
  { value: 'FLEXIBEL', label: 'Flexibel' },
];

export default function ServiceCreateWizard({ categories }: Props) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [offeredCategoryId, setOfferedCategoryId] = useState('');
  const [offeredDescription, setOfferedDescription] = useState('');
  const [effort, setEffort] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');

  const [soughtCategoryIds, setSoughtCategoryIds] = useState<string[]>([]);
  const [soughtDescription, setSoughtDescription] = useState('');
  const [locationType, setLocationType] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [requirements, setRequirements] = useState('');

  const toggleSoughtCategory = (id: string) => {
    setSoughtCategoryIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const toggleAvailability = (val: string) => {
    setAvailability(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const canProceedStep1 = title.length >= 10 && offeredCategoryId && offeredDescription.length >= 50 && effort;
  const canProceedStep2 = soughtCategoryIds.length >= 1 && soughtDescription.length >= 30 && locationType &&
    (locationType === 'REMOTE' || (city && postalCode));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch('/api/leistungstausch/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          offeredCategoryId,
          offeredDescription,
          effort,
          experienceLevel: experienceLevel || undefined,
          soughtCategoryIds,
          soughtDescription,
          locationType,
          city: city || undefined,
          postalCode: postalCode || undefined,
          availability: availability.length > 0 ? availability : undefined,
          requirements: requirements || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Ein Fehler ist aufgetreten.');
        setSubmitting(false);
        return;
      }

      window.location.href = `/leistungstausch/angebot/${data.listing.id}`;
    } catch {
      setError('Netzwerkfehler. Bitte versuche es erneut.');
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]";
  const btnPrimary = "px-8 py-3 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors";
  const btnSecondary = "px-6 py-3 rounded-[10px] text-sm font-medium border-2 border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA] transition-colors";

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[#1A2332] mb-2">Leistungstausch-Angebot erstellen</h1>
        <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[10px] px-4 py-3 text-sm text-[#115E59]">
          Du bietest eine Leistung an und suchst eine Leistung zurück. Kein Geld, keine Waren.
        </div>
      </div>

      <div className="flex items-center gap-0 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${s <= step ? 'bg-[#0D9488] text-white' : 'bg-[#E5E7EB] text-[#64748B]'}`}>
              {s < step ? '✓' : s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 rounded ${s < step ? 'bg-[#0D9488]' : 'bg-[#E5E7EB]'}`} />}
          </div>
        ))}
      </div>

      <div className="flex justify-between text-xs text-[#64748B] mb-8 -mt-4">
        <span className={step >= 1 ? 'text-[#0D9488] font-medium' : ''}>Deine Leistung</span>
        <span className={step >= 2 ? 'text-[#0D9488] font-medium' : ''}>Deine Wünsche</span>
        <span className={step >= 3 ? 'text-[#0D9488] font-medium' : ''}>Überprüfen</span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800 mb-6">{error}</div>
      )}

      {step === 1 && (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Titel *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder='z.B. "Webdesign gegen Umzugshilfe"' className={inputClass} />
            <p className="text-xs text-[#64748B] mt-1">{title.length}/80 Zeichen (min. 10)</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Kategorie deiner Leistung *</label>
            <select value={offeredCategoryId} onChange={e => setOfferedCategoryId(e.target.value)} className={inputClass}>
              <option value="">Kategorie wählen...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Beschreibe deine Leistung *</label>
            <textarea value={offeredDescription} onChange={e => setOfferedDescription(e.target.value)} maxLength={2000} rows={5} placeholder="Was genau bietest du an? Sei möglichst konkret..." className={`${inputClass} resize-none`} />
            <p className="text-xs text-[#64748B] mt-1">{offeredDescription.length}/2000 Zeichen (min. 50)</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Geschätzter Aufwand *</label>
            <select value={effort} onChange={e => setEffort(e.target.value)} className={inputClass}>
              <option value="">Aufwand wählen...</option>
              {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Erfahrungsniveau</label>
            <div className="flex gap-3">
              {EXPERIENCE_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setExperienceLevel(experienceLevel === o.value ? '' : o.value)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${experienceLevel === o.value ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end pt-4">
            <button onClick={() => setStep(2)} disabled={!canProceedStep1} className={btnPrimary}>Weiter</button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Gesuchte Gegenleistungen * (1–3 Kategorien)</label>
            <div className="flex flex-wrap gap-2">
              {categories.map(c => (
                <button key={c.id} type="button" onClick={() => toggleSoughtCategory(c.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${soughtCategoryIds.includes(c.id) ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E]' : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'}`}>
                  {c.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Was stellst du dir als Gegenleistung vor? *</label>
            <textarea value={soughtDescription} onChange={e => setSoughtDescription(e.target.value)} maxLength={1000} rows={3} placeholder="Beschreibe, was du dir als Gegenleistung wünschst..." className={`${inputClass} resize-none`} />
            <p className="text-xs text-[#64748B] mt-1">{soughtDescription.length}/1000 Zeichen (min. 30)</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Durchführungsort *</label>
            <div className="flex gap-3">
              {LOCATION_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => setLocationType(o.value)}
                  className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${locationType === o.value ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {locationType !== 'REMOTE' && locationType && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Stadt *</label>
                <input value={city} onChange={e => setCity(e.target.value)} placeholder="Berlin" className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">PLZ *</label>
                <input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="10115" maxLength={5} className={inputClass} />
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Verfügbarkeit</label>
            <div className="flex flex-wrap gap-2">
              {AVAILABILITY_OPTIONS.map(o => (
                <button key={o.value} type="button" onClick={() => toggleAvailability(o.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${availability.includes(o.value) ? 'border-[#0D9488] bg-[#CCFBF1] text-[#0F766E]' : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'}`}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Voraussetzungen</label>
            <input value={requirements} onChange={e => setRequirements(e.target.value)} maxLength={500} placeholder='z.B. "Auto vorhanden", "Eigenes Werkzeug"' className={inputClass} />
          </div>
          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className={btnSecondary}>Zurück</button>
            <button onClick={() => { setError(null); setStep(3); }} disabled={!canProceedStep2} className={btnPrimary}>Weiter</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6">
            <h2 className="text-lg font-semibold text-[#1A2332] mb-4">Vorschau deines Angebots</h2>
            <div className="space-y-4">
              <div>
                <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#CCFBF1] text-[#115E59] mb-2">
                  {categories.find(c => c.id === offeredCategoryId)?.name}
                </span>
                <h3 className="text-xl font-bold text-[#1A2332]">{title}</h3>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1A2332] mb-1">Was ich anbiete</h4>
                <p className="text-sm text-[#64748B] whitespace-pre-line">{offeredDescription}</p>
                <p className="text-xs text-[#64748B] mt-2">
                  Aufwand: {EFFORT_OPTIONS.find(o => o.value === effort)?.label}
                  {experienceLevel && ` · Erfahrung: ${EXPERIENCE_OPTIONS.find(o => o.value === experienceLevel)?.label}`}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#1A2332] mb-1">Was ich suche</h4>
                <div className="flex flex-wrap gap-1 mb-2">
                  {soughtCategoryIds.map(id => (
                    <span key={id} className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#F0FDFA] text-[#0F766E]">
                      {categories.find(c => c.id === id)?.name}
                    </span>
                  ))}
                </div>
                <p className="text-sm text-[#64748B] whitespace-pre-line">{soughtDescription}</p>
              </div>
              <div className="text-sm text-[#64748B]">
                <p>Durchführung: {LOCATION_OPTIONS.find(o => o.value === locationType)?.label}</p>
                {city && <p>Ort: {city} {postalCode}</p>}
                {availability.length > 0 && <p>Verfügbarkeit: {availability.map(a => AVAILABILITY_OPTIONS.find(o => o.value === a)?.label).join(', ')}</p>}
                {requirements && <p>Voraussetzungen: {requirements}</p>}
              </div>
            </div>
          </div>
          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className={btnSecondary}>Zurück</button>
            <button onClick={handleSubmit} disabled={submitting}
              className="px-10 py-3 rounded-[10px] text-sm font-bold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
              {submitting ? 'Wird veröffentlicht...' : 'Veröffentlichen'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
