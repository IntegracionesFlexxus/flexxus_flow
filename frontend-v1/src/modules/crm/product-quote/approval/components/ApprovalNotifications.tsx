// ApprovalNotifications - Real-time approval notifications
import React from 'react';
import { Bell, CheckCircle, XCircle, Clock, Eye, Trash2, MarkAsRead } from 'lucide-react';
import { ApprovalNotification } from '../../shared/types';

interface ApprovalNotificationsProps {
  notifications: ApprovalNotification[];
  onMarkAsRead: (notificationId: number) => void;
  onMarkAllAsRead: () => void;
  onDelete?: (notificationId: number) => void;
  limit?: number;
}

export const ApprovalNotifications: React.FC<ApprovalNotificationsProps> = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onDelete,
  limit = 50
}) => {
  const displayNotifications = notifications.slice(0, limit);
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'approval_request':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'approval_completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'approval_escalated':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">
              {unreadCount} unread of {notifications.length} total
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Mark all as read
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-200 max-h-96 overflow-y-auto">
        {displayNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`p-4 hover:bg-gray-50 ${!notification.isRead ? 'bg-blue-50' : ''}`}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                    {notification.title}
                  </p>
                  {!notification.isRead && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {notification.message}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-500">
                    {new Date(notification.createdAt).toLocaleString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    {notification.actionUrl && (
                      <button
                        onClick={() => window.location.href = notification.actionUrl!}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    )}
                    {!notification.isRead && (
                      <button
                        onClick={() => onMarkAsRead(notification.id)}
                        className="text-gray-400 hover:text-gray-600 text-xs"
                      >
                        <MarkAsRead className="h-4 w-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(notification.id)}
                        className="text-red-400 hover:text-red-600 text-xs"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {notifications.length === 0 && (
        <div className="p-8 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
          <p className="text-gray-600">You'll see approval notifications here.</p>
        </div>
      )}
    </div>
  );
};

export default ApprovalNotifications;