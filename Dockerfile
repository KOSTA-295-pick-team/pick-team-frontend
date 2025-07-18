# 정적 파일 서빙용 nginx 사용
FROM nginx:alpine

# 빌드 결과물을 nginx 기본 경로로 복사
COPY ./dist /usr/share/nginx/html

# nginx 설정 파일 복사
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

# 80포트 오픈
EXPOSE 80

# 기본 엔트리포인트는 nginx 사용