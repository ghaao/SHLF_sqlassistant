// components/chat/chat-interface.tsx - 최소한의 수정

import { useState, useRef, useEffect } from "react";
import { Bot, Code, RefreshCw, MessageSquare, FileText, Shuffle } from "lucide-react";
import MessageBubble from "./message-bubble";
import InputArea from "./input-area";
import LoadingProgress from "@/components/ui/LoadingProgress"; // 추가
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SQLGenerationResponse, QueryExecutionResponse } from "@shared/schema";

// 기존 인터페이스와 AI_FUNCTIONS는 그대로 유지...
interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sqlResponse?: SQLGenerationResponse;
  queryResult?: QueryExecutionResponse;
  functionType?: 'create' | 'transform' | 'comment' | 'grammar' | 'explain';
}

interface ChatInterfaceProps {
  onSendMessage: (message: string, functionType?: string) => void;
  onExecuteQuery: (sqlQuery: string) => void;
  selectedDialect: string;
  currentQuery?: SQLGenerationResponse | null;
  currentResult?: QueryExecutionResponse | null;
  isLoading: boolean;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  inputValue: string;
  setInputValue: (value: string) => void;
}

const AI_FUNCTIONS = [
  {
    id: 'create',
    name: 'SQL 생성',
    description: '자연어를 SQL 쿼리로 변환',
    icon: Code,
    color: 'bg-blue-500',
    examples: [
      "지난 주 GA채널의 신계약 건수를 추출해줘.",
      "계약 상태가 A(정상)이 5개 이상인 고객을 추출해줘.",
      "상품별 2025년 매출을 분석해줘."
    ]
  },
  {
    id: 'transform',
    name: 'SQL 변환',
    description: 'SQL 구조 변환',
    icon: Shuffle,
    color: 'bg-green-500',
    examples: [
      "SELECT * FROM users WHERE id IN (SELECT user_id FROM orders) 이 쿼리를 JOIN으로 변환해줘",
      "이 쿼리의 서브쿼리를 CTE로 변환해줘"
    ]
  },
  {
    id: 'comment',
    name: 'SQL 주석',
    description: 'SQL 쿼리에 주석 추가',
    icon: MessageSquare,
    color: 'bg-purple-500',
    examples: [
      "SELECT u.name, COUNT(o.id) FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id",
      "이 쿼리에 한국어 주석을 추가해주세요"
    ]
  },
  {
    id: 'grammar',
    name: 'SQL 문법 검증',
    description: 'SQL 문법 오류 검사 및 수정',
    icon: RefreshCw,
    color: 'bg-orange-500',
    examples: [
      "SELECT name FROM user WHERE id = 1 AND status 'active'",
      "이 쿼리의 문법 오류를 찾아서 수정해주세요"
    ]
  },
  {
    id: 'explain',
    name: 'SQL 설명',
    description: 'SQL 쿼리 동작 원리 설명',
    icon: FileText,
    color: 'bg-red-500',
    examples: [
      "SELECT u.*, COUNT(o.id) as order_count FROM users u LEFT JOIN orders o ON u.id = o.user_id GROUP BY u.id HAVING COUNT(o.id) > 5",
      "이 쿼리가 어떻게 동작하는지 단계별로 설명해주세요"
    ]
  }
];

export default function ChatInterface({
  onSendMessage,
  onExecuteQuery,
  selectedDialect,
  currentQuery,
  currentResult,
  isLoading,
  connectionStatus,
  inputValue,
  setInputValue,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [executedQueries, setExecutedQueries] = useState<Map<string, QueryExecutionResponse>>(new Map());
  const [selectedFunction, setSelectedFunction] = useState<string>('create'); // 기본값 변경
  const [showFunctionSelector, setShowFunctionSelector] = useState(true);
  
  // 간단한 로딩 단계 상태 추가
  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 로딩 시작 시 진행률 시뮬레이션
  useEffect(() => {
    if (isLoading) {
      setCurrentLoadingStep(0);
      const interval = setInterval(() => {
        setCurrentLoadingStep(prev => {
          const next = prev + 1;
          if (next >= 3) {
            clearInterval(interval);
            return 3;
          }
          return next;
        });
      }, 2000);
      
      return () => clearInterval(interval);
    }
  }, [isLoading]);

  // 기존 useEffect들은 그대로 유지...
  useEffect(() => {
    if (currentQuery && !isLoading) {
      const hasExistingMessage = messages.some(msg => 
        msg.sqlResponse?.sqlQuery === currentQuery.sqlQuery
      );
      
      if (!hasExistingMessage) {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          type: 'assistant',
          content: `요청하신 SQL 쿼리를 생성했습니다. 실행하려면 "Run Query" 버튼을 클릭하세요.`,
          timestamp: new Date(),
          sqlResponse: currentQuery,
          functionType: selectedFunction as any,
        };
        
        setMessages(prev => [...prev, assistantMessage]);
      }
    }
  }, [currentQuery, isLoading, messages, selectedFunction]);

  useEffect(() => {
    if (currentResult && currentQuery) {
      setExecutedQueries(prev => {
        const newMap = new Map(prev);
        newMap.set(currentQuery.sqlQuery, currentResult);
        return newMap;
      });
    }
  }, [currentResult, currentQuery]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // 기능 선택 확인
    if (!selectedFunction) {
      alert('기능을 먼저 선택해주세요.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputValue,
      timestamp: new Date(),
      functionType: selectedFunction as any,
    };

    setMessages(prev => [...prev, userMessage]);
    onSendMessage(inputValue, selectedFunction);
    setShowFunctionSelector(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSendMessage();
    }
  };

  const handleExampleClick = (example: string, functionType: string) => {
    if (isLoading) return;
    setSelectedFunction(functionType);
    setInputValue(example);
  };

  const currentFunction = AI_FUNCTIONS.find(f => f.id === selectedFunction);

  return (
    <div className="flex-1 flex flex-col h-full min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6 min-h-0">
        {/* 기존 웰컴 메시지는 그대로... */}
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            {/* 기존 웰컴 코드 그대로 유지 */}
          </div>
        )}

        {messages.map((message, index) => (
          <MessageBubble
            key={message.id}
            message={message}
            onExecuteQuery={onExecuteQuery}
            selectedDialect={selectedDialect}
            queryResult={
              message.sqlResponse 
                ? executedQueries.get(message.sqlResponse.sqlQuery)
                : undefined
            }
          />
        ))}

        {/* 개선된 로딩 UI - 기존 로딩 블록을 교체 */}
        {isLoading && (
          <div className="flex justify-start">
            <LoadingProgress 
              functionId={selectedFunction}
              currentStep={currentLoadingStep}
            />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 기존 Input Area는 그대로... */}
      <div className="border-t border-border bg-card p-3 md:p-4">
        {!showFunctionSelector && (
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
                      onClick={() => !isLoading && setSelectedFunction(func.id)}
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
        )}
        
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSendMessage}
          onKeyPress={handleKeyPress}
          isLoading={isLoading}
          selectedDialect={selectedDialect}
          selectedFunction={currentFunction?.name}
        />
      </div>
    </div>
  );
}