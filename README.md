디렉토리 구조

src/
├── features/                 		# ✨ 주요 기능 모듈
│   ├── auth/                 	# 1. 인증 및 사용자 관련 기능
│   │   ├── core/               #    - 로그인, 회원가입 등 핵심 인증
│   │   ├── mypage/             #    - 마이페이지(프로필 수정, 비밀번호 변경)
│   │   └── notification/       #    - 알림
│   ├── workspace/           	# 2. 워크스페이스 (생성, 참여, 사이드바)
│   │  ├── chat/             	#    - 채팅 기능
│   │  └── video/            	#    - 화상회의 기능
│   └── teamspace/            	# 4. 팀스페이스 (팀의 핵심 협업 공간)
│       ├── core/            		#    - 팀스페이스 공통 (페이지, 사이드바)
│       ├── team/         		#    - 팀 관리 기능
│       ├── announcement/     	#    - 공지사항 기능
│       ├── bulletin/         	#    - 게시판 기능
│       ├── kanban/           	#    - 칸반보드 기능
│       └── schedule/         	#    - 캘린더 기능
│
├── components/               	# 💡 여러 기능에서 재사용되는 공통 컴포넌트
│   ├── ui/                   		#    - Button, Input 등 순수 UI 요소
│   ├── complex/              	#    - 여러 UI 컴포넌트의 조합으로 만들어진 복합 컴포넌트
│   └── modals/               	#    - 전역적으로 사용되는 모달 컴포넌트
│
├── layout/                   	#  전체 레이아웃
│
├── lib/                      		# ⚙️ Axios 인스턴스 등 전역 라이브러리/설정
├── store/                    		# 📦 Redux 스토어 설정
├── hooks/                    		# 🎣 전역 커스텀 훅
├── types/                    		# 📝 전역 타입
├── assets/                   	# 🖼️ 이미지, 폰트 등 정적 에셋
├── App.tsx                   	# 🏠 애플리케이션 최상위 컴포넌트
├── Router.tsx                	# 🗺️ 클라이언트 사이드 라우팅 설정
└── index.tsx                 	# 🚀 애플리케이션 진입점
