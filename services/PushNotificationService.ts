import { Platform } from 'react-native';
import { getStorageItem, setStorageItem } from '../models/storage';

export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
  icon?: string;
  badge?: number;
  tag?: string;
}

export interface UserPushToken {
  userId: string;
  token: string;
  platform: 'web' | 'android' | 'ios';
  updatedAt: string;
}

const PUSH_TOKEN_STORAGE_KEY = 'userPushTokenRecord';

class PushNotificationService {
  private static instance: PushNotificationService;
  private permissionGranted: boolean = false;
  private currentPushToken: string | null = null;

  private constructor() {}

  public static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  /**
   * Request notification permissions from user (Web Notification API & Mobile)
   */
  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window) {
        try {
          const permission = await window.Notification.requestPermission();
          this.permissionGranted = permission === 'granted';
          return this.permissionGranted;
        } catch (error) {
          console.warn('[PushNotificationService] Web notification permission error:', error);
          return false;
        }
      }
      return false;
    }

    // Native mobile platforms (FCM / APNs)
    this.permissionGranted = true;
    return true;
  }

  /**
   * Register push notification token for current user
   */
  public async registerUserToken(userId: string): Promise<string | null> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        console.log('[PushNotificationService] Push notification permission not granted.');
        return null;
      }

      // Generate or retrieve device push token
      let token = this.currentPushToken;
      if (!token) {
        token = `token_${Platform.OS}_${userId}_${Date.now()}`;
        this.currentPushToken = token;
      }

      const tokenRecord: UserPushToken = {
        userId,
        token,
        platform: Platform.OS === 'web' ? 'web' : Platform.OS === 'ios' ? 'ios' : 'android',
        updatedAt: new Date().toISOString(),
      };

      await setStorageItem(PUSH_TOKEN_STORAGE_KEY, tokenRecord);
      console.log(`[PushNotificationService] Token registered for user ${userId}:`, token);
      return token;
    } catch (error) {
      console.error('[PushNotificationService] Failed to register push token:', error);
      return null;
    }
  }

  /**
   * Send a local push notification for a new message or proposal alert
   */
  public async showLocalNotification(payload: PushNotificationPayload): Promise<void> {
    const { title, body, data, icon } = payload;

    // Web Notification dispatch
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && 'Notification' in window && window.Notification.permission === 'granted') {
        try {
          const notification = new window.Notification(title, {
            body,
            icon: icon || '/favicon.ico',
            data,
            tag: payload.tag || 'message-alert',
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch (err) {
          console.warn('[PushNotificationService] Failed to show web notification:', err);
        }
      }
      return;
    }

    // Native in-app toast / banner handler fallback
    console.log(`[PushNotificationService] Notification dispatched: [${title}] ${body}`, data);
  }

  /**
   * Trigger notification for incoming chat message
   */
  public async notifyNewMessage(senderName: string, messageText: string, chatId: string): Promise<void> {
    const cleanText = messageText.startsWith('___PROPOSAL_CARD___:')
      ? '📋 Sent a project proposal card'
      : messageText.length > 80
      ? `${messageText.substring(0, 80)}...`
      : messageText;

    await this.showLocalNotification({
      title: `New Message from ${senderName}`,
      body: cleanText,
      data: { chatId, type: 'chat_message' },
      tag: `chat-${chatId}`,
    });
  }

  /**
   * Trigger notification for proposal status updates (Approved / Rejected)
   */
  public async notifyProposalReview(projectTitle: string, status: 'Approved' | 'Rejected', reviewNotes?: string): Promise<void> {
    const title = status === 'Approved' ? '✅ Proposal Approved!' : '⚠️ Proposal Needs Revision';
    const body = status === 'Approved'
      ? `"${projectTitle}" was approved by admin. A project workspace has been created.`
      : `"${projectTitle}" was rejected. ${reviewNotes ? `Reason: ${reviewNotes}` : 'Please review and resubmit.'}`;

    await this.showLocalNotification({
      title,
      body,
      data: { projectTitle, status, type: 'proposal_review' },
      tag: `proposal-${status.toLowerCase()}`,
    });
  }
}

export const pushNotificationService = PushNotificationService.getInstance();
export default pushNotificationService;
