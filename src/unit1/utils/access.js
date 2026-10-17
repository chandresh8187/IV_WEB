export const hasAccess = (user, key) => user?.role === 'superadmin' || Boolean(user?.permissions?.includes(key))
