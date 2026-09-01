import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  setDoc,
  onSnapshot,
  updateDoc,
  writeBatch,
  deleteDoc,
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import type { Message, ProjectGroupMessage } from '../models/types';

const DM_COLLECTION = 'directMessages';
const PROJECT_MSG_COLLECTION = 'projectGroupMessages';
const LOCAL_DM_KEY = '@nvcc_local_direct_messages';
const LOCAL_PROJECT_MSG_KEY = '@nvcc_local_project_messages';

function db() {
  return getFirestoreDb();
}

async function getLocalDirectMessages(): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_DM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveLocalDirectMessage(message: Message): Promise<void> {
  try {
    const list = await getLocalDirectMessages();
    const existingIndex = list.findIndex(m => m.id === message.id);
    let nextList = [];
    if (existingIndex > -1) {
      nextList = [...list];
      nextList[existingIndex] = message;
    } else {
      nextList = [...list, message];
    }
    await AsyncStorage.setItem(LOCAL_DM_KEY, JSON.stringify(nextList));
  } catch {}
}

async function getLocalProjectMessages(projectId: string): Promise<ProjectGroupMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROJECT_MSG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((m: ProjectGroupMessage) => m.projectId === projectId);
  } catch {
    return [];
  }
}

async function saveLocalProjectMessage(message: ProjectGroupMessage): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_PROJECT_MSG_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const existingIndex = Array.isArray(list) ? list.findIndex((m: any) => m.id === message.id) : -1;
    let nextList = [];
    if (existingIndex > -1) {
      nextList = [...list];
      nextList[existingIndex] = message;
    } else {
      nextList = [...(Array.isArray(list) ? list : []), message];
    }
    await AsyncStorage.setItem(LOCAL_PROJECT_MSG_KEY, JSON.stringify(nextList));
  } catch {}
}

