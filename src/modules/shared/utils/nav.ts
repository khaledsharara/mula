import { router } from 'expo-router';

/** Closes the current screen; falls back to Home when it was opened directly (deep link, notification). */
export function goBack(): void {
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
