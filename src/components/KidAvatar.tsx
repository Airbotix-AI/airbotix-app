import clsx from 'clsx';

import { DEFAULT_KID_AVATAR_ID, kidAvatarAsset, kidAvatarName } from '@/lib/kidAvatars';

export function KidAvatar({
  avatarId,
  nickname,
  size = 'md',
  className,
}: {
  avatarId?: string | null;
  nickname?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}) {
  const sizes = { sm: 'h-10 w-10', md: 'h-14 w-14', lg: 'h-20 w-20', xl: 'h-28 w-28' };
  const label = nickname ? `${nickname}'s avatar: ${kidAvatarName(avatarId)}` : kidAvatarName(avatarId);
  return (
    <img
      src={kidAvatarAsset(avatarId)}
      alt={label}
      onError={(event) => {
        const fallback = kidAvatarAsset(DEFAULT_KID_AVATAR_ID);
        if (!event.currentTarget.src.endsWith(fallback)) event.currentTarget.src = fallback;
      }}
      className={clsx(sizes[size], 'shrink-0 rounded-full object-cover shadow-sm', className)}
    />
  );
}