// ── Direct Messages ──────────────────────────────────────────────────────────

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  const map = new Map<string, Message>();
  
  // 1. Read local storage first
  const localList = await getLocalDirectMessages();
  for (const m of localList) {
    if (m.senderId === userId || m.recipientId === userId) {
      map.set(m.id, m);
    }
  }

  // 2. Read Firestore
  try {
    const sentQ = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId),
    );
    const recvQ = query(
      collection(db(), DM_COLLECTION),
      where('recipientId', '==', userId),
    );
    const [sentSnap, recvSnap] = await Promise.all([getDocs(sentQ), getDocs(recvQ)]);
    for (const d of [...sentSnap.docs, ...recvSnap.docs]) {
      const fbMsg = { id: d.id, ...d.data() } as Message;
      map.set(d.id, fbMsg);
      void saveLocalDirectMessage(fbMsg);
    }
  } catch (err) {
    console.warn('[Firestore] getMessagesForUser failed, using local cache:', err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function getConversation(
  userId1: string,
  userId2: string,
): Promise<Message[]> {
  const map = new Map<string, Message>();

  // 1. Read local storage first
  const localList = await getLocalDirectMessages();
  for (const m of localList) {
    if (
      (m.senderId === userId1 && m.recipientId === userId2) ||
      (m.senderId === userId2 && m.recipientId === userId1)
    ) {
      map.set(m.id, m);
    }
  }

  // 2. Read Firestore
  try {
    const q1 = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId1),
      where('recipientId', '==', userId2),
    );
    const q2 = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId2),
      where('recipientId', '==', userId1),
    );
    const fetchPromise = Promise.all([getDocs(q1), getDocs(q2)]);
    const [snap1, snap2] = await Promise.race([
      fetchPromise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('getConversation timeout')), 6000)),
    ]);
    for (const d of [...snap1.docs, ...snap2.docs]) {
      const fbMsg = { id: d.id, ...d.data() } as Message;
      map.set(d.id, fbMsg);
      void saveLocalDirectMessage(fbMsg);
    }
  } catch (err) {
    console.warn('[Firestore] getConversation failed, using local messages:', err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function saveMessage(message: Message): Promise<void> {
  // Always persist locally first so both parties get instant sync on web/app
  await saveLocalDirectMessage(message);

  const ref = doc(db(), DM_COLLECTION, message.id);
  const savePromise = setDoc(ref, {
    senderId: message.senderId,
    recipientId: message.recipientId,
    projectId: message.projectId ?? null,
    content: message.content,
    timestamp: message.timestamp,
    read: message.read,
    attachments: message.attachments ?? [],
  });
  // 4s timeout so UI never hangs indefinitely if Firestore network is slow/blocked
  await Promise.race([
    savePromise,
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

export async function markMessageAsRead(messageId: string): Promise<void> {
  const ref = doc(db(), DM_COLLECTION, messageId);
  await updateDoc(ref, { read: true });
}

export async function updateMessageContent(messageId: string, content: string): Promise<void> {
  const ref = doc(db(), DM_COLLECTION, messageId);
  await updateDoc(ref, { content });
}

export async function updateProjectGroupMessageContent(
  messageId: string,
  content: string,
): Promise<void> {
  const ref = doc(db(), PROJECT_MSG_COLLECTION, messageId);
  await updateDoc(ref, { content });
}

export async function deleteMessage(messageId: string): Promise<void> {
  const ref = doc(db(), DM_COLLECTION, messageId);
  await deleteDoc(ref);
}

export async function deleteProjectGroupMessage(messageId: string): Promise<void> {
  const ref = doc(db(), PROJECT_MSG_COLLECTION, messageId);
  await deleteDoc(ref);
}

export async function getProjectGroupMessages(
  projectId: string,
  _userId: string,
): Promise<ProjectGroupMessage[]> {
  const map = new Map<string, ProjectGroupMessage>();

  // 1. Read local storage first for instantaneous load
  const localList = await getLocalProjectMessages(projectId);
  for (const m of localList) {
    map.set(m.id, m);
  }

  // 2. Read Firestore
  try {
    const q = query(
      collection(db(), PROJECT_MSG_COLLECTION),
      where('projectId', '==', projectId),
    );
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const fbMsg = { id: d.id, ...d.data() } as ProjectGroupMessage;
      map.set(d.id, fbMsg);
      void saveLocalProjectMessage(fbMsg);
    }
  } catch (err) {
    console.warn('[Firestore] getProjectGroupMessages failed, using local messages:', err);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}

export async function saveProjectGroupMessage(message: ProjectGroupMessage): Promise<void> {
  // Always persist locally first so group chat updates immediately
  await saveLocalProjectMessage(message);

  const ref = doc(db(), PROJECT_MSG_COLLECTION, message.id);
  const savePromise = setDoc(ref, {
    projectId: message.projectId,
    senderId: message.senderId,
    content: message.content,
    timestamp: message.timestamp,
    kind: message.kind ?? 'message',
    needPost: message.needPost ?? null,
    scopeProposal: message.scopeProposal ?? null,
    responseToMessageId: message.responseToMessageId ?? null,
    responseAction: message.responseAction ?? null,
    responseToTitle: message.responseToTitle ?? null,
    attachments: message.attachments ?? [],
  });
  await Promise.race([
    savePromise,
    new Promise((resolve) => setTimeout(resolve, 4000)),
  ]);
}

export async function deleteProjectGroupChat(projectId: string): Promise<void> {
  const q = query(
    collection(db(), PROJECT_MSG_COLLECTION),
    where('projectId', '==', projectId),
  );
  const snap = await getDocs(q);
  if (snap.empty) return;
  const batch = writeBatch(db());
  for (const d of snap.docs) {
    batch.delete(d.ref);
  }
  await batch.commit();
}

export interface TypingStatus {
  userId: string;
  recipientId: string;
  isTyping: boolean;
  timestamp: number;
}

const TYPING_COLLECTION = 'typingStatus';

export async function setTypingStatus(senderId: string, recipientId: string, isTyping: boolean): Promise<void> {
  try {
    const key = `${senderId}_${recipientId}`;
    const ref = doc(db(), TYPING_COLLECTION, key);
    await setDoc(ref, {
      userId: senderId,
      recipientId,
      isTyping,
      timestamp: Date.now(),
    });
  } catch (_) {}
}

export function subscribeToTypingStatus(
  currentUserId: string,
  targetUserId: string,
  onTypingChange: (isTyping: boolean) => void,
): () => void {
  const key = `${targetUserId}_${currentUserId}`;
  const ref = doc(db(), TYPING_COLLECTION, key);
  return onSnapshot(ref, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const isFresh = Date.now() - (data.timestamp || 0) < 6000;
      onTypingChange(Boolean(data.isTyping && isFresh));
    } else {
      onTypingChange(false);
    }
  }, () => onTypingChange(false));
}

// ── Real-time subscription ───────────────────────────────────────────────────

export type MessageSubscriptionEvent =
  | { type: 'message.changed'; message: Message }
  | { type: 'project-group-message.changed'; message: ProjectGroupMessage };

export function subscribeToMessages(
  userId: string,
  onChange: (event: MessageSubscriptionEvent) => void,
): () => void {
  const sentQ = query(
    collection(db(), DM_COLLECTION),
    where('senderId', '==', userId),
  );
  const recvQ = query(
    collection(db(), DM_COLLECTION),
    where('recipientId', '==', userId),
  );

  const unsub1 = onSnapshot(sentQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        onChange({
          type: 'message.changed',
          message: { id: change.doc.id, ...change.doc.data() } as Message,
        });
      }
    });
  }, (err) => console.warn('[Firestore] DM sentQ listener error:', err));

  const unsub2 = onSnapshot(recvQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        onChange({
          type: 'message.changed',
          message: { id: change.doc.id, ...change.doc.data() } as Message,
        });
      }
    });
  }, (err) => console.warn('[Firestore] DM recvQ listener error:', err));

  const projQ = query(
    collection(db(), PROJECT_MSG_COLLECTION),
  );

  const unsub3 = onSnapshot(projQ, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === 'added' || change.type === 'modified') {
        const msg = { id: change.doc.id, ...change.doc.data() } as ProjectGroupMessage;
        void saveLocalProjectMessage(msg);
        onChange({
          type: 'project-group-message.changed',
          message: msg,
        });
      }
    });
  }, (err) => console.warn('[Firestore] Project group listener error:', err));

  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
}
