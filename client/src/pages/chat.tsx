import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat/chat-interface";
import { useWebSocket } from "@/hooks/useWebSocket";
import { FunctionId } from "@/types/functions";
import { AlertTriangle } from "lucide-react";


const ErrorOverlay = ({ message, onConfirm }: { message: string; onConfirm: () => void; }) => (
  <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-300">
    <div className="bg-card border border-destructive/20 rounded-lg shadow-xl max-w-md text-center p-6 m-4">
      
      {/* 아이콘 */}
      <div className="mx-auto mb-4 h-12 w-12 flex items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-6 w-6 text-destructive" />
      </div>
      
      {/* 메시지 */}
      <h2 className="text-xl font-bold text-foreground mb-2">오류가 발생했습니다</h2>
      <p className="text-sm text-muted-foreground mb-6 whitespace-pre-wrap">
        {/* 상세 오류 메시지를 보여줍니다. */}
        {message}
      </p>
      
      {/* 버튼 */}
      <button
        onClick={onConfirm}
        className="w-full bg-primary text-primary-foreground h-10 px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
      >
        페이지 새로고침
      </button>

    </div>
  </div>
);

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string; // 일반 텍스트 답변을 위해 이 필드를 활용
  timestamp: Date;
  functionType?: FunctionId;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // 대화 상태 관리를 위한 state
  const [cvrsId, setCvrsId] = useState<string | null>(null);
  const [cvrsSeq, setCvrsSeq] = useState(0);

  // useWebSocket 훅에서 connect 함수를 가져옴
  const { sendMessage, lastMessage, connectionStatus, connect } = useWebSocket();

  const handleSendMessage = (message: string, functionType?: FunctionId) => {
    if (!message.trim() || !functionType) return;

    // 1. 사용자 메시지를 먼저 화면에 추가
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      type: 'user',
      content: message,
      timestamp: new Date(),
      functionType: functionType,
    };
    setMessages(prev => [...prev, userMessage]);

    // 2. 로딩 상태 활성화 및 입력창 비우기
    setIsLoading(true);
    setInputValue(""); // 입력창 비우기

    // 3. 백엔드로 WebSocket 메시지 전송
    sendMessage({
      type: 'generate_sql',
      mode: functionType,
      payload: {
        naturalLanguage: message,
        dialect: "oracle", // 예시 dialect
        cvrsId: cvrsId,
        cvrsSeq: cvrsSeq,
      },
      requestId: `req_${Date.now()}`,
    });
  };

  // Handle WebSocket messages with improved error handling
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        console.log('WebSocket message received:', data.type, data.requestId);
        
        switch (data.type) {
          case 'ai_response':
            const assistantMessage: Message = {
              id: data.requestId || Date.now().toString(),
              type: 'assistant',
              content: data.payload.responseText, // 서버가 보낸 텍스트를 content에 저장
              timestamp: new Date(),
              functionType: data.payload.mode,
            };
            
            setMessages(prev => [...prev, assistantMessage]);
            // 백엔드로부터 받은 값으로 대화 상태 업데이트
            setCvrsId(data.payload.cvrsId);
            setCvrsSeq(data.payload.cvrsSeq);

            setIsLoading(false);
            break;
            
          case 'error':
            console.error('WebSocket error:', data.message, data.requestId);
            setIsLoading(false);

            setErrorMessage(data.message || '알 수 없는 오류가 발생했습니다.');
            break;
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        setIsLoading(false);
        setErrorMessage('서버로부터 받은 메시지를 처리할 수 없습니다.');
      }
    }
  }, [lastMessage]);

  // Connection status monitoring
  useEffect(() => { connect(); }, [connect]);

  return (
    <div className="flex h-full overflow-hidden relative">
      {/* errorMessage가 있을 때만 ErrorOverlay를 렌더링 */}
      {errorMessage && (
        <ErrorOverlay 
          message={errorMessage} 
          onConfirm={() => window.location.reload()} 
        />
      )}

      <ChatInterface
        messages={messages} // 수정된 messages를 props로 전달
        onSendMessage={handleSendMessage}
        isLoading={isLoading}
        inputValue={inputValue}
        setInputValue={setInputValue}
        // 대화 상태 리셋을 위한 콜백 함수 전달
        onFunctionChange={() => {
          setCvrsId(null);
          setCvrsSeq(0);
          setMessages([]); // 새 기능 선택 시 기존 메시지 초기화
        }}
      />
    </div>
  );
}