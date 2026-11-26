
import { useEffect, useState } from 'react';
import { useNotificationStore } from '../store/notificationStore';

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);

    const {
        notifications,
        unreadCount,
        isLoading,
        error,
        fetchNotifications,
        markAsRead,
    } = useNotificationStore();

    useEffect(() => {
        void fetchNotifications();
    }, [fetchNotifications]);

    const handleToggle = () => {
        setIsOpen((previous) => !previous);
    };

    const handleRead = async (id: number) => {
        await markAsRead(id);
    };

    return (
        <div className= "notification-wrapper" >
        <button
                type="button"
    className = "notification-bell"
    onClick = { handleToggle }
    aria-label="Thông báo"
    aria-expanded={ isOpen }
            >
        <span className="notification-bell-icon" >🔔</span>

    {
        unreadCount > 0 && (
            <span className="notification-badge" >
            { unreadCount > 99 ? '99+' : unreadCount
    }
    </span>
                )
}
</button>

{
    isOpen && (
        <>
        <div
                        className="notification-backdrop"
    onClick = {() => setIsOpen(false)
}
                    />

    < div className = "notification-dropdown" >
        <div className="notification-header" >
            <div>
            <h3>Thông báo </h3>
                <span>
{ unreadCount } thông báo chưa đọc
    </span>
    </div>

    < button
type = "button"
onClick = {() => void fetchNotifications()}
title = "Làm mới"
    >
                                ↻
</button>
    </div>

    < div className = "notification-list" >
    { isLoading && notifications.length === 0 ? (
        <p className= "notification-empty" >
    Đang tải thông báo...
</p>
                            ) : error && notifications.length === 0 ? (
    <p className= "notification-empty" >
    { error }
    </p>
                            ) : notifications.length === 0 ? (
    <p className= "notification-empty" >
    Bạn chưa có thông báo nào.
                                </p>
                            ) : (
    notifications.map((item) => (
        <div
                                        key= { item.id }
                                        className = {`notification-item ${item.isRead
                ? 'is-read'
                : 'is-unread'
            }`}
        onClick = {() => {
        if(!item.isRead) {
    void handleRead(item.id);
}
                                        }}
                                    >
    <div className="notification-item-icon" >
                                            🔔
</div>

    < div className = "notification-item-content" >
        <strong>{ item.title } </strong>

        < p > { item.content } </p>

        <small>
{
    new Date(
        item.createdAt
    ).toLocaleString('vi-VN')
}
</small>
    </div>

{
    !item.isRead && (
        <span className="notification-unread-dot" />
                                        )
}
</div>
                                ))
                            )}
</div>
    </div>
    </>
            )}
</div>
    );
}
