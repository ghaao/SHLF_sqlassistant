// hooks/useLoading.ts - 간단한 버전

import { useState, useCallback } from "react";
import { LoadingStates, LoadingType } from "@/types/loading";

export const useLoading = () => {
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    generating: false,
    executing: false,
    validating: false,
    commenting: false,
    transforming: false,
    explaining: false
  });

  const [currentLoadingStep, setCurrentLoadingStep] = useState(0);

  const setLoadingState = useCallback((type: LoadingType, loading: boolean) => {
    setLoadingStates(prev => ({ ...prev, [type]: loading }));
    if (loading) {
      setCurrentLoadingStep(0);
      // 간단한 진행률 시뮬레이션
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
    }
  }, []);

  const currentLoadingType = Object.keys(loadingStates).find(
    key => loadingStates[key as LoadingType]
  ) as LoadingType | undefined;

  const isAnyLoading = Object.values(loadingStates).some(Boolean);

  const clearAllLoading = useCallback(() => {
    setLoadingStates({
      generating: false,
      executing: false,
      validating: false,
      commenting: false,
      transforming: false,
      explaining: false
    });
  }, []);

  return {
    loadingStates,
    currentLoadingStep,
    currentLoadingType,
    isAnyLoading,
    setLoadingState,
    clearAllLoading
  };
};