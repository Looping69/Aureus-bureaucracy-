import React from 'react';
import { ActionLogEntry } from '../../components/ActionLogPanel';

export type NotificationMessage = {
  title: string;
  msg: string;
};

export const useNotificationCenter = () => {
  const [notification, setNotification] = React.useState<NotificationMessage | null>(null);
  const [actionLog, setActionLog] = React.useState<ActionLogEntry[]>([]);

  const appendActionLog = React.useCallback((title: string, msg: string, unread = false) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setActionLog((prev) => [
      { id: `${Date.now()}-${Math.random()}`, timestamp, title, msg, unread },
      ...prev,
    ].slice(0, 40));
  }, []);

  const pushNotification = React.useCallback((next: NotificationMessage | null) => {
    if (!next) return;
    appendActionLog(next.title, next.msg, true);
    setNotification(next);
  }, [appendActionLog]);

  const pushNotifications = React.useCallback((items: NotificationMessage[]) => {
    items.forEach((item) => pushNotification(item));
  }, [pushNotification]);

  const queueNotification: React.Dispatch<React.SetStateAction<NotificationMessage | null>> = React.useCallback((next) => {
    if (typeof next === 'function') {
      setNotification((current) => {
        const resolved = next(current);
        if (resolved) {
          appendActionLog(resolved.title, resolved.msg, true);
        }
        return resolved ?? current;
      });
      return;
    }

    pushNotification(next);
  }, [appendActionLog, pushNotification]);

  const dismissNotification = React.useCallback(() => {
    setNotification(null);
  }, []);

  const markActionLogRead = React.useCallback((entryIds?: string[]) => {
    setActionLog((prev) =>
      prev.map((entry) => {
        if (!entry.unread) return entry;
        if (entryIds && !entryIds.includes(entry.id)) return entry;
        return { ...entry, unread: false };
      }),
    );
  }, []);

  const markAllActionLogRead = React.useCallback(() => {
    markActionLogRead();
  }, [markActionLogRead]);

  const unreadActionLogCount = React.useMemo(
    () => actionLog.reduce((count, entry) => count + (entry.unread ? 1 : 0), 0),
    [actionLog],
  );

  const resetNotifications = React.useCallback(() => {
    setNotification(null);
    setActionLog([]);
  }, []);

  return {
    notification,
    pushNotification,
    pushNotifications,
    queueNotification,
    dismissNotification,
    actionLog,
    setActionLog,
    unreadActionLogCount,
    markActionLogRead,
    markAllActionLogRead,
    resetNotifications,
  };
};
