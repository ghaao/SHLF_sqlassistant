import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Paperclip, Code, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FunctionName } from "@/types/functions";

const placeholders = {
  'SQL 생성': '자연어로 원하는 SQL을 설명해주세요 (예: "지난 주 주문 데이터를 조회해줘")',
  'SQL 설명': '설명이 필요한 SQL 쿼리를 입력해주세요',
  'SQL 문법 검증': '문법 검증이 필요한 SQL 쿼리를 입력해주세요',
  'SQL 주석': '주석을 추가할 SQL 쿼리를 입력해주세요',
  'SQL 변환': '변환할 SQL 쿼리를 입력해주세요'
};

interface InputAreaProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onKeyPress: (e: React.KeyboardEvent) => void;
  isLoading: boolean;
  selectedFunction?: FunctionName;
}

export default function InputArea({
  value,
  onChange,
  onSend,
  onKeyPress,
  isLoading,
  selectedFunction,
}: InputAreaProps) {
  
  const getPlaceholderText = () => {
    if (isLoading) {
      return "AI 처리 중입니다. 잠시만 기다려주세요...";
    }
    
    if (!selectedFunction) {
      return "먼저 위에서 기능을 선택해주세요";
    }
    
    // FunctionName 타입이므로 안전하게 조회 가능합니다.
    return placeholders[selectedFunction] || `${selectedFunction} 요청을 입력하세요...`;
  };

  const canSend = value.trim() && !isLoading && selectedFunction;

  return (
    <div className="space-y-3">
      {/* 기능 미선택 경고 */}
      {!selectedFunction && (
        <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-700 dark:text-orange-400">
            먼저 위에서 원하는 기능을 선택해주세요.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-end space-x-2 md:space-x-4">
        <div className="flex-1">
          <div className="relative">
            <Textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={onKeyPress}
              className={`pr-12 resize-none text-sm md:text-base transition-all duration-200 ${
                isLoading ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                !selectedFunction ? 'border-orange-300 bg-orange-50/50' : ''
              }`}
              rows={3}
              placeholder={getPlaceholderText()}
              disabled={isLoading || !selectedFunction}
            />
            <Button
              onClick={onSend}
              disabled={!canSend}
              size="sm"
              className={`absolute right-2 bottom-2 transition-all duration-200 ${
                canSend 
                  ? 'opacity-100 transform scale-100' 
                  : 'opacity-50 transform scale-90'
              }`}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
      
      {/* 하단 정보 및 버튼 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2 md:space-x-4">
          {selectedFunction && (
            <div className="text-xs text-muted-foreground">
              현재 기능: <span className="font-medium text-foreground">{selectedFunction}</span>
            </div>
          )}          
        </div>
        
        <div className="flex items-center space-x-4">
          {/* 키보드 단축키 안내 */}
          <div className="text-xs text-muted-foreground hidden md:block">
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Ctrl</kbd> + 
            <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] ml-1">Enter</kbd>
            <span className="ml-1">전송</span>
          </div>
        </div>
      </div>
      
      {/* 문자 수 제한 표시 */}
      {value.length > 0 && (
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <span>
            {value.length > 1500 ? (
              <span className="text-orange-600">
                입력이 너무 깁니다 ({value.length}/1500자)
              </span>
            ) : (
              <span>{value.length}/1500자</span>
            )}
          </span>
          {isLoading && (
            <span className="text-primary animate-pulse">
              처리 중...
            </span>
          )}
        </div>
      )}
    </div>
  );
}