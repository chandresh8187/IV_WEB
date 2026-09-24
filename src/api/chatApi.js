import apiClient from './apiClient';
export const getChatApi=async installationId=>(await apiClient.get('/chat',{params:{installation_id:installationId}})).data;
export const markChatReadApi=async(lastMessageId,installationId)=>(await apiClient.post('/chat/read',{last_message_id:lastMessageId,installation_id:installationId})).data;
export const registerChatParticipantApi=async payload=>(await apiClient.post('/chat/participants',payload)).data;
export const sendChatMessageApi=async(message,replyToMessageId=null,installationId)=>(await apiClient.post('/chat/messages',{message,reply_to_message_id:replyToMessageId,installation_id:installationId})).data;
export const editChatMessageApi=async(id,message)=>(await apiClient.put(`/chat/messages/${id}`,{message})).data;
export const deleteChatMessageApi=async id=>(await apiClient.delete(`/chat/messages/${id}`)).data;
