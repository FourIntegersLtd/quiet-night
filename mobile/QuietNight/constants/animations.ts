/**
 * Animation timing constants (revised spec Section 5.2).
 * Wizard 300ms ease-out; bottom sheet open 300ms / close 250ms; dialog open 250ms / close 200ms;
 * tab switch 200ms; card tap scale spring 150ms; toast 300ms in / 200ms out; icon select 100ms + 200ms.
 */

export const animations = {
  /** Wizard step transition (slide, ease-out) */
  wizardStep: 300,
  /** Bottom sheet open (ease-out) */
  bottomSheetOpen: 300,
  /** Bottom sheet close */
  bottomSheetClose: 250,
  /** Full-screen alert dialog open */
  dialogOpen: 250,
  /** Full-screen alert dialog close */
  dialogClose: 200,
  /** Tab switch */
  tabSwitch: 200,
  /** Card / list item tap scale spring */
  cardTap: 150,
  /** Toast entry */
  toastIn: 300,
  /** Toast exit */
  toastOut: 200,
  /** Icon / grid select (press) */
  iconSelect: 100,
  /** Icon / grid select background transition */
  iconSelectBg: 200,
  /** Generic tap feedback (opacity) */
  tapFeedback: 100,
} as const;
