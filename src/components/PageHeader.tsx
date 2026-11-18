import type { ReactNode } from 'react';

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  centered?: boolean;
}

export default function PageHeader({ eyebrow, title, subtitle, action, centered = false }: PageHeaderProps) {
  return (
    <header className={`mb-7 flex flex-col gap-4 lg:justify-between ${centered ? 'items-center text-center lg:items-center' : 'lg:flex-row lg:items-end'}`}>
      <div className={`min-w-0 ${centered ? 'w-full' : ''}`}>
        <p className="section-eyebrow mb-2">{eyebrow}</p>
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div>}
    </header>
  );
}
