import { useMemo, useState } from 'react';

export interface AsyncOperationState {
  status: 'idle' | 'pending' | 'error';
  error: string | null;
}

export interface PathwaysRequestState {
  profile: AsyncOperationState;
  pathway: AsyncOperationState;
}

const IDLE: AsyncOperationState = { status: 'idle', error: null };

/**
 * Transient request state for in-flight profile/pathway generation. Deliberately not
 * Zustand-backed and never persisted — loading/error flags describe an operation, not
 * a durable entity. A plain hook factory, not a singleton: each composition component
 * that calls it (e.g. LearnerPathwaysTab for initial Intake submission,
 * CareerSelectionContainer for Goal Summary regeneration/pathway builds) gets its own
 * isolated `profile`/`pathway` state, with zero cross-instance coupling.
 */
export const usePathwaysRequestState = () => {
  const [profile, setProfile] = useState<AsyncOperationState>(IDLE);
  const [pathway, setPathway] = useState<AsyncOperationState>(IDLE);

  const actions = useMemo(() => ({
    beginProfile: () => setProfile({ status: 'pending', error: null }),
    resolveProfile: () => setProfile(IDLE),
    failProfile: (error: string) => setProfile({ status: 'error', error }),
    beginPathway: () => setPathway({ status: 'pending', error: null }),
    resolvePathway: () => setPathway(IDLE),
    failPathway: (error: string) => setPathway({ status: 'error', error }),
  }), []);

  return {
    profile,
    pathway,
    ...actions,
  };
};
