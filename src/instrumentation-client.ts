import { initialiserMesureAudience, preparerNavigation } from "./lib/analytics";

initialiserMesureAudience();

export function onRouterTransitionStart(url: string) {
  preparerNavigation(url);
}
