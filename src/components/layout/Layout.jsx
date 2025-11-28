import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar.jsx';
import Sidebar from './Sidebar.jsx';

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 text-slate-900 dark:from-slate-900 dark:to-slate-950 dark:text-slate-100">
      <Navbar onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
      <div className="relative lg:flex">
        <Sidebar isMobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <main className="flex-1 px-3 pt-5 pb-12 sm:px-5 lg:px-6 xl:px-8">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;