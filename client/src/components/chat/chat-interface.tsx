import { useState, useRef, useEffect } from "react";
import MessageBubble from "./message-bubble";
import InputArea from "./input-area";
import LoadingProgress from "@/components/ui/LoadingProgress";
import { Button } from "@/components/ui/button";
import { AI_FUNCTIONS, FunctionId, FunctionName } from "@/types/functions";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  functionType?: FunctionId;
}

// 컴포넌트 Props 정의
interface ChatInterfaceProps {
  messages: Message[];
  onSendMessage: (message: string, functionType?: FunctionId) => void;
  onFunctionChange: () => void;
  isLoading: boolean;
  inputValue: string;
  setInputValue: (value: string) => void;
}

// --- Function Selector Component ---
// 기능 선택 카드를 위한 별도 컴포넌트를 내부에 만듦.
const FunctionSelector = ({ onSelect }: { onSelect: (id: FunctionId) => void }) => (
  <div className="flex flex-col items-center justify-center h-full p-4">
    <div className="text-center mb-8">
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
        SQL Assistant
      </h1>
      <p className="mt-2 text-md text-muted-foreground">
        수행하고 싶은 작업을 선택해주세요.
      </p>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full max-w-4xl">
      {AI_FUNCTIONS.map((func) => {
        const Icon = func.icon;
        return (
          <button
            key={func.id}
            onClick={() => onSelect(func.id)}
            className="p-6 text-left border rounded-lg hover:bg-muted/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <div className="flex items-center mb-2">
              <div className={`p-2 rounded-md mr-4 ${func.color}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{func.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{func.description}</p>
          </button>
        );
      })}
    </div>
  </div>
);

export default function ChatInterface({
  messages,
  onSendMessage,
  onFunctionChange,
  isLoading,
  inputValue,
  setInputValue,
}: ChatInterfaceProps) {

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [selectedFunction, setSelectedFunction] = useState<FunctionId | null>(null);

  // 새로운 함수를 선택했을 때 처리하는 함수
  const handleFunctionSelect = (id: FunctionId) => {
    setSelectedFunction(id);
    onFunctionChange(); // 부모 컴포넌트에 상태 리셋을 알림
  };

  // 간단한 로딩 단계 상태 추가
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // messages 배열이 변경될 때마다 스크롤을 맨 아래로 이동
  useEffect(scrollToBottom, [messages]);

  // 로딩 시작 시 진행률 시뮬레이션
  useEffect(() => {
    if (isLoading) {
      setCurrentLoadingStep(0);
      const interval = setInterval(() => {
        setCurrentLoadingStep(prev => (prev >= 3 ? 3 : prev + 1));
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  const handleSendMessage = () => {
    if (!inputValue.trim() || isLoading || !selectedFunction) return;
    
    // 부모에게 메시지 전송을 위임
    onSendMessage(inputValue, selectedFunction);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage();
    }
  };

  // 현재 선택된 기능의 상세 정보를 가져옵니다.
  const currentFunction = AI_FUNCTIONS.find(f => f.id === selectedFunction);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-background">
      {!selectedFunction ? (
        // handleFunctionSelect를 사용하도록 변경
        <FunctionSelector onSelect={handleFunctionSelect} />
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 min-h-0">
            {messages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
              />
            ))}
            
            {isLoading && selectedFunction && (
              <LoadingProgress 
                functionId={selectedFunction} 
                currentStep={currentLoadingStep} 
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-border bg-card p-3 md:p-4">
            {/* 기능 변경 버튼들 */}
            <div className="mb-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium">기능:</span>
                <div className="flex flex-wrap gap-2">
                  {AI_FUNCTIONS.map((func) => {
                    const Icon = func.icon;
                    return (
                      <Button
                        key={func.id}
                        variant={selectedFunction === func.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => !isLoading && handleFunctionSelect(func.id)}
                        disabled={isLoading}
                        className="text-xs"
                      >
                        <Icon className="w-3 h-3 mr-1" />
                        {func.name}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            <InputArea
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              onKeyPress={handleKeyPress}
              isLoading={isLoading}
              selectedFunction={currentFunction?.name}
            />
          </div>
        </>
      )}
    </div>
  );
}