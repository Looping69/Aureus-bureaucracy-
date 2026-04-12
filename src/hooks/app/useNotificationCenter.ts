import React from 'react';
import { ActionLogEntry } from '../../components/ActionLogPanel';

export type NotificationMessage = {
  title: string;
  msg: string;
};

export const useNotificationCenter = () => {
  const [notification, setNotification] = React.useState<NotificationMessage | null>(null);
  const [notificationQueue, setNotificationQueue] = React.useState<NotificationMessage[]>([]);
  const [actionLog, setActionLog] = React.useState<ActionLogEntry[]>([]);

  const appendActionLog = React.useCallback((title: string, msg: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActionLog((prev) => [
      { id: `${Date.now()}-${Math.random()}`, timestamp, title, msg },
      ...prev,
    ].slice(0, 40));
  }, []);

  const pushNotification = React.useCallback((next: NotificationMessage | null) => {
    if (!next) return;

    setNotification((current) => {
      if (!current) return next;
      setNotificationQueue((queued) => [...queued, next]);
      return current;
    });
  }, []);

  const pushNotifications = React.useCallback((items: NotificationMessage[]) => {
    items.forEach((item) => pushNotification(item));
  }, [pushNotification]);

  const queueNotification: React.Dispatch<React.SetStateAction<NotificationMessage | null>> = React.useCallback((next) => {
    if (typeof next === 'function') {
      setNotification((current) => {
        const resolved = next(current);
        if (resolved) {
          setNotificationQueue((queued) => [...queued, resolved]);
        }
        return current;
      });
      return;
    }

    pushNotification(next);
  }, [pushNotification]);

  const dismissNotification = React.useCallback(() => {
    setNotificationQueue((queued) => {
      if (queued.length === 0) {
        setNotification(null);
        return queued;
      }

      const [next, ...rest] = queued;
      setNotification(next);
      return rest;
    });
  }, []);

  const resetNotifications = React.useCallback(() => {
    setNotification(null);
    setNotificationQueue([]);
    setActionLog([]);
  }, []);

  React.useEffect(() => {
    if (!notification) return;
    appendActionLog(notification.title, notification.msg);
  }, [appendActionLog, notification]);

  return {
    notification,
    pushNotification,
    pushNotifications,
    queueNotification,
    dismissNotification,
    actionLog,
    setActionLog,
    resetNotifications,
  };
};
