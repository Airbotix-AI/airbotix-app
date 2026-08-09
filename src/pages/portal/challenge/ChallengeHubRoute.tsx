// Route wrapper: pulls `:slug` off the URL so `ChallengeHubPage` takes it as a
// plain prop and can be rendered in tests without a route match.
import { useParams } from 'react-router-dom';

import { ChallengeHubPage } from './ChallengeHubPage';

export function ChallengeHubRoute() {
  const { slug = '' } = useParams<{ slug: string }>();
  return <ChallengeHubPage slug={slug} />;
}
