import clsx from 'clsx';
import { HeartHandshake, Pause, Play, Rocket } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type AuthRole = 'parent' | 'kid';

interface AuthIdentityLayoutProps {
  activeRole: AuthRole;
  children: React.ReactNode;
}

const ROLE_OPTIONS = [
  {
    role: 'parent' as const,
    to: '/portal/login',
    label: 'Parent or guardian',
    detail: 'Email + one-time code',
    icon: HeartHandshake,
  },
  {
    role: 'kid' as const,
    to: '/learn/login',
    label: 'Kid creator',
    detail: 'Family code + PIN',
    icon: Rocket,
  },
];

const FEATURED_CREATIONS = [
  {
    id: 'platform',
    image: '/media/courses/super-mario-advanced.png',
    eyebrow: 'Build a game',
    title: 'Create your first world',
    pixelated: true,
  },
  {
    id: 'rhythm',
    image: '/media/courses/rhythm-game.png',
    eyebrow: 'Code the beat',
    title: 'Turn music into play',
    pixelated: false,
  },
  {
    id: 'space',
    image: '/media/courses/space-defender.png',
    eyebrow: 'Launch a mission',
    title: 'Defend the galaxy',
    pixelated: true,
  },
] as const;

const FEATURE_ROTATION_MS = 8_000;

export function AuthIdentityLayout({ activeRole, children }: AuthIdentityLayoutProps) {
  const [activeCreation, setActiveCreation] = useState(0);
  const [creationPaused, setCreationPaused] = useState(false);
  const featuredCreation = FEATURED_CREATIONS[activeCreation];

  useEffect(() => {
    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (creationPaused || prefersReducedMotion) return;

    const interval = window.setInterval(() => {
      setActiveCreation((current) => (current + 1) % FEATURED_CREATIONS.length);
    }, FEATURE_ROTATION_MS);

    return () => window.clearInterval(interval);
  }, [creationPaused]);

  return (
    <div className={clsx('auth-shell auth-shell-identity', `auth-shell-role-${activeRole}`)}>
      <div className="auth-gateway">
        <aside className="auth-gateway-visual">
          <img src="/logo-black-horizontal.png" alt="Airbotix" className="auth-gateway-logo" />
          <div className="auth-gateway-copy">
            <span className="sticker-mint">Creative world online</span>
            <h2>One code. A whole world to build.</h2>
            <p>Parents set the stage. Young creators take it from here.</p>
          </div>

          <div className="auth-game-stage" aria-label="Airbotix creative platform world">
            <div className="auth-game-stage-bar" aria-hidden="true">
              <span className="auth-game-stage-dots"><i /><i /><i /></span>
              <span>Airbotix creations</span>
              <span className="auth-game-stage-live"><i /> Featured</span>
            </div>
            <div className="auth-game-stage-screen">
              {FEATURED_CREATIONS.map((creation, index) => (
                <img
                  key={creation.id}
                  src={creation.image}
                  alt=""
                  data-testid={`auth-promo-${creation.id}`}
                  className={clsx('auth-game-promo-image', {
                    'auth-game-promo-active': activeCreation === index,
                    'auth-game-promo-pixelated': creation.pixelated,
                  })}
                />
              ))}
              <span className="auth-game-hud auth-game-hud-mode">{featuredCreation.eyebrow}</span>
              <span className="auth-game-hud auth-game-hud-level">{featuredCreation.title}</span>
              <div className="auth-game-pagination" aria-label="Featured creations">
                {FEATURED_CREATIONS.map((creation, index) => (
                  <button
                    key={creation.id}
                    type="button"
                    aria-label={`Show ${creation.title}`}
                    aria-pressed={activeCreation === index}
                    onClick={() => setActiveCreation(index)}
                  />
                ))}
              </div>
              <button
                type="button"
                className="auth-game-playback"
                aria-label={creationPaused ? 'Play featured creations' : 'Pause featured creations'}
                onClick={() => setCreationPaused((paused) => !paused)}
              >
                {creationPaused ? <Play size={12} fill="currentColor" /> : <Pause size={12} fill="currentColor" />}
              </button>
              <span className="auth-game-spark auth-game-spark-one" aria-hidden="true" />
              <span className="auth-game-spark auth-game-spark-two" aria-hidden="true" />
              <span className="auth-game-spark auth-game-spark-three" aria-hidden="true" />
            </div>
          </div>
        </aside>

        <main className="auth-gateway-main">
          <div className="auth-gateway-main-inner">
            <div>
              <p className="auth-role-prompt">Who is signing in?</p>
              <nav className="auth-role-switch" aria-label="Choose who is signing in">
                {ROLE_OPTIONS.map((option) => {
                  const active = option.role === activeRole;
                  const Icon = option.icon;

                  return (
                    <Link
                      key={option.role}
                      to={option.to}
                      aria-current={active ? 'page' : undefined}
                      data-testid={`auth-role-${option.role}`}
                      className={clsx('auth-role-option', `auth-role-option-${option.role}`, {
                        'auth-role-option-active': active,
                      })}
                    >
                      <span className="auth-role-icon" aria-hidden="true">
                        <Icon size={22} strokeWidth={2.4} />
                      </span>
                      <span className="min-w-0">
                        <span className="auth-role-label">{option.label}</span>
                        <span className="auth-role-detail">{option.detail}</span>
                      </span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="auth-card auth-card-identity">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
