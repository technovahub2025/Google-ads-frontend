import { NavLink } from 'react-router-dom'
import ConnectionStatus from './ConnectionStatus.jsx'

const navItems = [
  { label: 'Overview', icon: 'dashboard', href: '/google-ads' },
  { label: 'Campaigns', icon: 'campaign', href: '/google-ads/campaigns' },
  { label: 'Ad Groups', icon: 'view_quilt', href: '/google-ads/ad-groups' },
  { label: 'Ads', icon: 'format_stroke', href: '/google-ads/ads' },
  { label: 'Keywords', icon: 'search', href: '/google-ads/keywords' },
  { label: 'Assets', icon: 'image', href: '/google-ads/assets' },
  { label: 'Budgets', icon: 'account_balance_wallet', href: '/google-ads/budgets' },
  { label: 'Reports', icon: 'insights', href: '/google-ads/reports' },
  { label: 'Settings', icon: 'settings', href: '/google-ads/settings' },
]

export default function GoogleAdsSidebar({ sidebarOpen, setSidebarOpen }) {
  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <nav
        className={`fixed md:sticky inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col overflow-y-auto border-r border-surface-variant bg-surface-container-lowest p-stack-md shadow-soft space-y-unit transform transition-transform duration-200 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 md:flex`}
      >
        <div className="flex items-center gap-3 mb-stack-lg px-2">
          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center overflow-hidden">
            <span className="material-symbols-outlined text-on-primary text-[24px]">ads_click</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm font-bold text-primary m-0 p-0">
              Google Ads
            </h1>
            <p className="font-label-sm text-label-sm text-on-surface-variant m-0 p-0">
              Nexion Module
            </p>
          </div>
        </div>

        <div className="mb-stack-md px-2">
          <ConnectionStatus />
        </div>

        <div className="flex-1 space-y-1 overflow-y-auto pr-2">
          {navItems.map((item) => (
            <NavLink
              key={item.label}
              to={item.href}
              end={item.href === '/google-ads'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-primary text-on-primary'
                    : 'text-on-surface-variant hover:bg-surface-container-highest'
                }`
              }
            >
              <span className="material-symbols-outlined mr-3">{item.icon}</span>
              <span className="font-label-md text-label-md">{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  )
}
