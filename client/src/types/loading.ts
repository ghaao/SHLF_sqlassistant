// types/loading.ts - 간단한 버전

export interface LoadingStates {
  generating: boolean;
  executing: boolean;
  validating: boolean;
  commenting: boolean;
  transforming: boolean;
  explaining: boolean;
}

export type LoadingType = keyof LoadingStates;