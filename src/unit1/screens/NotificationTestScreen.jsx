import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { BellRing, RefreshCw, Send, Smartphone } from 'lucide-react'
import LoadingIndicator from '../../components/LoadingIndicator'
import { getAndroidNotificationDevices, sendAndroidTestNotification } from '../api/notificationApi'
import './NotificationTestScreen.css'

const errorText = error => error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Could not complete the notification test.'

export default function NotificationTestScreen() {
  const user = useSelector(state => state.auth.user)
  const [deviceId, setDeviceId] = useState('')
  const [title, setTitle] = useState('Unit 1 notification test')
  const [body, setBody] = useState('This test notification was sent from Unit 1 web settings.')
  const devices = useQuery({ queryKey: ['unit1-notification-devices', user?.id], queryFn: getAndroidNotificationDevices })
  const send = useMutation({ mutationFn: sendAndroidTestNotification, onSuccess: () => { devices.refetch() } })
  const rows = devices.data?.devices || []
  const selectedExists = !deviceId || rows.some(row => String(row.id) === deviceId)
  const canSend = devices.isSuccess && devices.data.senderConfigured && rows.length > 0 && selectedExists && title.trim() && body.trim() && !send.isPending && !devices.isFetching
  const clearResult = () => send.reset()
  return <section className="settings-page notification-test-page">
    <div className="page-heading"><div><span className="eyebrow">SETTINGS</span><h1>Test Android notifications</h1><p>Send a test to Android devices signed into your Unit 1 account{user?.email ? ` (${user.email})` : ''}.</p></div><button className="outline-button" type="button" disabled={devices.isFetching || send.isPending} onClick={() => { clearResult(); devices.refetch() }}><RefreshCw size={16} />{devices.isFetching ? <LoadingIndicator inline label="Refreshing…" /> : 'Refresh devices'}</button></div>
    {devices.isPending && <LoadingIndicator label="Loading Android devices…" />}
    {devices.isError && <div className="notice error" role="alert">{errorText(devices.error)} Use Refresh devices to retry.</div>}
    {devices.isSuccess && <div className="notification-test-layout">
      <form className="content-card notification-test-form" onSubmit={event => { event.preventDefault(); if (canSend) send.mutate({ title: title.trim(), body: body.trim(), ...(deviceId ? { deviceId: Number(deviceId) } : {}) }) }}>
        <div className="notification-card-title"><BellRing size={20} /><h2>Send a test</h2></div>
        <div className="notification-test-status"><span>{devices.data.senderConfigured ? 'Notification sender ready' : 'Notification sender not configured'}</span><span>{rows.length} Android device{rows.length === 1 ? '' : 's'}</span></div>
        {!devices.data.senderConfigured && <div className="notice error" role="alert">Configure the Unit 1 Firebase service account on the backend before sending notifications.</div>}
        {!rows.length && <div className="notice">No Android devices registered. Sign into the Unit 1 Android app using this same account, allow notifications, then refresh this list.</div>}
        <label className="form-field"><span>Send to</span><select value={deviceId} disabled={send.isPending || !rows.length} onChange={event => { setDeviceId(event.target.value); clearResult() }}>{!selectedExists && <option value={deviceId} disabled>Device no longer registered</option>}<option value="">All my Android devices ({rows.length})</option>{rows.map((row, index) => <option value={String(row.id)} key={row.id}>Android device {index + 1} · {row.installationId.slice(-8)}</option>)}</select></label>
        {!selectedExists && <div className="notice error" role="alert">The selected device is no longer registered. Choose another device or all devices.</div>}
        <label className="form-field"><span>Title</span><input required maxLength={100} value={title} disabled={send.isPending} onChange={event => { setTitle(event.target.value); clearResult() }} /></label>
        <label className="form-field"><span>Message</span><textarea required maxLength={500} rows={4} value={body} disabled={send.isPending} onChange={event => { setBody(event.target.value); clearResult() }} /></label>
        {send.isError && <div className="notice error" role="alert">{errorText(send.error)}</div>}
        {send.isSuccess && <div className={send.data.sent ? 'notice' : 'notice error'} role="status">{send.data.sent} accepted by Firebase; {send.data.failed} failed. {send.data.sent ? 'Check the Android device to confirm it appeared.' : 'Reopen the Android app to refresh registration and try again.'}</div>}
        <button type="submit" className="primary-button" disabled={!canSend}><Send size={16} />{send.isPending ? <LoadingIndicator inline label="Sending…" /> : 'Send test notification'}</button>
      </form>
      <aside className="content-card notification-test-help"><div className="notification-card-title"><Smartphone size={20} /><h2>On your Android device</h2></div><ol><li>Sign into the Unit 1 app with the same account used here.</li><li>Allow notifications in Android settings.</li><li>For a notification-tray test, put the app in the background. When the app is open, the test appears as an in-app alert.</li></ol><p>Firebase acceptance confirms the send request, not that Android displayed it. If it does not appear, check notification permissions and the device’s internet connection.</p>{rows.length > 0 && <div className="notification-device-list"><h3>Registered devices</h3>{rows.map((row, index) => <div key={row.id}><strong>Android device {index + 1}</strong><span>…{row.installationId.slice(-8)}</span><small>Last registered: {row.updatedAt ? new Date(row.updatedAt).toLocaleString() : 'Unknown'}</small></div>)}</div>}</aside>
    </div>}
  </section>
}
