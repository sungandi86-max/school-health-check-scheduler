export const ONBOARDING_DISMISSED_KEY = 'schoolHealthHub.onboarding.dismissed';

export function shouldShowOnboarding() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(ONBOARDING_DISMISSED_KEY) !== 'true';
}

export function dismissOnboarding() {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(ONBOARDING_DISMISSED_KEY, 'true');
}

export function resetOnboardingPreference() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(ONBOARDING_DISMISSED_KEY);
}
