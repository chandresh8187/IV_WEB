import { useEffect, useRef, useState } from 'react';
import { Pencil, Reply, Send, Trash2, X } from 'lucide-react';
import moment from 'moment';
import { getStoredUser } from '../../api/authApi';
import { deleteChatMessageApi, editChatMessageApi, getChatApi, markChatReadApi, registerChatParticipantApi, sendChatMessageApi } from '../../api/chatApi';
import socket from '../../socket/socket';
import './ChatScreen.css';

const asArray = value => Array.isArray(value) ? value : [];
const CHAT_NAME_STORAGE_KEY = 'plant_chat_device_name';
const CHAT_MOBILE_STORAGE_KEY = 'plant_chat_device_mobile';
const CHAT_INSTALLATION_KEY = 'plant_chat_installation_id';
const installationId = (() => { const saved = localStorage.getItem(CHAT_INSTALLATION_KEY); if (saved) return saved; const value = `web_${Date.now().toString(36)}_${crypto.randomUUID().replaceAll('-', '')}`; localStorage.setItem(CHAT_INSTALLATION_KEY, value); return value; })();
const formatMessageTime = value => {
  const date = moment(value, 'YYYY-MM-DD HH:mm:ss', true);
  if (!date.isValid()) return '';
  return date.isSame(moment(), 'day') ? date.format('h:mm A') : date.format('DD/MM/YYYY, h:mm A');
};

