import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Network,
  GitCompare,
  MessageSquare,
  Settings,
  BookOpen,
  HelpCircle,
} from 'lucide-react'

const links = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/graph', icon: Network, label: 'Knowledge Graph' },
  { to: '/compare', icon: GitCompare, label: 'Compare' },
  { to: '/ask', icon: MessageSquare, label: 'Ask' },
  { to: '/settings', icon: Settings, label: 'Settings' },
  { to: '/guide', icon: HelpCircle, label: 'Guide' },
]

export default function Sidebar() {
  return (
    <aside className="w-64 bg-surface-800 border-r border-gray-700/50 flex flex-col shrink-0">
      <div className="p-5 border-b border-gray-700/50">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-blue-400" />
          <h1 className="text-lg font-bold text-white">SCI Literature</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">Deep-Read Analysis Toolkit</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/20 text-blue-400'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-surface-700/50'
              }`
            }
          >
            <Icon className="w-4.5 h-4.5" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-700/50">
        <p className="text-xs text-gray-500">v1.0 &middot; GitHub Pages</p>
      </div>
    </aside>
  )
}
