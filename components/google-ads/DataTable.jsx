export default function DataTable({ columns, data, loading = false, emptyMessage = 'No data available', rowKey = 'id', actions = null }) {
  if (loading) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="p-6 border-b border-surface-variant">
          <div className="h-6 bg-surface-container-low rounded w-1/4 animate-pulse"></div>
        </div>
        <div className="divide-y divide-surface-variant">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              {[...Array(columns.length)].map((_, j) => (
                <div key={j} className="h-4 bg-surface-container-low rounded flex-1 animate-pulse"></div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
        <div className="p-12 text-center">
          <span className="material-symbols-outlined text-[48px] text-on-surface-variant/30 mb-3">inbox</span>
          <p className="font-body-md text-body-md text-on-surface-variant">{emptyMessage}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-soft overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-left ${col.headerAlign ? `text-${col.headerAlign}` : 'text-left'}`}
                >
                  {col.label}
                </th>
              ))}
              {actions && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-variant font-body-md text-body-md">
            {data.map((row) => (
              <tr key={row[rowKey] || row.id} className="hover:bg-surface-container-low/50 transition-colors">
                {columns.map((col) => {
                  const value = col.render ? col.render(row[col.key], row) : row[col.key]
                  return (
                    <td
                      key={col.key}
                      className={`px-4 py-3 ${col.align ? `text-${col.align}` : 'text-left'}`}
                    >
                      {value != null ? value : <span className="text-on-surface-variant/40">—</span>}
                    </td>
                  )
                })}
                {actions && (
                  <td className="px-4 py-3 text-right">
                    {actions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