export default function ChatScreen() {
  const me = getStoredUser();
  const currentUserId = me?.id;
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(null);
  const [replying, setReplying] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [chatName, setChatName] = useState(() => String(localStorage.getItem(CHAT_NAME_STORAGE_KEY) || '').trim());
  const [nameDraft, setNameDraft] = useState(() => String(localStorage.getItem(CHAT_NAME_STORAGE_KEY) || '').trim());
  const [mobile, setMobile] = useState(() => String(localStorage.getItem(CHAT_MOBILE_STORAGE_KEY) || '').trim());
  const [profileConfirmed, setProfileConfirmed] = useState(() => Boolean(String(localStorage.getItem(CHAT_NAME_STORAGE_KEY) || '').trim() && String(localStorage.getItem(CHAT_MOBILE_STORAGE_KEY) || '').trim()));
  const [participantReady, setParticipantReady] = useState(false);
  const [participantId, setParticipantId] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  const messageList = useRef(null);
  const messageElements = useRef(new Map());
  const highlightTimer = useRef(null);
  useEffect(() => { if (profileConfirmed && chatName && mobile) registerChatParticipantApi({ installation_id: installationId, display_name: chatName, mobile_number: mobile }).then(() => setParticipantReady(true)).catch(() => setParticipantReady(false)); }, [chatName, mobile, profileConfirmed]);

  useEffect(() => {
    if (!profileConfirmed || !participantReady) return undefined;
    let active = true;
    const markActive = () => socket.emit('chat_active', { active: true });
    markActive();
    socket.on('connect', markActive);
    getChatApi(installationId).then(response => {
      if (!active) return;
      const loadedMessages = asArray(response?.data?.messages);
      setMessages(loadedMessages);
      setUsers(asArray(response?.data?.users));
      setParticipantId(response?.data?.participant_id || null);
      markChatReadApi(loadedMessages.at(-1)?.id || 0, installationId).catch(() => {});
    }).catch(requestError => {
      if (active) setError(requestError?.response?.data?.message || 'Could not load chat.');
    });
    const add = message => {
      if (message?.id) {
        setMessages(current => current.some(item => item.id === message.id) ? current : [...current, message]);
        if (Number(message.participant_id) !== Number(participantId)) markChatReadApi(Number(message.id), installationId).catch(() => {});
      }
    };
    const update = message => {
      if (message?.id) setMessages(current => current.map(item => item.id === message.id ? message : item));
    };
    const remove = payload => {
      if (payload?.id) setMessages(current => current.filter(item => Number(item.id) !== Number(payload.id)));
    };
    const presence = payload => {
      const onlineIds = asArray(payload?.online_user_ids).map(Number);
      setUsers(current => current.map(item => ({ ...item, online: onlineIds.includes(Number(item.id)) })));
    };
    const seen = payload => { if (Number(payload?.participant_id) !== Number(participantId)) setMessages(current => current.map(item => Number(item.id) <= Number(payload?.last_read_message_id) && Number(item.participant_id) !== Number(payload?.participant_id) ? { ...item, seen_count: Math.max(1, Number(item.seen_count || 0)) } : item)); };
    socket.on('chat_message_created', add);
    socket.on('chat_message_updated', update);
    socket.on('chat_message_deleted', remove);
    socket.on('chat_presence_updated', presence);
    socket.on('chat_messages_seen', seen);
    return () => {
      active = false;
      socket.emit('chat_active', { active: false });
      socket.off('connect', markActive);
      socket.off('chat_message_created', add);
      socket.off('chat_message_updated', update);
      socket.off('chat_message_deleted', remove);
      socket.off('chat_presence_updated', presence);
      socket.off('chat_messages_seen', seen);
    };
  }, [currentUserId, participantId, participantReady, profileConfirmed]);

  useEffect(() => {
    const container = messageList.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);
  useEffect(() => () => window.clearTimeout(highlightTimer.current), []);

  const submit = async event => {
    event.preventDefault();
    if (!text.trim() || busy) return;
    setBusy(true); setError('');
    try {
      if (editing) await editChatMessageApi(editing.id, text);
      else await sendChatMessageApi(text, replying?.id || null, installationId);
      setText(''); setEditing(null); setReplying(null);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || 'Could not save message.');
    } finally { setBusy(false); }
  };

  const removeMessage = async message => {
    if (!window.confirm('Delete this message permanently?')) return;
    try { await deleteChatMessageApi(message.id); }
    catch (requestError) { setError(requestError?.response?.data?.message || 'Could not delete message.'); }
  };

  const jumpToMessage = messageId => {
    const element = messageElements.current.get(Number(messageId));
    if (!element) return setError('The original message is not in the loaded conversation.');
    element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedId(Number(messageId));
    window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightedId(null), 1600);
  };

  const saveChatName = async event => {
    event.preventDefault();
    const name = nameDraft.trim().replace(/\s+/g, ' ');
    if (name.length < 2) return setError('Enter at least 2 characters for your name.');
    if (!/^\d{10,15}$/.test(mobile.replace(/\D/g, ''))) return setError('Enter a valid mobile number.');
    await registerChatParticipantApi({ installation_id: installationId, display_name: name, mobile_number: mobile });
    localStorage.setItem(CHAT_NAME_STORAGE_KEY, name);
    localStorage.setItem(CHAT_MOBILE_STORAGE_KEY, mobile.replace(/\D/g, ''));
    setError(''); setParticipantReady(true); setChatName(name); setProfileConfirmed(true);
  };

  if (!profileConfirmed) return <section className="chat-identity-page"><form className="chat-identity-card" onSubmit={saveChatName}><span>PLANT CHAT</span><h2>Who is using Plant Chat?</h2><p>Create the chat participant for this browser.</p>{error && <div className="chat-error">{error}</div>}<label>Your name<input autoFocus maxLength="60" value={nameDraft} onChange={event => setNameDraft(event.target.value)} placeholder="Enter your name" /></label><label>Mobile number<input maxLength="15" value={mobile} onChange={event => setMobile(event.target.value)} placeholder="Enter mobile number" inputMode="tel" /></label><button disabled={nameDraft.trim().length < 2}>Save and open chat</button></form></section>;

  return <section className="chat-page"><header><div><span>PLANT TEAM</span><h2>Plant Chat</h2><p>Live production communication across mobile and web.</p></div></header><div className="chat-layout"><aside className="chat-users"><h3>Users</h3>{users.map(user => <div className="chat-user" key={user.id}><span className="chat-avatar">{String(user.name || '?')[0]}</span><div><strong>{user.name || 'User'}</strong><small>{String(user.role || '').replaceAll('_', ' ')}</small></div><i className={user.online ? 'online' : 'offline'} /><em>{user.online ? 'Online' : 'Offline'}</em></div>)}</aside><main className="chat-panel"><div className="chat-messages" ref={messageList}>{messages.map(message => { const own = Number(message.participant_id) === Number(participantId); const canChange = own || me?.role === 'superadmin'; return <article ref={element => { if (element) messageElements.current.set(Number(message.id), element); else messageElements.current.delete(Number(message.id)); }} className={`chat-message ${own ? 'own' : ''} ${Number(highlightedId) === Number(message.id) ? 'highlighted' : ''}`} key={message.id}><strong>{message.user_name || 'User'}</strong><small className="chat-role">{String(message.user_role || '').replaceAll('_', ' ')}</small>{message.reply_to_message_id && <button type="button" className="chat-reply-quote" onClick={() => jumpToMessage(message.reply_to_message_id)}><b>{message.reply_user_name || 'Original message'}</b><span>{message.reply_message || 'Message unavailable'}</span></button>}<p>{message.message || ''}</p><footer><small>{formatMessageTime(message.created_at)}{message.edited_at ? ' · edited' : ''}{own ? Number(message.seen_count) > 0 ? ' · Seen' : ' · Sent' : ''}</small><span><button type="button" onClick={() => { setEditing(null); setText(''); setReplying(message); }} aria-label="Reply to message"><Reply size={15} /></button>{canChange && <><button type="button" onClick={() => { setReplying(null); setEditing(message); setText(message.message || ''); }} aria-label="Edit message"><Pencil size={15} /></button><button type="button" onClick={() => removeMessage(message)} aria-label="Delete message"><Trash2 size={15} /></button></>}</span></footer></article>; })}<div ref={end} /></div>{error && <div className="chat-error">{error}</div>}{editing && <div className="chat-editing">Editing message <button type="button" onClick={() => { setEditing(null); setText(''); }}>Cancel</button></div>}{replying && !editing && <div className="chat-replying"><div><strong>Replying to {replying.user_name}</strong><span>{replying.message}</span></div><button type="button" onClick={() => setReplying(null)} aria-label="Cancel reply"><X size={18} /></button></div>}{/@[^\s@]*$/.test(text) && <div className="chat-mentions">{users.filter(user => user.name?.toLowerCase().includes((text.match(/@([^\s@]*)$/)?.[1] || '').toLowerCase())).slice(0, 6).map(user => <button type="button" key={user.id} onClick={() => setText(value => value.replace(/@[^\s@]*$/, `@${user.name} `))}><strong>@{user.name}</strong><small>{user.role}</small></button>)}</div>}<form className="chat-composer" onSubmit={submit}><textarea maxLength="1000" rows="2" value={text} onChange={event => setText(event.target.value)} placeholder={replying ? `Reply to ${replying.user_name}` : 'Type a message…'} /><button disabled={busy || !text.trim()}><Send size={18} />{editing ? 'Update' : 'Send'}</button></form></main></div></section>;
}
