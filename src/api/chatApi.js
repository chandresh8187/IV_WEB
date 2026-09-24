import apiClient from './apiClient';
export const getChatApi=async()=>(await apiClient.get('/chat')).data;
export const markChatReadApi=async lastMessageId=>(await apiClient.post('/chat/read',{last_message_id:lastMessageId})).data;
export const sendChatMessageApi=async(message,replyToMessageId=null,senderName)=>(await apiClient.post('/chat/messages',{message,reply_to_message_id:replyToMessageId,sender_name:senderName})).data;
export const editChatMessageApi=async(id,message)=>(await apiClient.put(`/chat/messages/${id}`,{message})).data;
export const deleteChatMessageApi=async id=>(await apiClient.delete(`/chat/messages/${id}`)).data;
