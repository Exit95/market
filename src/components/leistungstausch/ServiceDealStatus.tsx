import { useState } from 'react';

interface Deal {
  id: string;
  status: string;
  partyACompleted: boolean;
  partyACompletedAt: string | null;
  partyBCompleted: boolean;
  partyBCompletedAt: string | null;
  cancelRequestedBy: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  proposal: {
    offeredDescription: string;
    offeredEffort: string;
    soughtDescription: string;
    soughtEffort: string;
    locationType: string;
    proposedLocation?: string;
    proposedTimeframe?: string;
    serviceListing: {
      title: string;
      offeredDescription: string;
      soughtDescription: string;
      offeredCategory: { name: string };
    };
  };
  partyA: { id: string; firstName?: string; lastName?: string };
  partyB: { id: string; firstName?: string; lastName?: string };
}

interface Props {
  deal: Deal;
  currentUserId: string;
}

const EFFORT_LABELS: Record<string, string> = {
  UNTER_1_STUNDE: 'Unter 1 Std',
  EIN_BIS_DREI_STUNDEN: '1–3 Std',
  DREI_BIS_ACHT_STUNDEN: '3–8 Std',
  MEHRERE_TAGE: 'Mehrere Tage',
  FORTLAUFEND: 'Fortlaufend',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  ACTIVE: { label: 'Aktiv', color: '#0D9488', bg: '#F0FDFA' },
  COMPLETED: { label: 'Abgeschlossen', color: '#22A06B', bg: '#E8F5E9' },
  DISPUTED: { label: 'Dispute', color: '#DC2626', bg: '#FEE2E2' },
  CANCELLED: { label: 'Abgebrochen', color: '#64748B', bg: '#F1F5F9' },
};

