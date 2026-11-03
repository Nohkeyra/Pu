import type { ReactNode } from 'react';
import CustomerFooter from '@/components/layout/CustomerFooter';
import CustomerPageFloral from '@/components/layout/CustomerPageFloral';

interface CustomerPageLayoutProps {
  children: ReactNode;
  className?: string;
}

/** Keeps the shared footer in React's normal document flow, below page content. */
export default function CustomerPageLayout({ children, className = '' }: CustomerPageLayoutProps) {
  return (
    <div className={`customer-page ${className}`.trim()}>
      {children}
      <CustomerPageFloral />
      <CustomerFooter />
    </div>
  );
}
