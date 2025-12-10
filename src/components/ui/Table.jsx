import { cn } from '../../utils';

export function Table({ children, className, ...props }) {
  // wrapper allows horizontal scrolling when table is wider than its container
  return (
    <div className="w-full overflow-x-auto overflow-y-auto max-h-[calc(120vh-400px)]"> 
      <table className={cn('min-w-full table-auto border-collapse', className)} {...props}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children, className, ...props }) {
  return (
    <thead className={cn('bg-white', className)} {...props}>
      {children}
    </thead>
  );
}

export function TableBody({ children, className, ...props }) {
  return (
    <tbody className={cn('divide-y divide-gray-200', className)} {...props}>
      {children}
    </tbody>
  );
}

export function TableRow({ children, className, ...props }) {
  return (
    <tr className={cn('table-row overflow-x-auto', className)} {...props}>
      {children}
    </tr>
  );
}

export function TableHead({ children, className, ...props }) {
  return (
    <th className={cn('sticky top-0 px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider table-header-cell bg-white z-50', className)} {...props}>
      {children}
    </th>
  );
}

export function TableCell({ children, className, ...props }) {
  return (
    <td className={cn('px-6 py-4 whitespace-nowrap align-top table-cell', className)} {...props}>
      {children}
    </td>
  );
}