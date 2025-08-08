/**
 * 'YYYYMMDDHHMISSFFFFFFNNNNNN' 형식의 26자리 로그 ID를 생성합니다.
 * (연월일시분초 + 마이크로초 + 6자리 난수)
 */
export const generateLogId = (): string => {
  const now = new Date();
  
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hours = now.getHours().toString().padStart(2, '0');
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const seconds = now.getSeconds().toString().padStart(2, '0');
  
  const milliseconds = now.getMilliseconds().toString().padStart(3, '0');
  // 마이크로초는 밀리초 뒤에 '000'을 붙여 표현합니다.
  const microseconds = milliseconds + '000';

  // 6자리 난수를 생성합니다.
  const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  return `${year}${month}${day}${hours}${minutes}${seconds}${microseconds}${randomPart}`;
};