export default function ServiceDealStatus({ deal, currentUserId }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPartyA = deal.partyA.id === currentUserId;
  const isPartyB = deal.partyB.id === currentUserId;
  const myCompleted = isPartyA ? deal.partyACompleted : deal.partyBCompleted;
  const otherCompleted = isPartyA ? deal.partyBCompleted : deal.partyACompleted;
  const otherName = isPartyA
    ? [deal.partyB.firstName, deal.partyB.lastName].filter(Boolean).join(' ') || 'Partner'
    : [deal.partyA.firstName, deal.partyA.lastName].filter(Boolean).join(' ') || 'Partner';
  const myName = isPartyA
    ? [deal.partyA.firstName, deal.partyA.lastName].filter(Boolean).join(' ') || 'Du'
    : [deal.partyB.firstName, deal.partyB.lastName].filter(Boolean).join(' ') || 'Du';

  const statusCfg = STATUS_CONFIG[deal.status] ?? STATUS_CONFIG.ACTIVE;

  const handleComplete = async () => {
    if (!confirm('Bist du sicher, dass du deine Leistung als erledigt markieren möchtest?')) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leistungstausch/deals/${deal.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      window.location.reload();
    } catch { setError('Netzwerkfehler.'); setLoading(false); }
  };

  const handleCancel = async () => {
    const msg = deal.cancelRequestedBy
      ? 'Möchtest du den Abbruch bestätigen? Der Deal wird einvernehmlich beendet.'
      : 'Möchtest du den Deal abbrechen? Die andere Seite muss bestätigen.';
    if (!confirm(msg)) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/leistungstausch/deals/${deal.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }
      window.location.reload();
    } catch { setError('Netzwerkfehler.'); setLoading(false); }
  };

  const createdDate = new Date(deal.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div>
      {/* Status Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-[#1A2332]">Deal</h1>
        <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ backgroundColor: statusCfg.bg, color: statusCfg.color }}>
          {statusCfg.label}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800 mb-6">{error}</div>
      )}

      {/* Cancel Request Banner */}
      {deal.cancelRequestedBy && deal.status === 'ACTIVE' && (
        <div className="bg-amber-50 border border-amber-200 rounded-[10px] px-4 py-3 text-sm text-amber-800 mb-6">
          {deal.cancelRequestedBy === currentUserId
            ? 'Du hast den Abbruch angefragt. Warte auf Bestätigung.'
            : `${otherName} möchte den Deal abbrechen.`}
          {deal.cancelRequestedBy !== currentUserId && (
            <button onClick={handleCancel} disabled={loading}
              className="ml-3 text-amber-700 font-semibold underline hover:no-underline">
              Abbruch bestätigen
            </button>
          )}
        </div>
      )}

      {/* Two-Column Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* My Side */}
        <div className={`border rounded-[10px] p-5 ${myCompleted ? 'border-[#22A06B] bg-[#E8F5E9]/30' : 'border-[#E5E7EB]'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A2332]">Deine Leistung</h3>
            {myCompleted ? (
              <span className="text-xs font-medium text-[#22A06B] bg-[#E8F5E9] px-2 py-0.5 rounded-full">Erledigt ✓</span>
            ) : (
              <span className="text-xs font-medium text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">Offen</span>
            )}
          </div>
          <p className="text-sm text-[#64748B] line-clamp-3 mb-2">
            {isPartyA ? deal.proposal.soughtDescription : deal.proposal.offeredDescription}
          </p>
          <p className="text-xs text-[#94A3B8]">
            Aufwand: {EFFORT_LABELS[isPartyA ? deal.proposal.soughtEffort : deal.proposal.offeredEffort] ?? ''}
          </p>
          {!myCompleted && deal.status === 'ACTIVE' && (
            <button onClick={handleComplete} disabled={loading}
              className="mt-4 w-full px-4 py-2.5 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:opacity-50 transition-colors">
              {loading ? 'Wird markiert...' : 'Als erledigt markieren'}
            </button>
          )}
        </div>

        {/* Other Side */}
        <div className={`border rounded-[10px] p-5 ${otherCompleted ? 'border-[#22A06B] bg-[#E8F5E9]/30' : 'border-[#E5E7EB]'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#1A2332]">Leistung von {otherName}</h3>
            {otherCompleted ? (
              <span className="text-xs font-medium text-[#22A06B] bg-[#E8F5E9] px-2 py-0.5 rounded-full">Erledigt ✓</span>
            ) : (
              <span className="text-xs font-medium text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full">Offen</span>
            )}
          </div>
          <p className="text-sm text-[#64748B] line-clamp-3 mb-2">
            {isPartyA ? deal.proposal.offeredDescription : deal.proposal.soughtDescription}
          </p>
          <p className="text-xs text-[#94A3B8]">
            Aufwand: {EFFORT_LABELS[isPartyA ? deal.proposal.offeredEffort : deal.proposal.soughtEffort] ?? ''}
          </p>
          {!otherCompleted && deal.status === 'ACTIVE' && (
            <p className="mt-4 text-xs text-[#94A3B8] text-center">Warte auf {otherName}...</p>
          )}
        </div>
      </div>

      {/* Deal Info */}
      <div className="border border-[#E5E7EB] rounded-[10px] p-5 mb-6">
        <h3 className="text-sm font-semibold text-[#1A2332] mb-3">Vereinbarung</h3>
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-[#64748B]">Angebot</dt>
            <dd className="text-[#1A2332] font-medium">{deal.proposal.serviceListing.title}</dd>
          </div>
          {deal.proposal.proposedTimeframe && (
            <div className="flex justify-between">
              <dt className="text-[#64748B]">Zeitraum</dt>
              <dd className="text-[#1A2332]">{deal.proposal.proposedTimeframe}</dd>
            </div>
          )}
          {deal.proposal.proposedLocation && (
            <div className="flex justify-between">
              <dt className="text-[#64748B]">Ort</dt>
              <dd className="text-[#1A2332]">{deal.proposal.proposedLocation}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-[#64748B]">Erstellt am</dt>
            <dd className="text-[#1A2332]">{createdDate}</dd>
          </div>
        </dl>
      </div>

      {/* Actions */}
      {deal.status === 'ACTIVE' && !deal.cancelRequestedBy && (
        <div className="flex justify-center">
          <button onClick={handleCancel} disabled={loading}
            className="text-sm text-[#64748B] hover:text-[#DC2626] transition-colors">
            Deal abbrechen
          </button>
        </div>
      )}

      {deal.status === 'COMPLETED' && (
        <div className="bg-[#E8F5E9] border border-[#22A06B]/20 rounded-[10px] p-5 text-center">
          <p className="text-[#22A06B] font-semibold">Deal erfolgreich abgeschlossen!</p>
          <p className="text-sm text-[#64748B] mt-1">Beide Seiten haben ihre Leistungen bestätigt.</p>
        </div>
      )}

      {deal.status === 'CANCELLED' && (
        <div className="bg-[#F1F5F9] border border-[#E5E7EB] rounded-[10px] p-5 text-center">
          <p className="text-[#64748B] font-semibold">Deal abgebrochen</p>
          {deal.cancelReason && <p className="text-sm text-[#94A3B8] mt-1">Grund: {deal.cancelReason}</p>}
        </div>
      )}
    </div>
  );
}
