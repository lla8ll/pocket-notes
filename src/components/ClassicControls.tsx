import type { ButtonHTMLAttributes, ReactNode, Ref } from 'react';

type IconName = 'plus' | 'trash' | 'compose' | 'chevron' | 'pin' | 'share' | 'search' | 'close';

export function Icon({ name }: { name: IconName }) {
  return (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {name === 'plus' && <path d="M12 4v16M4 12h16" />}
      {name === 'trash' && <><path d="M5 6h14M9 3h6l1 3M7 6l1 15h8l1-15M10 9v9M14 9v9" /><path d="M8 3h8" /></>}
      {name === 'compose' && <><path d="M13 5H4v16h16V11" /><path d="m11 16 1-5L20 3l3 3-8 8-4 2ZM18 5l3 3" /></>}
      {name === 'chevron' && <path d="m9 5 7 7-7 7" />}
      {name === 'pin' && <><path d="m9 3 8 0-1 6 3 4v2H5v-2l3-4 1-6ZM12 15v7" /><path d="M8 3h10" /></>}
      {name === 'share' && <><path d="M10 7H4v14h16v-7" /><path d="M10 15c0-6 3-8 7-8V3l6 6-6 6v-4c-3 0-5 1-7 4Z" /></>}
      {name === 'search' && <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>}
      {name === 'close' && <path d="m7 7 10 10M17 7 7 17" />}
    </svg>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  back?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
}

export function ClassicButton({ back, buttonRef, children, className = '', ...props }: ButtonProps) {
  return <button ref={buttonRef} type="button" className={`classic-button ${back ? 'classic-button--back' : ''} ${className}`} {...props}>
    <span className="classic-button__face">{children}</span>
  </button>;
}

export function ClassicNavigationBar({ title, left, right, headingRef }: {
  title: string; left?: ReactNode; right?: ReactNode; headingRef?: Ref<HTMLHeadingElement>;
}) {
  return <header className="navigation-bar">
    <div className="navigation-bar__left">{left}</div>
    <h1 ref={headingRef} tabIndex={-1} className="navigation-bar__title">{title}</h1>
    <div className="navigation-bar__right">{right}</div>
  </header>;
}
