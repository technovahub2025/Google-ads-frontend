import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { googleAdsApi, getNexionRole, MOCK_MODE } from '../../services/googleAdsApi.js'

function isEligibleClient(user) {
  return user.sidebarFeatureFlags?.googleAds === true
    && String(user.role || '').toLowerCase() !== 'superadmin'
    && user.isActive !== false
}

function PageMessage({ children, tone = 'error' }) {
  const colors = tone === 'info' ? 'border-blue-200 bg-blue-50 text-blue-900' : 'border-red-200 bg-red-50 text-red-800'
  return <div role={tone === 'info' ? 'status' : 'alert'} className={`rounded-lg border px-4 py-3 text-sm ${colors}`}>{children}</div>
}

function accountId(account) {
  const value = account?.customer?.id ?? account?.customer?.resourceName?.split('/').pop() ?? account?.customer_client?.id ?? account?.customerClient?.id ?? account?.id
  return value == null ? '' : String(value).replace(/-/g, '')
}

function accountName(account) {
  return account?.customer?.descriptiveName || account?.customer?.descriptive_name || account?.customer?.name || account?.descriptive_name || account?.descriptiveName || account?.name || accountId(account)
}

function connectionStatus(connection) {
  if (connection?.connectionStatus === 'reconnect_required') return 'Reconnect required'
  return connection?.connected ? 'Connected' : 'Not connected'
}

function connectedAccountName(connection, customerId) {
  const account = customerId
    ? connection?.googleAdsAccounts?.find((item) => accountId(item) === accountId({ id: customerId }))
      || (accountId(connection?.googleAccount) === accountId({ id: customerId }) ? connection?.googleAccount : null)
    : connection?.googleAccount
  return account?.email || account?.name
}

function findLinkedClient(clients, userId, assignment) {
  const normalizedUserId = String(userId)
  const linkedProfiles = clients.filter((item) => String(item.nexionUserId || item.userId || '') === normalizedUserId)
  if (linkedProfiles.length > 1) throw new Error('Multiple Google Ads client profiles are linked to this NEXION user. Review the existing profiles before assigning an account.')
  const profileByAssignment = assignment?.clientId
    ? clients.find((item) => String(item.clientId) === String(assignment.clientId))
    : null
  const profileByUser = linkedProfiles[0] || null
  if (profileByAssignment && String(profileByAssignment.nexionUserId || profileByAssignment.userId || '') && String(profileByAssignment.nexionUserId || profileByAssignment.userId) !== normalizedUserId) {
    throw new Error('The existing Google Ads assignment points to a profile linked to another NEXION user. Review the existing records before changing it.')
  }
  if (profileByAssignment && profileByUser && String(profileByAssignment.clientId) !== String(profileByUser.clientId)) {
    throw new Error('The existing Google Ads assignment and NEXION user point to different client profiles. Review the existing records before changing them.')
  }
  return profileByUser || profileByAssignment
}

