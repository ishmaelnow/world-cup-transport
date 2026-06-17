import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md', ...props }: CardProps) {
  const paddings = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md border border-gray-200 ${paddings[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
