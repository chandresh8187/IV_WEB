import {inspectionNavigation} from './inspectionNavigation.js';
const screens={
 '/production/material-stock/bundles':['Material bundles','/production/material-stock'],
 '/production/material-stock/dispatch':['Material stock','/production'],
 '/production/material-stock/dispatch-report':['Dispatch report','/production/material-stock'],
 '/production/material-stock':['Material stock','/production'],
 '/coils/invoices':['Stock invoices','/coils'],
 '/coils/add':['Add stock','/coils'],
 '/coils':['Coil stock','/production'],
 '/production/maintenance':['Maintenance','/production'],
 '/': ['Dashboard',null],
 '/profile':['Profile','/'],
 '/production':['Production','/'],
 '/production/live':['Live production','/production'],
 '/production/live-inspections':['Live inspections','/production'],
 '/production/assign-coil':['Assign coil','/production/live'],
 '/production/material-viewer':['3D material viewer','/production'],
 '/production/planning':['Production Planning','/production'],
 '/production/job-cards':['Job cards','/production'],
 '/production/history':['Production history','/production'],
 '/settings':['Settings','/'],
 '/settings/vendors':['Vendors','/settings'],
 '/settings/materials-grades':['Materials and grades','/settings'],
 '/settings/machines':['Machines','/settings'],
 '/settings/shifts':['Shift times','/settings'],
 '/settings/users':['Users and access','/settings'],
 '/settings/qr-scan':['QR scan settings','/settings'],
 '/settings/notifications':['Test notifications','/settings'],
};
export function screenNavigation(pathname,state){
 const path=pathname.replace(/\/+$/,'')||'/';
 const inspection=inspectionNavigation(path,state);if(inspection)return inspection;
 if(screens[path]){const [title,backTo]=screens[path];return {title,backTo};}
 if(/^\/production\/live\/[^/]+\/entries$/.test(path))return {title:'Production entries',backTo:'/production/live'};
 if(path==='/production/reports/preview')return {title:'PDF report',backTo:typeof state?.returnTo==='string'&&state.returnTo.startsWith('/production/')?state.returnTo:'/production/history'};
 return {title:'Page not found',backTo:'/'};
}

