
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button } from '@/components/ui';
import { BellIcon } from '@/assets/icons';
import { Notification } from '@/types';

const notifications: Notification[] = [
  { id: '1', message: '새로운 팀 공지사항이 등록되었습니다: "주간 회의 일정 안내"', timestamp: new Date(Date.now() - 3600000), read: false, link: '/team/team-alpha-123' },
  { id: '2', message: '박해커님이 채팅방에서 당신을 언급했습니다.', timestamp: new Date(Date.now() - 7200000), read: false, link: '/team/team-alpha-123' },
  { id: '3', message: '캘린더에 "프로젝트 마감일" 일정이 추가되었습니다.', timestamp: new Date(Date.now() - 86400000 * 2), read: true, link: '/team/team-alpha-123' },
  { id: '4', message: '새로운 팀원이 "알파 프로젝트 팀"에 합류했습니다.', timestamp: new Date(Date.now() - 86400000 * 3), read: true },
];

export const NotificationsPage: React.FC = () => {
  const [notificationList, setNotificationList] = useState<Notification[]>(notifications);
  const [kakaoAlertEnabled, setKakaoAlertEnabled] = useState(false);

  const markAsRead = (id: string) => {
    setNotificationList(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotificationList(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notificationList.filter(n => !n.read).length;

  return (
    <Card title="알림 센터" actions={unreadCount > 0 ? <Button size="sm" variant="outline" onClick={markAllAsRead}>모두 읽음 처리</Button> : null}>
      <div className="mb-6 p-4 bg-neutral-100 rounded-md flex items-center justify-between">
        <div>
          <h3 className="text-md font-semibold text-neutral-700">카카오톡 알림 설정</h3>
          <p className="text-sm text-neutral-500">주요 활동에 대한 알림을 카카오톡으로 받아보세요.</p>
        </div>
        <Button 
            variant={kakaoAlertEnabled ? "primary" : "outline"}
            onClick={() => {
                setKakaoAlertEnabled(!kakaoAlertEnabled);
                alert(`카카오톡 알림이 ${!kakaoAlertEnabled ? '활성화' : '비활성화'}되었습니다. (목업 기능)`);
            }}
        >
            {kakaoAlertEnabled ? '카톡 알림 ON' : '카톡 알림 OFF'}
        </Button>
      </div>

      {notificationList.length === 0 ? (
        <p className="text-neutral-500 text-center py-4">새로운 알림이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {notificationList.map(notification => (
            <li 
              key={notification.id} 
              className={`p-4 rounded-lg shadow-sm flex items-start space-x-3 transition-colors
                ${notification.read ? 'bg-white hover:bg-neutral-50' : 'bg-primary-light/10 hover:bg-primary-light/20 border-l-4 border-primary'}`}
            >
              <div className={`mt-1 ${notification.read ? 'text-neutral-400' : 'text-primary'}`}>
                <BellIcon className="w-5 h-5" />
              </div>
              <div className="flex-grow">
                <p className={`text-sm ${notification.read ? 'text-neutral-600' : 'text-neutral-800 font-medium'}`}>
                  {notification.message}
                </p>
                <p className={`text-xs mt-1 ${notification.read ? 'text-neutral-400' : 'text-neutral-500'}`}>
                  {notification.timestamp.toLocaleString()}
                </p>
              </div>
              <div className="flex-shrink-0 space-x-2">
                {notification.link && (
                  <Link to={notification.link}>
                    <Button size="sm" variant="ghost" onClick={() => markAsRead(notification.id)}>
                      보기
                    </Button>
                  </Link>
                )}
                {!notification.read && (
                  <Button size="sm" variant="outline" onClick={() => markAsRead(notification.id)}>
                    읽음
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};
