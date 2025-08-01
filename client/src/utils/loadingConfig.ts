// utils/loadingConfig.ts

import { Code, FileText, RefreshCw, MessageSquare, Shuffle, Play } from "lucide-react";
import { LoadingConfig, LoadingType } from "@/types/loading";

export const getLoadingConfig = (functionId: string): LoadingConfig => {
  const configs: Record<string, LoadingConfig> = {
    create: {
      icon: Code,
      color: 'text-blue-500',
      message: 'AI가 자연어를 분석하여 SQL 쿼리를 생성하고 있습니다...',
      steps: ['자연어 분석', 'SQL 구조 설계', '쿼리 최적화', '결과 검증'],
      estimatedTime: 8
    },
    explain: {
      icon: FileText,
      color: 'text-red-500',
      message: 'SQL 쿼리를 분석하여 상세한 설명을 생성하고 있습니다...',
      steps: ['쿼리 구문 분석', '실행 계획 해석', '설명 생성', '한국어 번역'],
      estimatedTime: 6
    },
    grammar: {
      icon: RefreshCw,
      color: 'text-orange-500',
      message: 'SQL 문법을 검증하고 오류를 수정하고 있습니다...',
      steps: ['문법 검사', '오류 탐지', '수정 방안 생성', '최종 검증'],
      estimatedTime: 4
    },
    comment: {
      icon: MessageSquare,
      color: 'text-purple-500',
      message: 'SQL 쿼리에 의미있는 주석을 추가하고 있습니다...',
      steps: ['코드 분석', '로직 이해', '주석 생성', '가독성 검토'],
      estimatedTime: 5
    },
    transform: {
      icon: Shuffle,
      color: 'text-green-500',
      message: 'SQL 구조를 분석하여 최적화된 형태로 변환하고 있습니다...',
      steps: ['구조 분석', '최적화 방안 탐색', '변환 실행', '성능 검증'],
      estimatedTime: 7
    },
    executing: {
      icon: Play,
      color: 'text-indigo-500',
      message: '데이터베이스에서 쿼리를 실행하고 있습니다...',
      steps: ['연결 확인', '쿼리 실행', '결과 수집', '데이터 포맷팅'],
      estimatedTime: 3
    }
  };
  
  return configs[functionId] || configs.create;
};

export const getLoadingTypeByFunction = (functionId: string): LoadingType => {
  const mapping: Record<string, LoadingType> = {
    create: 'generating',
    explain: 'explaining',
    grammar: 'validating',
    comment: 'commenting',
    transform: 'transforming',
    execute: 'executing'
  };
  return mapping[functionId] || 'generating';
};

export const getFunctionByLoadingType = (loadingType: LoadingType): string => {
  const mapping: Record<LoadingType, string> = {
    generating: 'create',
    explaining: 'explain',
    validating: 'grammar',
    commenting: 'comment',
    transforming: 'transform',
    executing: 'execute'
  };
  return mapping[loadingType] || 'create';
};