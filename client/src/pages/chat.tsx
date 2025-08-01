// pages/chat.tsx

import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import { useWebSocket } from "@/hooks/useWebSocket";
import { SQLGenerationResponse, QueryExecutionResponse } from "@shared/schema";

export default function ChatPage() {
  const [selectedDialect, setSelectedDialect] = useState("oracle");
  const [currentResult, setCurrentResult] = useState<QueryExecutionResponse | null>(null);
  const [currentQuery, setCurrentQuery] = useState<SQLGenerationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const { sendMessage, lastMessage, connectionStatus } = useWebSocket();

  const handleSendMessage = async (message: string, functionType?: string) => {
    const messageToSend = message || inputValue;
    if (!messageToSend.trim()) return;

    setIsLoading(true);
    setCurrentQuery(null);
    setCurrentResult(null);
    setInputValue("");

    try {
      // Generate unique request ID
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Send SQL generation request with function type
      sendMessage({
        type: 'generate_sql',
        mode: functionType || 'create',  
        payload: {
          naturalLanguage: messageToSend,
          dialect: selectedDialect,
        },
        requestId, // Add request ID for tracking
      });
    } catch (error) {
      console.error('Error sending message:', error);
      setIsLoading(false);
    }
  };

  const handleExecuteQuery = async (sqlQuery: string) => {
    if (!sqlQuery.trim()) return;

    setCurrentResult(null);

    try {
      const requestId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      sendMessage({
        type: 'execute_query',
        payload: {
          sqlQuery,
          dialect: selectedDialect,
        },
        requestId,
      });
    } catch (error) {
      console.error('Error executing query:', error);
    }
  };

  // Handle WebSocket messages with improved error handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        console.log('WebSocket message received:', data.type, data.requestId);
        
        switch (data.type) {
          case 'sql_generated':
            setCurrentQuery(data.payload);
            setIsLoading(false);
            break;
            
          case 'query_executed':
            setCurrentResult(data.payload);
            break;
            
          case 'error':
            console.error('WebSocket error:', data.message, data.requestId);
            setIsLoading(false);
            
            // Show user-friendly error message
            if (data.message.includes('network') || data.message.includes('connection')) {
              alert('네트워크 연결을 확인해주세요.');
            } else if (data.message.includes('API key') || data.message.includes('authentication')) {
              alert('AI 서비스 연결에 문제가 있습니다. 관리자에게 문의해주세요.');
            } else {
              alert('요청 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
            }
            break;
            
          case 'request_cancelled':
            console.log('Request cancelled:', data.requestId);
            setIsLoading(false);
            setCurrentQuery(null);
            setCurrentResult(null);
            break;
            
          default:
            console.warn('Unknown message type:', data.type);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        setIsLoading(false);
      }
    }
  }, [lastMessage]);

  // Connection status monitoring
  useEffect(() => {
    if (connectionStatus === 'disconnected') {
      setIsLoading(false);
      console.warn('WebSocket disconnected - stopping loading states');
    }
  }, [connectionStatus]);

  // Auto-reconnect logic
  useEffect(() => {
    let reconnectTimer: NodeJS.Timeout;
    
    if (connectionStatus === 'disconnected') {
      reconnectTimer = setTimeout(() => {
        console.log('Attempting to reconnect WebSocket...');
        window.location.reload(); // Simple reconnect strategy
      }, 5000);
    }
    
    return () => {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
      }
    };
  }, [connectionStatus]);

  return (
    <div className="flex h-full overflow-hidden">
      <ChatInterface
        onSendMessage={handleSendMessage}
        onExecuteQuery={handleExecuteQuery}
        selectedDialect={selectedDialect}
        currentQuery={currentQuery}
        currentResult={currentResult}
        isLoading={isLoading}
        connectionStatus={connectionStatus}
        inputValue={inputValue}
        setInputValue={setInputValue}
      />
    </div>
  );
}