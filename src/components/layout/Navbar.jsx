import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { Shield, LogOut, ChevronDown, Settings, Menu } from 'lucide-react';

function Navbar({ onToggleSidebar = () => {} }) {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 shadow-sm">
      <div className="px-3 py-2 sm:px-5 sm:py-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={onToggleSidebar}
              className="inline-flex items-center justify-center p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 lg:hidden"
              aria-label="Toggle navigation"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="p-1.5 bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-sm font-semibold text-slate-900 sm:text-base">Secure Document Vault</h1>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center space-x-2.5 p-2 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-600 to-blue-700 flex items-center justify-center text-white text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-medium text-slate-900 leading-tight">{user?.name}</p>
                <p className="text-xs text-slate-500 capitalize">{user?.role?.toLowerCase()}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
                <div className="p-2.5 space-y-2">
                  <div className="px-3 py-2 border border-slate-200 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">Signed in as</p>
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-slate-700 rounded-lg hover:bg-slate-100"
                    onClick={() => setShowDropdown(false)}
                  >
                    <Settings size={16} />
                    <span>Profile Settings</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 rounded-lg hover:bg-red-50"
                  >
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;