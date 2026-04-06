import { useState } from 'react';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Props {
  listingId: string;
  listingTitle: string;
  soughtCategories: Array<{ category: Category }>;
  soughtDescription: string;
  categories: Category[];
  onClose: () => void;
  parentProposalId?: string;
}

const EFFORT_OPTIONS = [
  { value: 'UNTER_1_STUNDE', label: 'Unter 1 Stunde' },
  { value: 'EIN_BIS_DREI_STUNDEN', label: '1–3 Stunden' },
  { value: 'DREI_BIS_ACHT_STUNDEN', label: '3–8 Stunden (Tagesaufgabe)' },
  { value: 'MEHRERE_TAGE', label: 'Mehrere Tage' },
  { value: 'FORTLAUFEND', label: 'Fortlaufend / Regelmäßig' },
];

const LOCATION_OPTIONS = [
  { value: 'VOR_ORT', label: 'Vor Ort' },
  { value: 'REMOTE', label: 'Remote' },
  { value: 'BEIDES', label: 'Beides möglich' },
];

export default function ServiceProposalModal({
  listingId, listingTitle, soughtCategories, soughtDescription,
  categories, onClose, parentProposalId,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [offeredDescription, setOfferedDescription] = useState('');
  const [offeredCategoryId, setOfferedCategoryId] = useState(soughtCategories[0]?.category.id ?? '');
  const [offeredEffort, setOfferedEffort] = useState('');
  const [soughtDesc, setSoughtDesc] = useState(soughtDescription);
  const [soughtEffort, setSoughtEffort] = useState('');
  const [locationType, setLocationType] = useState('');
  const [proposedLocation, setProposedLocation] = useState('');
  const [proposedTimeframe, setProposedTimeframe] = useState('');
  const [message, setMessage] = useState('');

  const canSubmit = offeredDescription.length >= 30 && offeredCategoryId && offeredEffort &&
    soughtDesc.length >= 30 && soughtEffort && locationType;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/leistungstausch/proposals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceListingId: listingId,
          offeredDescription,
          offeredCategoryId,
          offeredEffort,
          soughtDescription: soughtDesc,
          soughtEffort,
          locationType,
          proposedLocation: proposedLocation || undefined,
          proposedTimeframe: proposedTimeframe || undefined,
          message: message || undefined,
          parentProposalId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Fehler beim Senden.');
        setSubmitting(false);
        return;
      }

      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      setError('Netzwerkfehler.');
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]";

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-[10px] p-8 max-w-md mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h3 className="text-lg font-bold text-[#1A2332] mb-2">{parentProposalId ? 'Gegenvorschlag gesendet!' : 'Vorschlag gesendet!'}</h3>
          <p className="text-sm text-[#64748B]">Der Empfänger wird per E-Mail benachrichtigt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white h-full w-full max-w-lg overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-[#1A2332]">
            {parentProposalId ? 'Gegenvorschlag senden' : 'Vorschlag senden'}
          </h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1A2332] text-xl">✕</button>
        </div>

        <div className="px-6 py-6 space-y-5">
          <div className="bg-[#F0FDFA] border border-[#99F6E4] rounded-[10px] px-4 py-3">
            <p className="text-xs font-semibold text-[#0F766E] mb-1">Angebot: {listingTitle}</p>
            <p className="text-xs text-[#115E59]">Gesucht: {soughtCategories.map(sc => sc.category.name).join(', ')}</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800">{error}</div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-xs font-bold">→</span>
              Dein Angebot
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Was bietest du an? *</label>
                <textarea value={offeredDescription} onChange={e => setOfferedDescription(e.target.value)} maxLength={2000} rows={3}
                  placeholder="Ich helfe dir beim Umzug. Habe einen VW Bus..." className={`${inputClass} resize-none`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Kategorie *</label>
                  <select value={offeredCategoryId} onChange={e => setOfferedCategoryId(e.target.value)} className={inputClass}>
                    <option value="">Wählen...</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Dein Aufwand *</label>
                  <select value={offeredEffort} onChange={e => setOfferedEffort(e.target.value)} className={inputClass}>
                    <option value="">Wählen...</option>
                    {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-xs font-bold">←</span>
              Deine Erwartung
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Was erwartest du? *</label>
                <textarea value={soughtDesc} onChange={e => setSoughtDesc(e.target.value)} maxLength={2000} rows={3}
                  className={`${inputClass} resize-none`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Erwarteter Aufwand *</label>
                <select value={soughtEffort} onChange={e => setSoughtEffort(e.target.value)} className={inputClass}>
                  <option value="">Wählen...</option>
                  {EFFORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#1A2332] mb-3">Wann & Wo</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1">Durchführung *</label>
                <div className="flex gap-2">
                  {LOCATION_OPTIONS.map(o => (
                    <button key={o.value} type="button" onClick={() => setLocationType(o.value)}
                      className={`px-3 py-1.5 rounded-[10px] text-xs font-medium border transition-colors ${
                        locationType === o.value ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]' : 'border-[#E5E7EB] text-[#64748B]'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Zeitraum</label>
                  <input value={proposedTimeframe} onChange={e => setProposedTimeframe(e.target.value)}
                    placeholder="z.B. Nächste 2 Wochen" className={inputClass} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1">Treffpunkt</label>
                  <input value={proposedLocation} onChange={e => setProposedLocation(e.target.value)}
                    placeholder="z.B. Berlin-Mitte" className={inputClass} />
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1">Persönliche Nachricht (optional)</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} maxLength={1000} rows={2}
              placeholder="Hey, dein Angebot passt perfekt..." className={`${inputClass} resize-none`} />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex justify-between">
          <button onClick={onClose} className="px-5 py-2.5 rounded-[10px] text-sm font-medium border-2 border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFB] transition-colors">
            Abbrechen
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="px-6 py-2.5 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
            {submitting ? 'Wird gesendet...' : parentProposalId ? 'Gegenvorschlag senden' : 'Vorschlag senden'}
          </button>
        </div>
      </div>
    </div>
  );
}
