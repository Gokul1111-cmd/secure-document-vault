function Card({ children, className = '', padding = 'default', hover = false }) {
  const baseClasses = 'bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm transition-colors';
  const hoverClasses = hover ? 'hover:shadow-md transition-shadow duration-200' : '';
  
  const paddings = {
    none: '',
    sm: 'p-3 sm:p-3.5 lg:p-4',
    default: 'p-4 sm:p-5 lg:p-5',
    lg: 'p-5 sm:p-6 lg:p-6'
  };
  
  return (
    <div className={`${baseClasses} ${hoverClasses} ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ children, className = '' }) {
  return (
    <div className={`mb-3 sm:mb-5 ${className}`}>
      {children}
    </div>
  );
}

function CardTitle({ children, className = '' }) {
  return (
    <h3 className={`text-base font-semibold text-slate-900 dark:text-white sm:text-lg ${className}`}>
      {children}
    </h3>
  );
}

function CardContent({ children, className = '' }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

Card.Header = CardHeader;
Card.Title = CardTitle;
Card.Content = CardContent;

export default Card;