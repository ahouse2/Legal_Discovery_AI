import { Link, Outlet, useLocation } from 'react-router-dom';
import { LayoutDashboard, HardDrive, GitGraph, Clock, FileText, Scale } from 'lucide-react';
import UserNav from './UserNav';
import ElectricBlueBackground from './ElectricBlueBackground';

export default function Layout() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/connect', icon: HardDrive, label: 'Connect Drive' },
    { path: '/timeline', icon: Clock, label: 'Timeline' },
    { path: '/graph', icon: GitGraph, label: 'Knowledge Graph' },
    { path: '/research', icon: Scale, label: 'Legal Research' },
    { path: '/files', icon: FileText, label: 'Files' },
  ];

  return (
    <div className="flex h-screen bg-black text-zinc-100 font-sans selection:bg-indigo-500/30">
      <aside className="w-72 bg-zinc-950 border-r border-zinc-900 flex flex-col">
        <div className="p-8 border-b border-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Scale className="text-white h-5 w-5" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-white">Legal Discovery AI</h1>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                  isActive
                    ? 'bg-zinc-900 text-white shadow-inner shadow-black/50 border border-zinc-800'
                    : 'text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300'
                }`}
              >
                <Icon size={18} className={`transition-colors ${isActive ? 'text-indigo-400' : 'text-zinc-600 group-hover:text-zinc-400'}`} />
                <span className="font-medium text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]" />}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-zinc-900/50 bg-zinc-950/50">
          <UserNav />
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-black relative">
        <ElectricBlueBackground />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900/20 via-black to-black pointer-events-none" />
        <div className="relative p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
