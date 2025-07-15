import { useChat } from '../context/ChatContext';

export const useChatRooms = () => {
  const { state, loadChatRooms } = useChat();
  return {
    chatRooms: state.chatRooms,
    loading: state.loading,
    error: state.error,
    loadChatRooms,
  };
};

export const useChatMessages = (chatRoomId?: number) => {
  const { state, loadMessages, sendMessage, deleteMessage } = useChat();
  
  const messages = chatRoomId ? (state.messages[chatRoomId] || []) : [];
  
  return {
    messages,
    loading: state.loading,
    error: state.error,
    loadMessages,
    sendMessage,
    deleteMessage,
  };
};

export const useCurrentChatRoom = () => {
  const { state, setCurrentChatRoom, setCurrentChatRoomById } = useChat();
  return {
    currentChatRoom: state.currentChatRoom,
    setCurrentChatRoom,
    setCurrentChatRoomById,
  };
};
