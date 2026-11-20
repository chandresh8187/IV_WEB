import { hasAccess } from './access';

export function machineControls(user) {
  const manager = ['superadmin', 'plant_manager'].includes(user?.role);
  const operator = ['supervisor', 'labour'].includes(user?.role);
  const manage = key => manager || (!operator && hasAccess(user, key));
  return {
    canManage: !operator,
    canCheck: manager || user?.role === 'supervisor',
    canBundle: manager || user?.role === 'supervisor',
    canControl: manage('unit1.production.operate'),
    canAssign: manage('unit1.jobcards.assign'),
    canUnassign: manage('unit1.jobcards.unassign'),
    canScanCoil: user?.role==='supervisor'||manage('unit1.production.coil.assign'),
    canEnterCoilId: hasAccess(user, 'unit1.production.coil.assign.manual'),
    canRemoveCoil: manage('unit1.production.coil.remove'),
    canViewCoil: manage('unit1.coils.view'),
  };
}
