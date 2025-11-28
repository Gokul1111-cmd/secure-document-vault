import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Home, Settings, FileText, Users, Activity, X } from 'lucide-react';

function Sidebar({ isMobileOpen = false, onClose = () => {} }) {
  const { user } = useAuth();
  const location = useLocation();

  const userNavItems = [
    { to: '/dashboard', icon: Home, label: 'Dashboard' }
  ];

  const adminNavItems = [
    { to: '/admin', icon: Settings, label: 'Admin Panel' },
    { to: '/users', icon: Users, label: 'User Management' },
    { to: '/documents', icon: FileText, label: 'All Documents' },
    { to: '/audit-logs', icon: Activity, label: 'Audit Logs' }
  ];

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';
  const navItems = isAdmin ? [...userNavItems, ...adminNavItems] : userNavItems;

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden ${
          isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-60 sm:w-56 lg:w-56 xl:w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transform transition-transform duration-200 lg:static lg:translate-x-0 lg:shadow-none ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Sidebar navigation"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800 lg:hidden">
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Navigation</span>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-full overflow-y-auto px-3 py-5">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={`flex items-center space-x-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 dark:from-blue-500/20 dark:to-blue-500/10 dark:text-blue-100'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-blue-600 dark:text-blue-300' : ''} />
                  <span className="font-medium leading-tight">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;