# -------------------------
# Stage 1: Build Stage
# -------------------------
FROM node:20 AS builder

# Java Runtime Environment (JRE) 설치
RUN apt-get update && \
    apt-get install -y openjdk-17-jdk locales && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen && \
    rm -rf /var/lib/apt/lists/*

# 컨테이너 환경 변수 설정
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /usr/src/app
COPY . .

# Java 소스 폴더로 이동하여 컴파일 진행
WORKDIR /usr/src/app/java
RUN javac -encoding UTF-8 -cp "SQLinForm_API.jar" FormatterWrapper.java

RUN npm install
RUN npm run build

# -------------------------
# Stage 2: Production Stage
# -------------------------
FROM node:20-slim

# Java Runtime Environment (JRE) 설치
RUN apt-get update && \
    apt-get install -y openjdk-17-jre-headless locales && \
    sed -i -e 's/# en_US.UTF-8 UTF-8/en_US.UTF-8 UTF-8/' /etc/locale.gen && \
    locale-gen && \
    rm -rf /var/lib/apt/lists/*

# 컨테이너 환경 변수 설정
ENV LANG en_US.UTF-8
ENV LANGUAGE en_US:en
ENV LC_ALL en_US.UTF-8

WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY drizzle.config.ts ./
COPY shared ./shared

# entrypoint.sh 스크립트 복사 및 실행 권한 부여
COPY entrypoint.sh .
RUN chmod +x ./entrypoint.sh

# 컴파일된 Java 클래스와 jar 라이브러리를 복사합니다.
COPY --from=builder /usr/src/app/java ./java

EXPOSE 5000

# 컨테이너 시작 시 entrypoint.sh를 실행하도록 변경
ENTRYPOINT ["./entrypoint.sh"]

# entrypoint.sh 스크립트가 끝나고 실행될 기본 명령어
CMD ["npm", "start"]