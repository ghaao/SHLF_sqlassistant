import { Bot } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sqlResponse?: any;
  queryResult?: any;
}

interface MessageBubbleProps {
  message: Message;
}

export default function MessageBubble({ message }: MessageBubbleProps) {
  // 사용자 메세지
  if (message.type === 'user') {
    return (
      <div className="flex justify-end">
        <div className="bg-primary text-primary-foreground rounded-lg px-4 py-3 max-w-md">
          <p className="text-sm">{message.content}</p>
        </div>
      </div>
    );
  }

  // AI Assistant 메세지 렌더링 로직
  return (
    <div className="flex justify-start">
      <Card className="max-w-4xl">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Bot className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">SQL Assistant</span>
          </div>
          
          <div className="space-y-4">
            {/* message.content를 항상 먼저 표시 (중복 제거) */}
            {/* AI가 보낸 줄바꿈과 공백을 그대로 렌더링하기 위해 whitespace-pre-wrap 사용 */}
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
