import { CanDeactivateFn } from '@angular/router';

/** A page that can stop the user from leaving by accident. */
export interface HasUnsavedChanges {
  /** True or a promise of true means "go ahead and leave". The page decides whether to ask first. */
  canLeave(): boolean | Promise<boolean>;
}

/**
 * Put on a route with `canDeactivate: [unsavedChangesGuard]`. Before the user leaves the page,
 * the page itself is asked (a form that was not changed just says yes).
 */
export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (page) => page.canLeave();
