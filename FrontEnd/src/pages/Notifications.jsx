import React, { useContext } from 'react';
import { NotificationContext } from '../context/NotificationContext';

const Notifications = () => {
  const { notifications, markAsViewed, deleteNotification } = useContext(NotificationContext);

  if (!notifications) {
    return <div>Debug: Notifications context is not available.</div>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>
      {notifications.length === 0 ? (
        <p>No notifications available.</p>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`p-2 mb-2 rounded ${notification.viewed ? 'bg-gray-200' : 'bg-blue-100'}`}
            >
              <div className="flex justify-between items-center">
                <span>{notification.message}</span>
                <div>
                  {!notification.viewed && (
                    <button
                      className="mr-2 text-sm text-blue-500"
                      onClick={() => markAsViewed(notification.id)}
                    >
                      Mark as Viewed
                    </button>
                  )}
                  <button
                    className="text-sm text-red-500"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Notifications;