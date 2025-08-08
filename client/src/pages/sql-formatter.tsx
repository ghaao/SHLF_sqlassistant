import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Copy, Wand2, Trash2, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const SAMPLE_SQL = `SELECT u.user_id, u.user_name, COUNT(o.order_id) as order_count, SUM(o.total_amount) as total_spent FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE u.created_date >= DATE '2023-01-01' AND u.status = 'ACTIVE' GROUP BY u.user_id, u.user_name HAVING COUNT(o.order_id) > 0 ORDER BY total_spent DESC FETCH FIRST 10 ROWS ONLY;`;

// SQL 키워드 하이라이팅 컴포넌트
const SQLSyntaxHighlighter = ({ sql }: { sql: string }) => {
  // 'AS'를 keywords 배열에서 분리
  const keywords = [
    'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT',
    'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP', 'TRUNCATE',
    'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN',
    'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'IS', 'NULL',
    'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'ON'
    // 'AS'는 여기서 제거
  ];
  const functions = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'DATE'];
  const aliasKeyword = 'AS'; // 'AS' 키워드를 별도로 관리

  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi');
  const functionRegex = new RegExp(`\\b(${functions.join('|')})\\b`, 'gi');
  const aliasRegex = new RegExp(`\\b(${aliasKeyword})\\b`, 'gi'); // 'AS'를 위한 정규식

  const highlight = (text: string) => {
    // HTML 특수문자를 치환하여 XSS 공격 방지
    const escapedText = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    return escapedText
      .replace(keywordRegex, '<span class="text-blue-500 font-bold">$1</span>')
      .replace(functionRegex, '<span class="text-purple-500">$1</span>')
      // [추가] 'AS' 키워드를 다른 색상(녹색 계열)으로 강조
      .replace(aliasRegex, '<span class="text-green-600 font-bold">$1</span>');
  };

  return (
    <pre
      className="font-mono text-sm whitespace-pre-wrap overflow-auto"
      dangerouslySetInnerHTML={{ __html: highlight(sql) }}
    />
  );
};

export default function SQLFormatterPage() {
  const [inputSQL, setInputSQL] = useState<string>("");
  const [formattedSQL, setFormattedSQL] = useState<string>("");
  const [isFormatting, setIsFormatting] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const { toast } = useToast();

  const handleFormatSQL = async () => {
    if (!inputSQL.trim()) {
      toast({
        title: "오류",
        description: "포맷팅할 SQL을 입력해주세요.",
        variant: "destructive",
      });
      return;
    }

    setIsFormatting(true);
    try {
      const response = await fetch('/api/format-sql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: inputSQL }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || '알 수 없는 오류가 발생했습니다.');
      }
      setFormattedSQL(result.formattedSql);
      toast({
        title: "성공",
        description: "SQL 포맷팅이 완료되었습니다.",
      });
    } catch (error: any) {
      setFormattedSQL("");
      toast({
        title: "포맷팅 실패",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsFormatting(false);
    }
  };

  const handleCopy = () => {
    if (!formattedSQL) return;
    navigator.clipboard.writeText(formattedSQL);
    setIsCopied(true);
    toast({
      title: "복사 완료",
      description: "포맷팅된 SQL이 클립보드에 복사되었습니다.",
    });
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleClear = () => {
    setInputSQL("");
    setFormattedSQL("");
  };

  const loadSample = () => {
    setInputSQL(SAMPLE_SQL);
  };

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">SQL Formatter</h1>
          <p className="text-muted-foreground">
            SQL을 당사 표준에 맞는 스타일로 변환합니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 원본 SQL 카드 (1/3 차지) */}
          <Card className="md:col-span-1">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>원본 SQL</CardTitle>
                <Button variant="outline" size="sm" onClick={loadSample}>샘플 불러오기</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="여기에 SQL을 붙여넣으세요..."
                value={inputSQL}
                onChange={(e) => setInputSQL(e.target.value)}
                className="font-mono text-sm min-h-[500px] resize-none"
              />
            </CardContent>
          </Card>

          {/* 포맷팅된 SQL 카드 (2/3 차지) */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>포맷팅된 SQL</CardTitle>
                <div className="flex items-center space-x-2">
                  <Button onClick={handleFormatSQL} disabled={isFormatting}>
                    <Wand2 className="w-4 h-4 mr-2" />
                    {isFormatting ? "포맷팅 중..." : "실행"}
                  </Button>
                  <Button variant="secondary" onClick={handleCopy} disabled={!formattedSQL}>
                    {isCopied ? <Check className="w-4 h-4 mr-2" /> : <Copy className="w-4 h-4 mr-2" />}
                    복사
                  </Button>
                  <Button variant="ghost" onClick={handleClear}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    초기화
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted rounded-md p-4 min-h-[500px]">
                {formattedSQL ? (
                  <SQLSyntaxHighlighter sql={formattedSQL} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    결과가 여기에 표시됩니다.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}