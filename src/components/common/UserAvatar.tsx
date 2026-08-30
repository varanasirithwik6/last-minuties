import type { User } from '../../types';

interface Props {
  user: Partial<User> | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const GRADIENT_COLORS = [
  'linear-gradient(135deg, #f97316, #8b5cf6)',
  'linear-gradient(135deg, #06b6d4, #8b5cf6)',
  'linear-gradient(135deg, #f97316, #ef4444)',
  'linear-gradient(135deg, #22c55e, #06b6d4)',
  'linear-gradient(135deg, #f59e0b, #f97316)',
];

function getGradient(name: string): string {
  const code = name.charCodeAt(0) + (name.charCodeAt(1) || 0);
  return GRADIENT_COLORS[code % GRADIENT_COLORS.length];
}

export default function UserAvatar({ user, size = 'md' }: Props) {
  const name = user?.name || '?';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (user?.profileImage) {
    return (
      <img
        src={user.profileImage}
        alt={name}
        className={`avatar avatar-${size}`}
      />
    );
  }

  return (
    <div
      className={`avatar avatar-${size}`}
      style={{ background: getGradient(name) }}
      aria-label={name}
    >
      {initials}
    </div>
  );
}
