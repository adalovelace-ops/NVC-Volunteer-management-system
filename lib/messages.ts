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
} from 'firebase/firestore';
import { getFirestoreDb } from './firebase';
import type { Message, ProjectGroupMessage } from '../models/types';

const DM_COLLECTION = 'directMessages';
const PROJECT_MSG_COLLECTION = 'projectGroupMessages';

function db() {
  return getFirestoreDb();
}

// ── Direct Messages ──────────────────────────────────────────────────────────

export async function getMessagesForUser(userId: string): Promise<Message[]> {
  try {
    const sentQ = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId),
      orderBy('timestamp', 'asc'),
    );
    const recvQ = query(
      collection(db(), DM_COLLECTION),
      where('recipientId', '==', userId),
      orderBy('timestamp', 'asc'),
    );
    const [sentSnap, recvSnap] = await Promise.all([getDocs(sentQ), getDocs(recvQ)]);
    const map = new Map<string, Message>();
    for (const d of [...sentSnap.docs, ...recvSnap.docs]) {
      map.set(d.id, { id: d.id, ...d.data() } as Message);
    }
    return Array.from(map.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  } catch (err) {
    console.warn('[Firestore] getMessagesForUser failed:', err);
    return [];
  }
}

export async function getConversation(
  userId1: string,
  userId2: string,
): Promise<Message[]> {
  try {
    const q1 = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId1),
      where('recipientId', '==', userId2),
      orderBy('timestamp', 'asc'),
    );
    const q2 = query(
      collection(db(), DM_COLLECTION),
      where('senderId', '==', userId2),
      where('recipientId', '==', userId1),
      orderBy('timestamp', 'asc'),
    );
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const msgs: Message[] = [];
    for (const d of [...snap1.docs, ...snap2.docs]) {
      msgs.push({ id: d.id, ...d.data() } as Message);
    }
    return msgs.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
  } catch (err) {
    console.warn('[Firestore] getConversation failed:', err);
    return [];
  }
}

export async function saveMessage(message: Message): Promise<void> {
  const ref = doc(db(), DM_COLLECTION, message.id);
  await setDoc(ref, {
    senderId: message.senderId,
    recipientId: message.recipientId,
    projectId: message.projectId ?? null,
    content: message.content,
    timestamp: message.timestamp,
    read: message.read,
    attachments: message.attachments ?? [],
  });
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

// ── Project Group Messages ───────────────────────────────────────────────────

export async function getProjectGroupMessages(
  projectId: string,
  _userId: string,
): Promise<ProjectGroupMessage[]> {
  try {
    const q = query(
      collection(db(), PROJECT_MSG_COLLECTION),
      where('projectId', '==', projectId),
      orderBy('timestamp', 'asc'),
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectGroupMessage));
  } catch (err) {
    console.warn('[Firestore] getProjectGroupMessages failed:', err);
    return [];
  }
}

export async function saveProjectGroupMessage(message: ProjectGroupMessage): Promise<void> {
  const ref = doc(db(), PROJECT_MSG_COLLECTION, message.id);
  await setDoc(ref, {
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
    orderBy('timestamp', 'asc'),
  );
  const recvQ = query(
    collection(db(), DM_COLLECTION),
    where('recipientId', '==', userId),
    orderBy('timestamp', 'asc'),
  );

  let sentFired = false;
  let recvFired = false;

  const unsub1 = onSnapshot(sentQ, (snapshot) => {
    if (sentFired) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          onChange({
            type: 'message.changed',
            message: { id: change.doc.id, ...change.doc.data() } as Message
          });
        }
      });
    }
    sentFired = true;
  }, (err) => console.warn('[Firestore] DM sentQ listener error:', err));

  const unsub2 = onSnapshot(recvQ, (snapshot) => {
    if (recvFired) {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' || change.type === 'modified') {
          onChange({
            type: 'message.changed',
            message: { id: change.doc.id, ...change.doc.data() } as Message
          });
        }
      });
    }
    recvFired = true;
  }, (err) => console.warn('[Firestore] DM recvQ listener error:', err));

  return () => {
    unsub1();
    unsub2();
  };
}
