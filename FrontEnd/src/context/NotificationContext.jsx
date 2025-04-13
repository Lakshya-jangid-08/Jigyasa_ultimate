import React, { createContext, useState, useEffect } from 'react';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    // Simulate adding a notification for testing purposes
    setNotifications([{
      id: 1,
      message: 'Welcome to the Notifications page!',
      viewed: false,
    }]);
  }, []);

  const addNotification = (message) => {
    setNotifications((prev) => [
      ...prev,
      { id: Date.now(), message, viewed: false },
    ]);
  };

  const markAsViewed = (id) => {
    setNotifications((prev) =>
      prev.map((notification) =>
        notification.id === id ? { ...notification, viewed: true } : notification
      )
    );
  };

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id));
  };

  return (
    <NotificationContext.Provider
      value={{ notifications, addNotification, markAsViewed, deleteNotification }}
    >
      {children}
    </NotificationContext.Provider>
  );
};