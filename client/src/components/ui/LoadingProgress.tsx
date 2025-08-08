import React from "react";
import { CheckCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
// utils 폴더에 있는 올바른 getLoadingConfig 함수를 import 합니다.
import { getLoadingConfig } from "@/utils/loadingConfig";

interface LoadingProgressProps {
  functionId: string;
  currentStep?: number;
  estimatedTime?: number;
  onCancel?: () => void;
}

const LoadingProgress: React.FC<LoadingProgressProps> = ({ 
  functionId, 
  currentStep = 0,
  estimatedTime,
  onCancel 
}) => {
  const config = getLoadingConfig(functionId);
  const Icon = config.icon;
  const progress = Math.min(((currentStep + 1) / config.steps.length) * 100, 100);
  const timeToDisplay = estimatedTime || config.estimatedTime;
  
  return (
    <div className="bg-card border border-border rounded-lg p-4 max-w-lg animate-in slide-in-from-left-2 duration-300">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Icon className={`w-5 h-5 ${config.color} animate-pulse`} />
          <span className="text-sm font-medium">SQL Assistant</span>
          <Badge variant="secondary" className="text-xs">
            {config.steps[currentStep] || '처리 중'}
          </Badge>
        </div>
        
        {onCancel && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onCancel}
            className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
      
      {/* 진행률 바 */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-muted-foreground mb-1">
          <span>진행률</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
          <div 
            className="bg-primary rounded-full h-2 transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
          >
            {/* 진행률 바 애니메이션 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </div>
        </div>
      </div>
      
      {/* 현재 단계 및 메시지 */}
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {config.message}
        </p>
        
        {/* 단계별 체크리스트 */}
        <div className="space-y-2">
          {config.steps.map((step, index) => (
            <div 
              key={index} 
              className="flex items-center space-x-2 text-xs transition-all duration-300"
            >
              {index < currentStep ? (
                <CheckCircle className="w-3 h-3 text-green-500 animate-in zoom-in duration-200" />
              ) : index === currentStep ? (
                <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              ) : (
                <div className="w-3 h-3 border border-muted-foreground/30 rounded-full" />
              )}
              <span 
                className={`transition-colors duration-200 ${
                  index < currentStep 
                    ? 'text-foreground font-medium' 
                    : index === currentStep 
                      ? 'text-foreground' 
                      : 'text-muted-foreground'
                }`}
              >
                {step}
              </span>
            </div>
          ))}
        </div>
        
        {/* 예상 완료 시간 */}
        <div className="flex items-center space-x-1 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <Clock className="w-3 h-3" />
          <span>예상 완료: 약 {timeToDisplay}초</span>
        </div>
      </div>
    </div>
  );
};

export default LoadingProgress;