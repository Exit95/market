import { useState, useEffect } from 'react';

interface Proposal {
  id: string;
  offeredDescription: string;
  offeredCategoryId: string;
  offeredEffort: string;
  soughtDescription: string;
  soughtEffort: string;
  locationType: string;
  proposedLocation?: string;
  proposedTimeframe?: string;
  message?: string;
  status: string;
  createdAt: string;
  proposer: { id: string; firstName?: string; lastName?: string; avatarUrl?: string; emailVerified: boolean; phoneVerified: boolean };
}

interface Props {
  listingId: string;
  isOwner: boolean;
  onCounter?: (proposalId: string) => void;
}

const EFFORT_LABELS: Record<string, string> = {
  UNTER_1_STUNDE: 'Unter 1 Std',
  EIN_BIS_DREI_STUNDEN: '1–3 Std',
  DREI_BIS_ACHT_STUNDEN: '3–8 Std',
  MEHRERE_TAGE: 'Mehrere Tage',
  FORTLAUFEND: 'Fortlaufend',
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Ausstehend', color: '#D97706' },
  ACCEPTED: { label: 'Angenommen', color: '#22A06B' },
  DECLINED: { label: 'Abgelehnt', color: '#DC2626' },
  COUNTERED: { label: 'Gegenvorschlag', color: '#1B65A6' },
  WITHDRAWN: { label: 'Zurückgezogen', color: '#64748B' },
  EXPIRED: { label: 'Abgelaufen', color: '#64748B' },
};

export default function ServiceProposalList({ listingId, isOwner, onCounter }: Props) {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leistungstausch/listings/${listingId}`)
      .then(r => r.json())
      .then(data => {
        if (data.listing?.proposals) {
          setProposals(data.listing.proposals);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [listingId]);

  const handleAction = async (proposalId: string, action: 'accept' | 'decline') => {
    setActionLoading(proposalId);
    try {
      const res = await fetch(`/api/leistungstausch/proposals/${proposalId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        window.location.reload();
      }
    } catch {}
    setActionLoading(null);
  };

  if (loading) {
    return <div className="text-sm text-[#64748B] py-4">Vorschläge laden...</div>;
  }

  if (proposals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-[#1A2332]">
        Vorschläge ({proposals.length})
      </h3>
      {proposals.map(p => {
        const name = [p.proposer.firstName, p.proposer.lastName].filter(Boolean).join(' ') || 'Nutzer';
        const initial = (p.proposer.firstName?.[0] || 'N').toUpperCase();
        const status = STATUS_LABELS[p.status] ?? { label: p.status, color: '#64748B' };
        const date = new Date(p.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'short', year: 'numeric' });

        return (
          <div key={p.id} className="border border-[#E5E7EB] rounded-[10px] p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#CCFBF1] text-[#0D9488] flex items-center justify-center text-sm font-bold">
                  {initial}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1A2332]">{name}</p>
                  <p className="text-xs text-[#64748B]">{date}</p>
                </div>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ backgroundColor: `${status.color}15`, color: status.color }}>
                {status.label}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs font-semibold text-[#0D9488] mb-1">Bietet an:</p>
                <p className="text-sm text-[#64748B] line-clamp-3">{p.offeredDescription}</p>
                <p className="text-xs text-[#94A3B8] mt-1">Aufwand: {EFFORT_LABELS[p.offeredEffort] ?? p.offeredEffort}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-[#0D9488] mb-1">Erwartet:</p>
                <p className="text-sm text-[#64748B] line-clamp-3">{p.soughtDescription}</p>
                <p className="text-xs text-[#94A3B8] mt-1">Aufwand: {EFFORT_LABELS[p.soughtEffort] ?? p.soughtEffort}</p>
              </div>
              {p.message && (
                <div className="bg-[#F8FAFB] rounded-lg px-3 py-2">
                  <p className="text-xs text-[#64748B] italic">"{p.message}"</p>
                </div>
              )}
            </div>

            {isOwner && p.status === 'PENDING' && (
              <div className="flex gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => handleAction(p.id, 'accept')}
                  disabled={actionLoading === p.id}
                  className="flex-1 px-4 py-2 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:opacity-50 transition-colors"
                >
                  Annehmen
                </button>
                {onCounter && (
                  <button
                    onClick={() => onCounter(p.id)}
                    className="flex-1 px-4 py-2 rounded-[10px] text-sm font-medium border-2 border-[#0D9488] text-[#0F766E] hover:bg-[#F0FDFA] transition-colors"
                  >
                    Gegenvorschlag
                  </button>
                )}
                <button
                  onClick={() => handleAction(p.id, 'decline')}
                  disabled={actionLoading === p.id}
                  className="px-4 py-2 rounded-[10px] text-sm font-medium border border-[#E5E7EB] text-[#64748B] hover:bg-[#F8FAFB] transition-colors"
                >
                  Ablehnen
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
