import { hasAccess } from '../utils/access'
import { Clock3, Factory, Layers3, QrCode, Users } from 'lucide-react'
import { useSelector } from 'react-redux'
import ModuleMenu from '../components/ModuleMenu'

export default function SettingsScreen() {
  const user = useSelector(state => state.auth.user)
  const canManageQr = hasAccess(user, 'unit1.qr.settings')
  const canViewUsers = hasAccess(user, 'unit1.users.view')
  const actions = [
    ...(hasAccess(user, 'unit1.coils.view') ? [{ title: 'Materials And Grades', description: 'Add, edit, and delete grades for each material.', path: '/settings/materials-grades', icon: Layers3 }] : []),
    ...(hasAccess(user, 'unit1.machines.view') ? [{ title: 'Machines', description: 'Add and manage machines for live production.', path: '/settings/machines', icon: Factory }] : []),
    ...(hasAccess(user, 'unit1.shifts.view') ? [{ title: 'Shift times', description: 'Set automatic Day and Night shift boundaries.', path: '/settings/shifts', icon: Clock3 }] : []),
    ...(canManageQr ? [{ title: 'QR Scan Display', description: 'Choose coil details visible to each user role.', path: '/settings/qr-scan', icon: QrCode }] : []),
    ...(canViewUsers ? [{ title: 'Users And Access', description: 'Manage Unit 1 accounts and feature permissions.', path: '/settings/users', icon: Users }] : []),
  ]
  return <ModuleMenu eyebrow="UNIT 1 OPERATIONS" title="Settings" description="Manage the options used in production forms." actions={actions} kind="settings" />
}
