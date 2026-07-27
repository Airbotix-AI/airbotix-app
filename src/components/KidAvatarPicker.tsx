import { KidAvatar } from './KidAvatar';
import { KID_AVATARS, type KidAvatarId } from '@/lib/kidAvatars';

const GROUP_LABELS = { animal: 'Animal friends', fantasy: 'Robot & fantasy', human: 'Kid creators' } as const;

export function KidAvatarPicker({
  value,
  onChange,
  usedAvatarIds = [],
}: {
  value: KidAvatarId;
  onChange: (id: KidAvatarId) => void;
  usedAvatarIds?: readonly string[];
}) {
  return (
    <fieldset>
      <legend className="label-k12">Choose an avatar</legend>
      <p className="mb-4 text-[13px] text-slate2">This helps everyone recognise the right kids page.</p>
      {usedAvatarIds.includes(value) && (
        <p className="mb-4 rounded-xl bg-wash-sunshine px-3 py-2 text-[13px] font-medium text-ink">
          Another kid in this family uses this avatar. You can still choose it.
        </p>
      )}
      {(Object.keys(GROUP_LABELS) as Array<keyof typeof GROUP_LABELS>).map((category) => (
        <div key={category} className="mb-4">
          <div className="mb-2 text-[12px] font-bold uppercase tracking-wide text-slate2">{GROUP_LABELS[category]}</div>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {KID_AVATARS.filter((avatar) => avatar[2] === category).map(([id, name]) => (
              <button
                key={id}
                type="button"
                aria-label={`Choose ${name}`}
                aria-pressed={value === id}
                onClick={() => onChange(id)}
                className={`rounded-2xl border-2 p-1 transition ${value === id ? 'border-brand-bubblegum bg-wash-bubblegum' : 'border-transparent hover:border-hairline'}`}
              >
                <KidAvatar avatarId={id} nickname={name} size="md" className="mx-auto" />
              </button>
            ))}
          </div>
        </div>
      ))}
    </fieldset>
  );
}
