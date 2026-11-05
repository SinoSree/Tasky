// ---------------------------------------------------------------------------
// Button.jsx — one button used everywhere.
//
// `variant` picks the look (primary / secondary / ghost / danger).
// `...rest` forwards anything else (onClick, type, disabled, aria-label…)
// straight to the real <button>, so this wrapper never blocks a feature.
// ---------------------------------------------------------------------------
import React from 'react';
import Icon from './Icon.jsx';

export default function Button({
  children, variant = 'secondary', size = 'md',
  icon, iconOnly = false, className = '', ...rest
}) {
  const classes = [
    'btn', `btn-${variant}`, `btn-${size}`,
    iconOnly ? 'btn-icon-only' : '', className,
  ].filter(Boolean).join(' ');

  return (
    <button className={classes} {...rest}>
      {icon && <Icon name={icon} size={size === 'sm' ? 14 : 16} />}
      {!iconOnly && children}
    </button>
  );
}
