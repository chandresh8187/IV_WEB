import api from './apiClient';
export const getMaterialRegister=async ()=>(await api.get('/unit1/material-register')).data.data;

export const saveMaterialDispatch=async body=>(await api.post('/unit1/material-register/dispatches',body)).data.data;
export const getDispatchReport=async (q='',page=1)=>(await api.get('/unit1/material-register/dispatches',{params:{q,page}})).data.data;

export const getMaterialTrace=async key=>(await api.get('/unit1/material-register/trace/'+encodeURIComponent(key))).data.data;

export const getMaterialBundles=async key=>(await api.get('/unit1/material-register/bundles/'+encodeURIComponent(key))).data.data;

export const transferMaterialParty=async body=>(await api.post('/unit1/material-register/transfers',body)).data.data;
export const getMaterialTransfers=async (page=1)=>(await api.get('/unit1/material-register/transfers',{params:{page}})).data.data;
