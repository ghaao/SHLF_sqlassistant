// client/src/types/loading.ts

import { LucideIcon } from "lucide-react";

// 1. LoadingType을 정의합니다.
export type LoadingType = 
  | 'generating' 
  | 'explaining' 
  | 'validating' 
  | 'commenting' 
  | 'transforming' 
  | 'executing';

// 2. LoadingConfig 인터페이스를 정의합니다.
export interface LoadingConfig {
  icon: LucideIcon;
  color: string;
  message: string;
  steps: string[];
  estimatedTime: number;
}

export type LoadingStates = Record<LoadingType, boolean>;