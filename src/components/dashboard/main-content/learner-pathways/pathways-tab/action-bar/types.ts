import type React from 'react';
import type { MessageDescriptor } from '@edx/frontend-platform/i18n';

export interface PathwaysAction {
  id: string;
  label: MessageDescriptor;
  /** Shown in place of label while loading: true */
  loadingLabel?: MessageDescriptor;
  /** Paragon Button variant. Not applicable (and ignored) when `destination` is set. */
  variant?: string;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
  /** Associates button with a form by its id — enables external submit */
  form?: string;
  onClick?: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
  testId?: string;
  /** Rendered before the label via Paragon Button's iconBefore prop. */
  iconBefore?: React.ComponentType;
  /** If set, renders this action as a Paragon Hyperlink to this URL instead of a Button. */
  destination?: string;
  /** Hyperlink target — only meaningful when `destination` is set. Defaults to '_blank'. */
  target?: '_blank' | '_self';
}

export interface PathwaysActionBarConfig {
  primary?: PathwaysAction;
  secondary?: PathwaysAction[];
  /** Layout of controls inside ActionRow. Defaults to 'end'. */
  alignment?: 'center' | 'split' | 'end';
  /** Accessible aria-label for the <footer> landmark. */
  label?: string;
}
