import * as React from 'react';

import { cn } from '@/lib/utils';

const Alert = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700', className)} {...props} />
));
Alert.displayName = 'Alert';

export { Alert };
