/**
 * Composant: NotificationBell
 * 
 * Icône de cloche avec badge de notifications non lues
 * Ouvre un dropdown avec la liste des notifications
 */

'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
  metadata: any;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Charger les notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications?limit=10');
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
        setUnreadCount(data.unread_count);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Charger au montage et toutes les 30 secondes
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Marquer comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        // Mettre à jour localement
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Marquer toutes comme lues
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'POST',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n => ({ ...n, read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  // Obtenir l'emoji selon le type
  const getNotificationEmoji = (type: string) => {
    const emojiMap: Record<string, string> = {
      subscription_reminder: '🌟',
      payment_success: '✅',
      payment_failed: '❌',
      subscription_expiring: '⏰',
      subscription_expired: '😔',
    };
    return emojiMap[type] || '📢';
  };

  // Formater la date relative
  const getRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#F2B33D] text-xs font-bold text-[#0F0F0F]">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[380px] p-0">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-[#0F0F0F]">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllAsRead}
              className="h-auto p-0 text-xs text-[#F2B33D] hover:text-[#F2B33D]/80"
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>

        {/* List */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#F2B33D] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-8 text-center">
              <Bell className="mx-auto h-12 w-12 text-[#F5F5F5]" />
              <p className="mt-2 text-sm text-[#0F0F0F]/60">
                Aucune notification
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'px-4 py-3 transition-colors hover:bg-[#F5F5F5]/20',
                    !notification.read && 'bg-[#F5F5F5]/10'
                  )}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationEmoji(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-[#0F0F0F]">
                          {notification.title}
                        </p>
                        {!notification.read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="flex-shrink-0 rounded-full p-1 hover:bg-[#F5F5F5]/50"
                            aria-label="Marquer comme lu"
                          >
                            <Check className="h-3 w-3 text-[#F2B33D]" />
                          </button>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#0F0F0F]/70 line-clamp-2">
                        {notification.message}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-[#0F0F0F]/50">
                          {getRelativeTime(notification.created_at)}
                        </span>
                        {notification.action_url && (
                          <>
                            <span className="text-[#0F0F0F]/30">•</span>
                            <Link
                              href={notification.action_url}
                              onClick={() => {
                                markAsRead(notification.id);
                                setIsOpen(false);
                              }}
                              className="text-xs text-[#F2B33D] hover:underline"
                            >
                              Voir plus
                            </Link>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2 text-center">
            <Link
              href="/notifications"
              onClick={() => setIsOpen(false)}
              className="text-sm text-[#F2B33D] hover:underline"
            >
              Voir toutes les notifications
            </Link>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
