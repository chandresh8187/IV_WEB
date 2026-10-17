import { Boxes, ClipboardList, History, Radio } from 'lucide-react'
import ModuleMenu from '../components/ModuleMenu'
import { useSelector } from 'react-redux'
import { hasAccess } from '../utils/access'

const actions = [
  { title: 'Live production', description: 'See roll forming machines, coil runs, and produced pieces.', path: '/production/live', icon: Radio, primary: true },
  { title: 'Production history', description: 'Review production dates, shifts, materials and job cards.', path: '/production/history', icon: History },
  { title: 'Job cards', description: 'Plan members, machines, coils and hole positions.', path: '/production/job-cards', icon: ClipboardList },
  { title: 'Coil stock', description: 'View received coils and add a new inward entry.', path: '/coils', icon: Boxes },
]

export default function ProductionScreen() {
  const user = useSelector(state => state.auth.user)
  const visible = actions.filter(item => !(user?.role === 'labour' && item.path !== '/production/live') && hasAccess(user, item.path === '/coils' ? 'unit1.coils.view' : 'unit1.production.view'))
  return <ModuleMenu eyebrow="UNIT 1 OPERATIONS" title="Production" description="Open production tools and stock records." actions={visible} />
}
