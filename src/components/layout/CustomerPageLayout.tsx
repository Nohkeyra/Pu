import type { ReactNode } from 'react';
import CustomerFooter from '@/components/layout/CustomerFooter';

interface CustomerPageLayoutProps {
  children: ReactNode;
  className?: string;
  preFooterDecoration?: ReactNode;
}

/** Keeps the shared footer in React's normal document flow, below page content. */
export default function CustomerPageLayout({ children, className = '', preFooterDecoration }: CustomerPageLayoutProps) {
  return (
    <div className={`customer-page ${className}`.trim()}>
      {children}
      {preFooterDecoration && <div className="customer-pre-footer-decoration">{preFooterDecoration}</div>}
      <CustomerFooter />
    </div>
  );
}
