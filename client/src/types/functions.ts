/* 타입과 상수를 한 곳에서 관리 */
import { Code, Shuffle, MessageSquare, RefreshCw, FileText } from "lucide-react";

export const AI_FUNCTIONS = [
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
] as const;

// 상수를 기반으로 타입을 자동으로 생성
export type FunctionId = (typeof AI_FUNCTIONS)[number]['id'];
export type FunctionName = (typeof AI_FUNCTIONS)[number]['name'];