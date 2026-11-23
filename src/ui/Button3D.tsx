// Pushable 3D button (SPEC 5.2). Styles live in src/styles/button3d.css.
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';

export type Button3DVariant = 'primary' | 'secondary' | 'success' | 'ghost';
export type Button3DSize = 'sm' | 'md' | 'lg';

interface Common {
  variant?: Button3DVariant; // default 'primary'
  size?: Button3DSize; // default 'md'
  children: ReactNode;
}
export type Button3DProps =
  | (Common & ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined })
  | (Common & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string });

export function Button3D({ variant = 'primary', size = 'md', children, className, ...rest }: Button3DProps) {
  const cls = className ? `btn3d ${className}` : 'btn3d';
  const layers = (
    <>
      <span className="btn3d-shadow" aria-hidden="true" />
      <span className="btn3d-edge" aria-hidden="true" />
      <span className="btn3d-front">{children}</span>
    </>
  );
  if ('href' in rest && rest.href !== undefined) {
    return (
      <a className={cls} data-variant={variant} data-size={size} {...(rest as AnchorHTMLAttributes<HTMLAnchorElement>)}>
        {layers}
      </a>
    );
  }
  const buttonProps = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button
      className={cls}
      data-variant={variant}
      data-size={size}
      {...buttonProps}
      type={buttonProps.type ?? 'button'}
    >
      {layers}
    </button>
  );
}

export default Button3D;
