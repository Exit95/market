import { prisma } from './prisma.js';

type NotificationType = 'MESSAGE' | 'DEAL_UPDATE' | 'REVIEW' | 'LISTING_UPDATE' | 'SYSTEM' | 'MODERATION';

interface NotifyParams {
  userId: string; // Profile ID, not User ID
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, any>;
}

export async function createNotification({ userId, type, title, body, data }: NotifyParams) {
  try {
    await prisma.notification.create({
      data: { userId, type, title, body, data: data ?? undefined },
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export async function notifyNewMessage(recipientProfileId: string, senderName: string, conversationId: string, listingId: string) {
  await createNotification({
    userId: recipientProfileId,
    type: 'MESSAGE',
    title: 'Neue Nachricht',
    body: `${senderName} hat dir eine Nachricht geschrieben.`,
    data: { conversationId, listingId },
  });
}

export async function notifyDealUpdate(recipientProfileId: string, dealId: string, status: string, listingTitle: string) {
  const statusLabels: Record<string, string> = {
    NEGOTIATING: 'Verhandlung gestartet',
    AGREED: 'Deal zugesagt',
    PAID: 'Zahlung eingegangen',
    SHIPPED: 'Ware versendet',
    HANDED_OVER: 'Ware uebergeben',
    COMPLETED: 'Deal abgeschlossen',
    CANCELED: 'Deal storniert',
    CONFLICT: 'Konfliktfall gemeldet',
  };

  await createNotification({
    userId: recipientProfileId,
    type: 'DEAL_UPDATE',
    title: statusLabels[status] ?? 'Deal aktualisiert',
    body: `Deal fuer "${listingTitle}" wurde aktualisiert.`,
    data: { dealId },
  });
}

export async function notifyNewReview(recipientProfileId: string, reviewerName: string, rating: number) {
  await createNotification({
    userId: recipientProfileId,
    type: 'REVIEW',
    title: 'Neue Bewertung',
    body: `${reviewerName} hat dir ${rating} Sterne gegeben.`,
  });
}
