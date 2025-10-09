'use client';

import ChatList from './ChatList';

interface TelegramChatsProps {
  className?: string;
}

/**
 * @deprecated Use ChatList component directly with channel="telegram"
 * This component is maintained for backward compatibility only
 */
export default function TelegramChats({ className = '' }: TelegramChatsProps) {
  return <ChatList channel="telegram" className={className} />;
}
