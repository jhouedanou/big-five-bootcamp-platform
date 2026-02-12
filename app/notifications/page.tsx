/**
 * Page: /notifications
 * 
 * Affiche toutes les notifications de l'utilisateur
 */

'use client';

import { useEffect, useState } from 'react';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { Button } from '@/components/ui/button';
import { Bell, Check, Trash2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

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

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  // Charger les notifications
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const url = filter === 'unread' 
        ? '/api/notifications?read=false&limit=100' 
        : '/api/notifications?limit=100';
      
      const response = await fetch(url);
      const data = await response.json();

      if (data.success) {
        setNotifications(data.notifications);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  // Marquer comme lue
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/mark-read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(n =>
            n.id === notificationId ? { ...n, read: true } : n
          )
        );
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

  // Formater la date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return 'À l\'instant';
    if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
    if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)} h`;
    if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'long',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <Navbar />
      
      <main className="flex-1">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          {/* Header */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 text-sm text-[#1A1F2B]/70 hover:text-[#1A1F2B] mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour au tableau de bord
            </Link>
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-[family-name:var(--font-heading)] text-3xl font-bold text-[#1A1F2B]">
                  Notifications
                </h1>
                {unreadCount > 0 && (
                  <p className="mt-1 text-sm text-[#1A1F2B]/60">
                    {unreadCount} notification{unreadCount > 1 ? 's' : ''} non lue{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <Check className="h-4 w-4" />
                  Tout marquer comme lu
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 flex gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
              className={filter === 'all' ? 'bg-[#80368D]' : ''}
            >
              Toutes
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unread')}
              className={filter === 'unread' ? 'bg-[#80368D]' : ''}
            >
              Non lues {unreadCount > 0 && `(${unreadCount})`}
            </Button>
          </div>

          {/* Notifications List */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#80368D] border-t-transparent" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="rounded-xl border border-[#D0E4F2] bg-[#D0E4F2]/10 py-16 text-center">
              <Bell className="mx-auto h-16 w-16 text-[#D0E4F2]" />
              <p className="mt-4 text-lg font-medium text-[#1A1F2B]">
                Aucune notification
              </p>
              <p className="mt-2 text-sm text-[#1A1F2B]/60">
                {filter === 'unread' 
                  ? 'Vous avez tout lu !' 
                  : 'Vous n\'avez pas encore de notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    'rounded-xl border transition-all hover:shadow-md',
                    notification.read 
                      ? 'border-[#D0E4F2] bg-white' 
                      : 'border-[#F2B33D] bg-[#F2B33D]/5'
                  )}
                >
                  <div className="flex gap-4 p-4">
                    <div className="flex-shrink-0 text-3xl">
                      {getNotificationEmoji(notification.type)}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#1A1F2B]">
                            {notification.title}
                          </h3>
                          <p className="mt-1 text-sm text-[#1A1F2B]/70">
                            {notification.message}
                          </p>
                          <p className="mt-2 text-xs text-[#1A1F2B]/50">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                        
                        {!notification.read && (
                          <Button
                            onClick={() => markAsRead(notification.id)}
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0 gap-2"
                          >
                            <Check className="h-4 w-4" />
                            Marquer comme lu
                          </Button>
                        )}
                      </div>
                      
                      {notification.action_url && (
                        <Link
                          href={notification.action_url}
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-3 border-[#80368D] text-[#80368D] hover:bg-[#80368D] hover:text-white"
                          >
                            Voir plus
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
