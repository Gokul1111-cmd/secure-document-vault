function Table({ children, className = '' }) {
  return (
    <div className="-mx-3 overflow-x-auto rounded-lg border border-slate-200 sm:mx-0 sm:rounded-xl">
      <table className={`w-full text-left ${className}`}>
        {children}
      </table>
    </div>
  );
}

function TableHeader({ children, className = '' }) {
  return (
    <thead className={`bg-slate-50 ${className}`}>
      {children}
    </thead>
  );
}

function TableBody({ children, className = '' }) {
  return (
    <tbody className={`bg-white divide-y divide-slate-200 ${className}`}>
      {children}
    </tbody>
  );
}

function TableRow({ children, className = '', onClick }) {
  const clickableClass = onClick ? 'hover:bg-slate-50 cursor-pointer' : '';
  
  return (
    <tr 
      className={`${clickableClass} ${className}`}
      onClick={onClick}
    >
      {children}
    </tr>
  );
}

function TableHead({ children, className = '' }) {
  return (
    <th className={`px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:px-5 sm:py-3 sm:text-xs ${className}`}>
      {children}
    </th>
  );
}

function TableCell({ children, className = '' }) {
  return (
    <td className={`px-3 py-2 text-xs text-slate-900 sm:px-5 sm:py-3 sm:text-sm ${className}`}>
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