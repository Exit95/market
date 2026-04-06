import { useState } from 'react';

interface Props {
  dealId: string;
  otherName: string;
  onClose: () => void;
}

function StarRating({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-[#64748B] mb-1.5">{label}</label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(star => (
          <button key={star} type="button" onClick={() => onChange(star)}
            className={`w-8 h-8 rounded transition-colors ${star <= value ? 'text-[#D97706]' : 'text-[#E5E7EB]'}`}>
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/></svg>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function ServiceReviewModal({ dealId, otherName, onClose }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [rating, setRating] = useState(0);
  const [qualityRating, setQualityRating] = useState(0);
  const [reliabilityRating, setReliabilityRating] = useState(0);
  const [communicationRating, setCommunicationRating] = useState(0);
  const [comment, setComment] = useState('');

  const canSubmit = rating >= 1;

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/leistungstausch/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dealId,
          rating,
          comment: comment || undefined,
          qualityRating: qualityRating || undefined,
          reliabilityRating: reliabilityRating || undefined,
          communicationRating: communicationRating || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setSubmitting(false); return; }
      setSuccess(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch { setError('Netzwerkfehler.'); setSubmitting(false); }
  };

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="bg-white rounded-[10px] p-8 max-w-md mx-4 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-16 h-16 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
          <h3 className="text-lg font-bold text-[#1A2332] mb-2">Bewertung abgegeben!</h3>
          <p className="text-sm text-[#64748B]">Sichtbar sobald beide Seiten bewertet haben oder nach 14 Tagen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-[10px] p-6 max-w-md mx-4 w-full" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#1A2332]">Bewerte deinen Deal mit {otherName}</h2>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#1A2332] text-xl">✕</button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800 mb-4">{error}</div>
        )}

        <div className="space-y-5">
          <StarRating value={rating} onChange={setRating} label="Gesamtbewertung *" />
          <StarRating value={qualityRating} onChange={setQualityRating} label="Qualität der Leistung" />
          <StarRating value={reliabilityRating} onChange={setReliabilityRating} label="Zuverlässigkeit" />
          <StarRating value={communicationRating} onChange={setCommunicationRating} label="Kommunikation" />

          <div>
            <label className="block text-xs font-medium text-[#64748B] mb-1.5">Kommentar (optional)</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)} maxLength={2000} rows={3}
              placeholder="Wie war deine Erfahrung?"
              className="w-full px-3 py-2.5 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 resize-none" />
          </div>

          <p className="text-xs text-[#94A3B8]">
            Deine Bewertung wird sichtbar, sobald beide Seiten bewertet haben (oder nach 14 Tagen).
          </p>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2.5 rounded-[10px] text-sm font-medium border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFB] transition-colors">
            Abbrechen
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="px-6 py-2.5 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
            {submitting ? 'Wird gespeichert...' : 'Bewertung abgeben'}
          </button>
        </div>
      </div>
    </div>
  );
}
