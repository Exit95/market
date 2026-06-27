import { useState, useEffect } from 'react';

const AVAILABILITY_OPTIONS = [
  { value: 'WERKTAGS', label: 'Werktags' },
  { value: 'ABENDS', label: 'Abends' },
  { value: 'WOCHENENDE', label: 'Wochenende' },
  { value: 'FLEXIBEL', label: 'Flexibel' },
];

export default function ServiceProfileEdit() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [bio, setBio] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [availability, setAvailability] = useState<string[]>([]);
  const [responseTime, setResponseTime] = useState('');

  useEffect(() => {
    fetch('/api/leistungstausch/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile) {
          setBio(data.profile.bio || '');
          setSkills(data.profile.skills ? JSON.parse(data.profile.skills) : []);
          setAvailability(data.profile.availability ? JSON.parse(data.profile.availability) : []);
          setResponseTime(data.profile.responseTime || '');
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addSkill = () => {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed) && skills.length < 20) {
      setSkills([...skills, trimmed]);
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setSkills(skills.filter(s => s !== skill));
  };

  const toggleAvailability = (val: string) => {
    setAvailability(prev =>
      prev.includes(val) ? prev.filter(x => x !== val) : [...prev, val]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch('/api/leistungstausch/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bio: bio || undefined,
          skills: skills.length > 0 ? skills : undefined,
          availability: availability.length > 0 ? availability : undefined,
          responseTime: responseTime || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) { setError(data.error); setSaving(false); return; }
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError('Netzwerkfehler.');
    }
    setSaving(false);
  };

  const inputClass = "w-full px-4 py-3 border border-[#E5E7EB] rounded-[10px] text-sm focus:outline-none focus:ring-2 focus:ring-[#0D9488]/40 focus:border-[#0D9488]";

  if (loading) {
    return <div className="text-sm text-[#64748B] py-8 text-center">Profil laden...</div>;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1A2332] mb-2">Leistungsprofil</h1>
        <p className="text-sm text-[#64748B]">Zeige anderen, was du kannst. Ein ausgefülltes Profil erhöht deine Sichtbarkeit.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-[10px] px-4 py-3 text-sm text-red-800 mb-4">{error}</div>
      )}
      {success && (
        <div className="bg-[#E8F5E9] border border-[#22A06B]/20 rounded-[10px] px-4 py-3 text-sm text-[#22A06B] mb-4">Profil gespeichert!</div>
      )}

      <div className="bg-white border border-[#E5E7EB] rounded-[10px] p-6 space-y-5">
        {/* Bio */}
        <div>
          <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Über mich</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={2000} rows={4}
            placeholder="Erzähle kurz, was du anbietest und was dich auszeichnet..."
            className={`${inputClass} resize-none`} />
          <p className="text-xs text-[#64748B] mt-1">{bio.length}/2000 Zeichen</p>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Fähigkeiten</label>
          <div className="flex gap-2 mb-2">
            <input value={skillInput} onChange={e => setSkillInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addSkill())}
              placeholder="z.B. Webdesign, Fotografie, Gartenarbeit..." className={`${inputClass} flex-1`} />
            <button type="button" onClick={addSkill}
              className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[#0D9488] text-white hover:bg-[#0F766E] transition-colors">
              +
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {skills.map(skill => (
              <span key={skill} className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm bg-[#CCFBF1] text-[#0F766E]">
                {skill}
                <button type="button" onClick={() => removeSkill(skill)} className="text-[#0D9488] hover:text-[#DC2626] ml-1">&times;</button>
              </span>
            ))}
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Verfügbarkeit</label>
          <div className="flex flex-wrap gap-2">
            {AVAILABILITY_OPTIONS.map(o => (
              <button key={o.value} type="button" onClick={() => toggleAvailability(o.value)}
                className={`px-4 py-2 rounded-[10px] text-sm font-medium border transition-colors ${
                  availability.includes(o.value)
                    ? 'border-[#0D9488] bg-[#F0FDFA] text-[#0D9488]'
                    : 'border-[#E5E7EB] text-[#64748B] hover:border-[#0D9488]/40'
                }`}>
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Response Time */}
        <div>
          <label className="block text-sm font-semibold text-[#1A2332] mb-1.5">Antwortzeit</label>
          <input value={responseTime} onChange={e => setResponseTime(e.target.value)}
            placeholder="z.B. Antwortet meist innerhalb 2 Stunden" className={inputClass} />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-8 py-3 rounded-[10px] text-sm font-semibold bg-[#0D9488] text-white hover:bg-[#0F766E] disabled:bg-[#E5E7EB] disabled:text-[#64748B] transition-colors">
            {saving ? 'Wird gespeichert...' : 'Profil speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
