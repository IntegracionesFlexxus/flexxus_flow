// pages/ConversationsPage.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useConversations, useWebSocket } from '../hooks';
import { LoadingSpinner, EmptyState } from '../components';

const ConversationsPage: React.FC = () => {
  const { conversationId } = useParams();
  const {
    conversations,
    activeConversation,
    loading,
    error,
    selectConversation,
    getTotalUnreadCount
  } = useConversations();

  const { joinConversation, leaveConversation } = useWebSocket();

  useEffect(() => {
    if (conversationId) {
      // Buscar la conversación y seleccionarla
      const conversation = conversations.find(c => c.id === conversationId);
      if (conversation) {
        selectConversation(conversation);
        joinConversation(conversationId);
      }

      return () => {
        leaveConversation(conversationId);
      };
    }
  }, [conversationId, conversations, selectConversation, joinConversation, leaveConversation]);

  if (loading) {
    return <LoadingSpinner fullScreen message="Loading conversations..." />;
  }

  return (
    <div className="flex h-full">
      {/* Sidebar - Lista de conversaciones */}
      <div className="w-1/3 border-r border-gray-200 bg-white">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Conversations
          </h2>
          {getTotalUnreadCount() > 0 && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 ml-2">
              {getTotalUnreadCount()} unread
            </span>
          )}
        </div>

        <div className="overflow-y-auto">
          {conversations.length === 0 ? (
            <EmptyState
              title="No conversations"
              description="Start a new conversation or wait for customers to reach out"
              icon="💬"
            />
          ) : (
            <div className="divide-y divide-gray-200">
              {conversations.map(conversation => (
                <div
                  key={conversation.id}
                  onClick={() => selectConversation(conversation)}
                  className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                    activeConversation?.id === conversation.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {conversation.customer?.firstName} {conversation.customer?.lastName} || 'Unknown Customer'
                    </h4>
                    {conversation.unreadCount && conversation.unreadCount > 0 && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        {conversation.unreadCount}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate mb-1">
                    {conversation.lastMessage?.content || 'No messages yet'}
                  </p>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{conversation.channelType}</span>
                    <span>
                      {conversation.lastMessageAt
                        ? new Date(conversation.lastMessageAt).toLocaleString()
                        : new Date(conversation.createdAt).toLocaleString()
                      }
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content - Área de mensajes */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <div className="flex-1 flex flex-col">
            {/* Header de la conversación */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {activeConversation.customer?.firstName} {activeConversation.customer?.lastName} || 'Unknown Customer'
                  </h3>
                  <p className="text-sm text-gray-600">
                    {activeConversation.channelType} • {activeConversation.status}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                    Assign
                  </button>
                  <button className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
                    Resolve
                  </button>
                </div>
              </div>
            </div>

            {/* Área de mensajes */}
            <div className="flex-1 p-4 overflow-y-auto bg-gray-50">
              <div className="text-center text-gray-500 py-8">
                <p>Message area coming soon...</p>
                <p className="text-sm mt-2">
                  Conversation ID: {activeConversation.id}
                </p>
              </div>
            </div>

            {/* Composer de mensajes */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex space-x-3">
                <input
                  type="text"
                  placeholder="Type your message..."
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-gray-50">
            <EmptyState
              title="Select a conversation"
              description="Choose a conversation from the list to start messaging"
              icon="👈"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationsPage;