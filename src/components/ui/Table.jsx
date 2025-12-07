function Table({ children, className = '' }) {
  return (
    <div className="-mx-3 overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 sm:mx-0 sm:rounded-xl">
      <table className={`w-full text-left text-slate-900 dark:text-slate-100 ${className}`}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-slate-50 dark:bg-slate-800/60 ${className}`}>
      {children}
    </thead>
  );
}

function TableBody({ children, className = '' }) {
  return (
    <tbody className={`bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800 ${className}`}>
      {children}
    </tbody>
  );
}

function TableRow({ children, className = '', onClick }) {
  const clickableClass = onClick ? 'hover:bg-slate-50 cursor-pointer' : '';
  
  return (
    <tr 
      className={`${clickableClass} ${onClick ? 'dark:hover:bg-slate-800/60' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

function TableHead({ children, className = '' }) {
  return (
    <th className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400 sm:px-5 sm:py-3 sm:text-xs ${className}`}>
      {children}
    </th>
  );
}

function TableCell({ children, className = '' }) {
  return (
    <td className={`px-3 py-2 text-xs text-slate-900 dark:text-slate-100 sm:px-5 sm:py-3 sm:text-sm ${className}`}>
      {children}
    </td>
  );
}

Table.Header = TableHeader;
Table.Body = TableBody;
Table.Row = TableRow;
Table.Head = TableHead;
Table.Cell = TableCell;

export default Table;