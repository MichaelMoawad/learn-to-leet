import type { ElementType, HTMLAttributes, ReactNode } from 'react';

interface PanelProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  raised?: boolean; // bg-2 instead of bg-1
  children: ReactNode;
}

/** Square, notched-corner surface with a 2px border (SPEC 5.1). */
export function Panel({ as: Tag = 'div', raised = false, className = '', children, ...rest }: PanelProps) {
  return (
    <Tag className={`pixel-corners border-2 border-line ${raised ? 'bg-bg-2' : 'bg-bg-1'} ${className}`} {...rest}>
      {children}
    </Tag>
  );
}

export default Panel;
