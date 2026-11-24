import { Link } from 'react-router-dom'

export default function Breadcrumbs({ items }) {
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 text-sm text-on-surface-variant font-body-md">
      <ol className="flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1 md:gap-x-3">
        {items.map((item, index) => (
          <li key={index} className="inline-flex min-w-0 items-center">
            {index > 0 && (
              <span className="material-symbols-outlined text-[16px] mx-1">chevron_right</span>
            )}
            {item.href ? (
              <Link className="break-words hover:text-blue-800 motion-safe:transition-colors" to={item.href}>
                {item.label}
              </Link>
            ) : (
              <span className="text-primary font-medium" aria-current="page">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}