export default function Clients() {
  const [users, setUsers] = useState([])
  const [assignments, setAssignments] = useState([])
  const [connections, setConnections] = useState([])
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const reload = useCallback(async () => {
    if (getNexionRole() !== 'superadmin') { setError('Super Admin permission is required to manage client assignments.'); setLoading(false); return }
    if (MOCK_MODE) { setUsers([]); setAssignments([]); setConnections([]); setLoading(false); return }
    setLoading(true); setError('')
    try {
      const [userResult, assignmentResult, connectionResult, clientResult] = await Promise.all([
        googleAdsApi.getNexionUsers(), googleAdsApi.getCustomerAssignments(), googleAdsApi.checkConnection(), googleAdsApi.getClients(),
      ])
      setUsers(userResult.users || [])
      setAssignments(assignmentResult.assignments || [])
      setConnections(connectionResult.connections || [])
      setProfiles(clientResult.clients || [])
    } catch (err) {
      setUsers([])
      setError(err.message || 'Unable to load NEXION users and Google Ads assignments.')
    }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { reload() }, [reload])

  const rows = useMemo(() => {
    const activeByUser = new Map()
    const allByUser = new Map()
    assignments.forEach((item) => {
      const key = String(item.userId)
      allByUser.set(key, item)
      if (!item.status || item.status === 'active') activeByUser.set(key, item)
    })
    const profileByUser = new Map(profiles.map((item) => [String(item.nexionUserId || item.userId || ''), item]))
    const connectionById = new Map(connections.map((item) => [String(item.connectionId), item]))
    return users.filter(isEligibleClient).map((user) => {
      const key = String(user.userId)
      const assignment = activeByUser.get(key)
      const profile = profileByUser.get(key)
      const connection = connectionById.get(String(assignment?.connectionId || profile?.connectionId))
      return { ...user, assignment, profile, connection, lastAssignment: allByUser.get(key) }
    })
  }, [users, assignments, profiles, connections])

  return <div className="ads-stack">
    <header className="ads-toolbar"><div><p className="mb-1 text-sm font-medium uppercase tracking-wide text-google-ads-blue">Google Ads</p><h1 className="ads-page-title">Client assignments</h1><p className="ads-description mt-2 max-w-2xl">Assign an available Google Ads customer account to a NEXION user who has been granted Google Ads module access.</p></div><div className="ads-actions"><button type="button" onClick={() => navigate('/google-ads/settings')} className="ads-button">Connection settings</button><button type="button" onClick={reload} disabled={loading || MOCK_MODE} className="ads-button">Refresh</button></div></header>
    {MOCK_MODE && <PageMessage tone="info">Live NEXION users and Google Ads connections are required. Demo records are not shown.</PageMessage>}
    {error && <PageMessage>{error}</PageMessage>}
    <section className="ads-card">
      <div className="ads-card-header"><h2 className="ads-section-title">NEXION users</h2></div>
      {loading ? <p role="status" className="ads-description px-4 py-6 sm:px-5">Loading users…</p> : rows.length === 0 ? (
        !error && <p role="status" className="ads-description px-4 py-6 sm:px-5">No NEXION clients are available.</p>
      ) : <div className="ads-table-scroll" tabIndex={0} role="region" aria-label="Client assignments">
        <table className="ads-table min-w-[860px]">
          <thead><tr>
            {['Client', 'NEXION user ID', 'Google Ads access', 'Customer ID', 'Google account', 'Connection', 'Assignment', 'Actions'].map((label) => (
              <th key={label} scope="col" className={label === 'Actions' ? 'text-right' : undefined}>{label}</th>
            ))}
          </tr></thead>
          <tbody>
            {rows.map(({ userId, username, name, email, profile, connection, assignment, lastAssignment }) => (
              <tr key={userId}>
                <th scope="row" className="min-w-32 font-medium">{profile?.name || username || name || email || userId}<span className="block text-xs text-on-surface-variant">{email}</span></th>
                <td className="font-mono">{userId}</td>
                <td>Granted</td>
                <td className="font-mono">{assignment?.customerId || '—'}</td>
                <td>{connectedAccountName(connection, assignment?.customerId) || '—'}</td>
                <td>{connectionStatus(connection)}</td>
                <td>{assignment ? 'Assigned' : lastAssignment?.status === 'revoked' ? 'Revoked' : 'Not assigned'}</td>
                <td className="text-right"><button type="button" onClick={() => navigate(`/google-ads/clients/${encodeURIComponent(userId)}`)} className="ads-button ads-button--primary ads-button--compact">Manage</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>}
    </section>
  </div>
}

export function ClientDetails() {
  const { clientId: userId } = useParams()
  const [person, setPerson] = useState(null)
  const [clientProfile, setClientProfile] = useState(null)
  const [assignment, setAssignment] = useState(null)
  const [connections, setConnections] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [accounts, setAccounts] = useState([])
  const [connectionId, setConnectionId] = useState('')
  const [customerId, setCustomerId] = useState('')
  const [editing, setEditing] = useState(false)
  const [clientEditing, setClientEditing] = useState(false)
  const [clientName, setClientName] = useState('')
  const [clientEmail, setClientEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [campaignError, setCampaignError] = useState('')
  const [campaignsLoading, setCampaignsLoading] = useState(false)

  const load = useCallback(async () => {
    if (getNexionRole() !== 'superadmin') { setError('Super Admin permission is required to manage client assignments.'); setLoading(false); return }
    setLoading(true); setError(''); setAccounts([])
    try {
      const [userResult, assignmentResult, connectionResult] = await Promise.all([googleAdsApi.getNexionUsers(), googleAdsApi.getCustomerAssignments(), googleAdsApi.checkConnection()])
      const selectedUser = (userResult.users || []).find((item) => String(item.userId) === String(userId) && isEligibleClient(item))
      if (!selectedUser) throw new Error('The selected NEXION user was not found.')
      const selectedAssignment = (assignmentResult.assignments || []).find((item) => String(item.userId) === String(userId) && (!item.status || item.status === 'active')) || null
      setPerson(selectedUser); setAssignment(selectedAssignment); setConnections(connectionResult.connections || [])
      let linkedClient = null
      if (typeof googleAdsApi.getClients === 'function') {
        try {
          const clientResult = await googleAdsApi.getClients()
          linkedClient = findLinkedClient(clientResult.clients || [], userId, selectedAssignment)
        } catch (_) { /* Assignment and campaign data remain usable if the optional client profile is unavailable. */ }
      }
      setClientProfile(linkedClient)
      setClientName(linkedClient?.name || selectedUser.username || selectedUser.name || '')
      setClientEmail(linkedClient?.email || selectedUser.email || '')
      setConnectionId(selectedAssignment?.connectionId || linkedClient?.connectionId || ''); setCustomerId(selectedAssignment?.customerId || '')
      if (selectedAssignment) {
        setCampaignsLoading(true); setCampaignError('')
        try { const result = await googleAdsApi.getCustomerCampaigns(selectedAssignment.connectionId, selectedAssignment.customerId); setCampaigns(result.campaigns || []) }
        catch (err) { setCampaigns([]); setCampaignError(err.message || 'Campaign activity is unavailable.') }
        finally { setCampaignsLoading(false) }
      } else setCampaigns([])
    } catch (err) {
      setPerson(null)
      setError(err.message || 'Unable to load NEXION user assignment.')
    }
    finally { setLoading(false) }
  }, [userId])

  useEffect(() => { load() }, [load])

  const canManage = !MOCK_MODE && person?.sidebarFeatureFlags?.googleAds === true
  const linkedConnectionId = assignment?.connectionId || clientProfile?.connectionId
  const selectedConnection = connections.find((item) => String(item.connectionId) === String(linkedConnectionId))
  const availableConnections = connections.filter((item) => item.connected
    && (!item.clientId || String(item.clientId) === String(clientProfile?.clientId))
    && (!item.companyId || String(item.companyId) === String(person?.companyId)))
  const selectedCustomer = accounts.some((item) => accountId(item) === customerId)

  const discover = async () => {
    setBusy(true); setError(''); setNotice(''); setAccounts([])
    try {
      const result = await googleAdsApi.getCustomerAccounts(connectionId, { liveOnly: true })
      const discovered = (result.accounts || []).filter((item) => (item.customer || item).manager !== true && /^\d{10}$/.test(accountId(item)))
      setAccounts(discovered)
      if (!discovered.some((item) => accountId(item) === customerId)) setCustomerId('')
      if (!discovered.length) setNotice('No assignable customer accounts were found for this connection.')
    }
    catch (err) { setError(err.message || 'Unable to discover accessible customer accounts.') }
    finally { setBusy(false) }
  }

  const ensureClientProfile = async () => {
    if (clientProfile?.clientId) return clientProfile
    const existingProfiles = await googleAdsApi.getClients()
    let profile = findLinkedClient(existingProfiles.clients || [], userId, assignment)
    if (!profile) {
      const created = await googleAdsApi.createClient({
        name: person.username || person.name || person.email || String(userId),
        email: person.email || '',
        nexionUserId: String(userId),
      })
      profile = created.client
    }
    if (!profile?.clientId) throw new Error('The Google Ads client profile could not be linked to this NEXION user.')
    setClientProfile(profile)
    setClientName(profile.name || person.username || person.name || '')
    setClientEmail(profile.email || person.email || '')
    return profile
  }

  const save = async () => {
    setBusy(true); setError(''); setNotice('')
    try {
      if (!canManage || !connectionId || !selectedCustomer) throw new Error('Select a connected account and an accessible customer ID.')
      const profile = await ensureClientProfile()
      await googleAdsApi.assignGoogleAdsAccountToClient({ clientId: profile.clientId, nexionUserId: String(userId), connectionId, customerId })
      setEditing(false); setNotice('Google Ads account assigned to this NEXION user.'); await load()
    } catch (err) { setError(err.message || 'Unable to save the assignment.') }
    finally { setBusy(false) }
  }
  const revoke = async () => {
    setBusy(true); setError(''); setNotice('')
    try { await googleAdsApi.revokeCustomerAssignment(userId); setNotice('Assignment revoked. Existing JWT sessions will be denied on their next backend request.'); await load() }
    catch (err) { setError(err.message || 'Unable to revoke the assignment.') }
    finally { setBusy(false) }
  }

  const saveClient = async (event) => {
    event.preventDefault()
    if (!clientProfile?.clientId) return setError('No existing Google Ads client profile is linked to this NEXION user.')
    setBusy(true); setError(''); setNotice('')
    try {
      const result = await googleAdsApi.updateClient({ clientId: clientProfile.clientId, name: clientName, email: clientEmail })
      setClientProfile(result.client || { ...clientProfile, name: clientName, email: clientEmail })
      setClientEditing(false)
      setNotice('Client details updated.')
    } catch (err) { setError(err.message || 'Unable to update client details.') }
    finally { setBusy(false) }
  }

  const sendConnectionInvitation = async () => {
    if (!canManage) return
    setInviting(true); setError(''); setNotice('')
    try {
      const profile = await ensureClientProfile()
      const result = await googleAdsApi.sendClientConnectionInvitation(profile.clientId)
      setNotice(`${result.message || 'Google Ads connection invitation sent to the client email.'} Refresh connection status after the client authorizes access.`)
    } catch (err) { setError(err.message || 'Unable to send the Google Ads connection invitation.') }
    finally { setInviting(false) }
  }

  if (loading) return <p className="py-12 text-center text-sm text-on-surface-variant">Loading NEXION user…</p>
  if (!person) return <div className="space-y-4"><Link to="/google-ads">Back to client assignments</Link>{error && <PageMessage>{error}</PageMessage>}</div>
  return <div className="ads-stack">
    <Link to="/google-ads" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">← Client assignments</Link>
    {error && <PageMessage>{error}</PageMessage>}{notice && <PageMessage tone="info">{notice}</PageMessage>}
    <section className="ads-card ads-card-padding">
      <div className="flex min-w-0 flex-col justify-between gap-5 xl:flex-row xl:items-start">
        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium uppercase tracking-wide text-google-ads-blue">NEXION user assignment</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Client overview</p>
          <h1 className="ads-page-title">{clientProfile?.name || person.username || person.name || person.email || userId}</h1>
          <p className="mt-2 break-words text-sm text-slate-600">{person.email || 'Email unavailable'} <span className="px-1">·</span> User ID <span className="font-mono text-on-surface">{userId}</span></p>
          <dl className="mt-5 space-y-1.5 text-sm">
            {clientProfile?.clientId && <div className="flex flex-wrap gap-x-2"><dt className="text-slate-600">Client ID</dt><dd className="font-mono font-medium text-on-surface">{clientProfile.clientId}</dd></div>}
            {clientProfile?.email && <div className="flex flex-wrap gap-x-2"><dt className="text-slate-600">Client email</dt><dd className="break-all font-medium text-on-surface">{clientProfile.email}</dd></div>}
            <div className="flex flex-wrap gap-x-2"><dt className="text-slate-600">Customer ID</dt><dd className="font-mono font-medium text-on-surface">{assignment?.customerId || 'Not assigned'}</dd></div>
            <div className="flex flex-wrap gap-x-2"><dt className="text-slate-600">Connection</dt><dd className="break-all font-medium text-on-surface">{connectedAccountName(selectedConnection, assignment?.customerId) || linkedConnectionId || 'Not connected'}</dd></div>
            <div className="pt-0.5 font-medium text-on-surface">{assignment ? 'Assigned to this NEXION user' : 'No active Google Ads assignment'}</div>
          </dl>
        </div>
        <div className="ads-actions xl:max-w-[50%] xl:justify-end">
          <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${selectedConnection?.connected ? 'bg-[#e8f6ed] text-[#16834a]' : 'bg-[#f1f3f6] text-[#667085]'}`}><span className={`h-2 w-2 rounded-full ${selectedConnection?.connected ? 'bg-[#2eaa63]' : 'bg-[#98a2b3]'}`} />{connectionStatus(selectedConnection)}</span>
          <button type="button" onClick={load} disabled={loading || busy || inviting} className="ads-button">Refresh connection status</button>
          {clientProfile?.clientId && <button type="button" onClick={() => setClientEditing((value) => !value)} disabled={busy} className="ads-button">Edit client email</button>}
          {canManage && <button type="button" onClick={sendConnectionInvitation} disabled={inviting || busy} className="ads-button">{inviting ? 'Sending invitation...' : linkedConnectionId ? 'Send reconnect link' : 'Connect Google account'}</button>}
          {assignment && <button type="button" onClick={revoke} disabled={busy || MOCK_MODE} className="ads-button ads-button--danger">Revoke assignment</button>}
          {canManage && <button type="button" onClick={() => { setConnectionId(selectedConnection?.connected ? linkedConnectionId : ''); setCustomerId(assignment?.customerId || ''); setAccounts([]); setEditing(true) }} disabled={busy || inviting} className="ads-button ads-button--primary">{assignment ? 'Reassign account' : 'Assign account'}</button>}
        </div>
      </div>
      {canManage ? <p className="mt-3 text-xs text-slate-600">The connection link is sent to {clientProfile?.email || person.email || 'the client email'}.</p> : <p className="mt-3 text-sm text-slate-600">Google Ads access must be granted in NEXION before this client can connect or assign an account.</p>}
      {clientEditing && <form onSubmit={saveClient} className="mt-6 grid gap-4 border-t border-[#e2e8f0] pt-5 sm:grid-cols-2">
        <h2 className="text-base font-medium text-on-surface sm:col-span-2">Edit client details and email</h2>
        <label className="ads-field">Client name<input required value={clientName} onChange={(event) => setClientName(event.target.value)} className="ads-control" /></label>
        <label className="ads-field">Client email<input required type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} className="ads-control" /></label>
        <div className="flex flex-wrap gap-2 sm:col-span-2"><button type="submit" disabled={busy} className="ads-button ads-button--primary">Save client</button><button type="button" onClick={() => setClientEditing(false)} disabled={busy} className="ads-button">Cancel</button></div>
      </form>}
      {editing && canManage && <div className="mt-6 space-y-4 border-t border-[#e2e8f0] pt-5">
        <label className="ads-field">Google Ads connection<select value={connectionId} disabled={busy} onChange={(event) => { setConnectionId(event.target.value); setCustomerId(''); setAccounts([]) }} className="ads-control"><option value="">Select a connection</option>{availableConnections.map((item) => <option key={item.connectionId} value={item.connectionId}>{item.googleAccount?.name || item.googleAccount?.email || item.connectionId} · {item.connectionId}</option>)}</select></label>
        <button type="button" onClick={discover} disabled={!connectionId || busy} className="ads-button">{busy ? 'Loading…' : 'Discover accessible customer accounts'}</button>
        {accounts.length > 0 && <label className="ads-field">Customer account<select value={customerId} disabled={busy} onChange={(event) => setCustomerId(event.target.value)} className="ads-control"><option value="">Select a customer account</option>{accounts.map((item) => <option key={accountId(item)} value={accountId(item)}>{accountName(item)} · {accountId(item)}</option>)}</select></label>}
        <div className="flex flex-wrap gap-2"><button type="button" onClick={save} disabled={!selectedCustomer || busy || inviting} className="ads-button ads-button--primary">Save assignment</button><button type="button" onClick={() => setEditing(false)} disabled={busy} className="ads-button">Cancel</button></div>
      </div>}
    </section>
    {assignment && <section className="ads-card ads-card-padding space-y-3">
      <div className="ads-toolbar"><h2 className="ads-section-title">Campaign activity</h2><button type="button" onClick={load} disabled={campaignsLoading} className="ads-button">Refresh</button></div>
      {campaignError && <PageMessage tone="info">{campaignError}</PageMessage>}
      {campaignsLoading ? <p className="text-sm text-slate-600">Loading campaigns…</p> : campaigns.length ? <div className="ads-table-scroll" tabIndex={0} role="region" aria-label="Campaign activity"><table className="ads-table min-w-[420px]"><thead className="text-slate-600"><tr><th className="py-2 font-medium">Campaign</th><th className="py-2 font-medium">Status</th><th className="py-2 font-medium">Channel</th></tr></thead><tbody>{campaigns.map((item, index) => <tr key={item?.campaign?.id || item?.id || index} className="border-t border-[#e8edf3]"><td className="py-3 text-on-surface">{item?.campaign?.name || item?.name || `Campaign ${item?.campaign?.id || item?.id || ''}`}</td><td className="py-3 text-[#344054]">{item?.campaign?.status || item?.status || 'Unknown'}</td><td className="py-3 text-[#344054]">{item?.campaign?.advertisingChannelType || item?.advertising_channel_type || '—'}</td></tr>)}</tbody></table></div> : <p className="text-sm text-slate-600">No campaign data is available for this account.</p>}
    </section>}
  </div>
}
