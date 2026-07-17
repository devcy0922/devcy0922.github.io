# DESIGN SYSTEM 명세서 (DESIGN.md)

## 1. Design Intent
- **목적**: 과도한 시각적 기교나 마케팅적 미사여구를 배제하고, 엔지니어링 시스템의 기술적 신뢰도와 구조적 명확성을 보증하는 전문 기술 문서 사이트를 지향한다.
- **방향**: Linear의 밀도 높은 화면 제어, Vercel의 절제된 흑백 대비 및 정돈된 타이포그래피, GitHub Docs의 구조화된 계층감을 유기적으로 결합한다.

## 2. Audience
- **대상**: 시니어 레벨 엔지니어, 인프라 아키텍트, 기술 관리자(CTO/VPE), 테크니컬 리크루터.
- **요구사항**: 화려한 카드 디자인보다 "어떤 문제를 해결했는지", "설계 판단 근거가 무엇인지", "구현된 한계와 범위가 어디까지인지" 등의 기술적 팩트(Fact)를 10초 이내에 스캔하여 검증할 수 있어야 한다.

## 3. Brand Personality
- **차분함 (Calmness)**: 어두운 청회색의 차분한 배경과 균형 잡힌 명도 대비.
- **기술적 신뢰감 (Technical Reliability)**: 마케팅용 단어가 아닌 기술 스펙, 프로토콜, 에러 재시도 루프 등의 구체적 명세 노출.
- **구조적 명확성 (Structural Clarity)**: 모든 콘텐츠의 정돈된 그리드와 아키텍처 다이어그램 최우선 배치.
- **비과장성 (Honest Tone)**: "혁신적인", "차세대" 같은 과장 표현 배제.

## 4. Design Principles
- **Evidence First**: 프로젝트의 명칭보다 사용 언어, 테스트 방법, 지원 프로토콜, 실제 명령어(API) 등의 구현 증거를 최우선 노출한다.
- **Architecture First**: Mermaid 시퀀스/데이터 흐름 다이어그램을 문서 상단에 강제 배치하여 그림 한 장으로 작동 메커니즘을 이해시킨다.
- **Honest Scope**: 프로젝트의 완결 상태(Stable, Prototype, Experimental, Archived)를 명확히 배지로 부착한다.
- **Progressive Disclosure**: 랜딩 페이지는 한 줄의 문제 정의만 담고, 상세한 스택과 의사결정 로그는 상세 페이지에서 전개한다.
- **Readability Over Decoration**: 코드 가독성과 문서 여백을 가장 중요하게 다룬다.

## 5. Visual Direction
- 순수 흑백 계열의 명도 차이를 이용해 경계선을 규정하며, 보라색/파란색의 전체 그라데이션 및 화려한 네온 글로우는 일절 금지한다.
- 카드의 border-radius는 최대 8~12px로 통일하여 단정하고 예리한 느낌을 유지한다.

## 6. Color Tokens
의미 기반 다크/라이트 테마 토큰을 아래 HSL 기반 CSS 변수로 선언하여 활용한다.

### 다크 모드 (Dark Mode)
```css
:root {
  --surface-base: hsl(240, 10%, 4%);             /* 딥 청회색 백그라운드 */
  --surface-raised: hsl(240, 10%, 8%);           /* 카드/컴포넌트 배경 */
  --surface-muted: hsl(240, 6%, 12%);            /* 비활성 또는 딥 그레이 */
  
  --border-default: hsl(240, 6%, 15%);           /* 기본 얇은 보더 */
  --border-strong: hsl(240, 6%, 25%);            /* 강조 보더 */
  
  --text-primary: hsl(0, 0%, 95%);               /* 주 텍스트 */
  --text-secondary: hsl(240, 5%, 70%);           /* 부 텍스트 */
  --text-muted: hsl(240, 5%, 50%);               /* 설명/메타 텍스트 */
  
  --accent-primary: hsl(263, 60%, 50%);          /* 블루 바이올렛 포인트 */
  --accent-soft: rgba(138, 43, 226, 0.1);        /* 포인트 백그라운드 */
  
  --status-stable: hsl(142, 60%, 40%);           /* 그린 */
  --status-experimental: hsl(38, 85%, 45%);       /* 옐로우/오렌지 */
  --status-archived: hsl(0, 0%, 45%);             /* 그레이 */
}
```

### 라이트 모드 (Light Mode)
```css
:root.light {
  --surface-base: hsl(0, 0%, 98%);
  --surface-raised: hsl(0, 0%, 100%);
  --surface-muted: hsl(240, 5%, 93%);
  
  --border-default: hsl(240, 5%, 88%);
  --border-strong: hsl(240, 5%, 75%);
  
  --text-primary: hsl(240, 10%, 4%);
  --text-secondary: hsl(240, 5%, 25%);
  --text-muted: hsl(240, 5%, 45%);
  
  --accent-primary: hsl(263, 70%, 45%);
  --accent-soft: rgba(138, 43, 226, 0.05);
  
  --status-stable: hsl(142, 70%, 35%);
  --status-experimental: hsl(38, 90%, 40%);
  --status-archived: hsl(240, 5%, 45%);
}
```

## 7. Typography
- **본문 폰트**: 시스템 산세리프 (`-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`) 사용.
- **코드 및 숫자**: 모노스페이스 (`Fira Code, Consolas, Monaco, monospace`) 사용.
- **최대 문단 폭**: 가독성을 위해 `720px` ~ `800px`로 제약.
- **줄 간격**: 본문 `1.65` 이상 유지.
- **계층 정의**:
  - Display: 40px (Bold, Hero용)
  - H1: 32px (Bold)
  - H2: 24px (Semi-Bold)
  - H3: 18px (Medium)
  - Body Large: 16px (Regular)
  - Body: 14px (Regular)
  - Caption / Label: 12px (Regular)
  - Code: 13px (Monospace)

## 8. Spacing
- 4px/8px 스케일링 엄격 준수: `4px`, `8px`, `12px`, `16px`, `24px`, `32px`, `48px`, `64px`, `96px`.
- 컴포넌트 여백은 패딩 패널 내부 기준 16px 또는 24px로 고정한다.

## 9. Layout
- **Landing Content Max Width**: 1200px
- **Documentation Content Max Width**: 800px
- **Architecture Diagram Max Width**: 1000px
- **Code Block Max Width**: 1000px
- **브레이크포인트**: Mobile (<768px), Tablet (768px - 1024px), Desktop (>1024px).

## 10. Navigation
- **좌측**: 이름 또는 워드마크 (`devcy0922`)
- **우측**: Projects, About, GitHub(아이콘 링크), 다크/라이트 테마 토글 버튼.
- NGINX와 같은 프록시나 외부 설정에 의존하지 않는 VitePress 기본 CSS 레이아웃 구조 활용.

## 11. Home Page
- **Hero**:
  - Eyebrow: `Multi-tenant SaaS · DevSecOps · AI Platform`
  - H1: `AI SaaS의 요청 경계부터 추론 운영까지 설계합니다.`
  - Description: `인증, 테넌트 격리, 모델 라우팅, 감사 가능성과 보안 회귀 검증을 실제 코드로 구현한 기록입니다.`
  - CTA Buttons: [Explore Projects], [GitHub Profile]
- **Selected Projects**:
  - 상단 대표 프로젝트는 Aegis-LLM, SliceRAG, AgentSecOps Playground 순서로 배치한다.
  - 하단 6개 프로젝트는 2열 컴팩트 카드 또는 리스트 타입으로 분리하여 위계 규정.
- **Engineering Focus**:
  - 기술 나열 대신 역량 단위 요약: `AI Request Routing`, `Security & Policy Enforcement`, `Retrieval Pipeline` 등.

## 12. Project Page
모든 프로젝트 상세 소개 페이지는 아래 15단계 표준 정보 뼈대를 강제 통일 적용한다.
1. 프로젝트 이름
2. 한 문장 설명
3. 상태 배지 및 GitHub 저장소 링크
4. Problem (어떤 비효율/장애를 겪었나)
5. Why I Built It (왜 만들었나)
6. Scope (구현 스코프 범위)
7. Architecture (컴포넌트 구성도 - Mermaid)
8. Request 또는 Data Flow (시퀀스/데이터 흐름 - Mermaid)
9. Key Design Decisions (핵심 기술적 판단)
10. Security Considerations (제로트러스트 관점의 위협 차단 설계)
11. Observability (에러 발생 시 추적 및 로깅 설계)
12. Technology Stack (활용 스택)
13. Running Locally (로컬 실행 명령어 가이드)
14. Current Limitations (현재의 제약 조건)
15. Next Steps (향후 마일스톤)

## 13. Components
아래 컴포넌트는 `custom.css` 에 정의된 의미 토큰을 활용한다.
- `ProjectCard`: 명도 차 보더(1px), hover 시 translateY(-2px) 제약.
- `StatusBadge`: Stable(Green text/bg), Experimental(Orange text/bg), Archived(Gray text/bg).
- `TechTag`: 옅은 그레이 배경에 12px 폰트.
- `DecisionCallout`: 설계 판단을 박스화하여 좌측 3px 보더 표시.
- `SecurityNotice`: 자격증명/보안 경계를 다루는 중요 알림 박스.

## 14. Diagrams
- 노드 수는 최대 12개 이하로 제한하여 한눈에 들어오게 한다.
- 흐름 방향은 좌->우(`LR`) 또는 위->아래(`TB`)로 통일한다.
- 다크 모드 대비 유지를 위해 텍스트 색상 및 노드 채도를 조절한다.

## 15. Code Blocks
- 상단 우측에 복사 버튼 및 언어 라벨 표기.
- 가로 스크롤 허용하여 모바일 뷰에서도 터치 슬라이딩으로 가로 보기 제공.

## 16. Interaction and Motion
- Hover 트랜지션: `all 150ms ease`.
- `prefers-reduced-motion` 미디어 쿼리를 지원하여 스무스 동작을 강제 해제할 수 있게 한다.
- 무한 회전, 반짝이는 네온 배경 애니메이션 금지.

## 17. Responsive Behavior
- 모바일(768px 미만)에서는 카드를 무조건 1열(single column) 배치한다.
- 코드 블록과 Mermaid 다이어그램은 수평 스크롤 오버플로우 처리.

## 18. Accessibility
- 색상만으로 상태를 식별하게 하지 않고, 반드시 텍스트 라벨("Stable" 등)을 명시한다.
- 모든 인터랙티브 포커스 시 `:focus-visible` 아웃라인 스타일(2px dashed primary)을 강제 활성화한다.

## 19. Content Voice
- "혁신적인", "강력한", "차세대" 같은 무분별한 마케팅 형용사를 쓰지 않는다.
- 성능에 관한 주장은 반드시 데이터(예: "평균 지연시간 24% 감소")로 제시하며, 증거 없는 과장 표현은 불허한다.

## 20. Security and Redaction (DLP)
- **절대 노출 금지**: 사설 IP, 사내 도메인, 로컬 절대경로, API Key, JWT 토큰 등.
- 코드 예제는 반드시 `gateway.example.com`, `<api-key>` 와 같은 임의 치환 플레이스홀더를 활용한다.

## 21. VitePress Implementation Rules
- 기본 테마를 그대로 유지 및 확장하고, 별도의 테마 번들을 추가 설치하지 않는다.
- `.vitepress/theme/index.ts` 에서 `Theme` 객체를 가져와 확장하며, CSS 변수는 `custom.css` 에 수록한다.

## 22. Do and Don't
- **Do**: 실제 작동하는 CLI 명령문이나 API 스키마를 보여줄 것. Mermaid 아키텍처 다이어그램을 최상단에 배치할 것.
- **Don't**: README.md의 긴 기능 나열을 그대로 복제할 것. 현혹 목적의 거대한 네온 그라데이션을 사용할 것.

## 23. Definition of Done & Checklist
구현 후 AI 또는 검사 에이전트가 완결성을 체크하기 위한 기준판입니다.
- [ ] docs:build 컴파일 빌드가 100% 오류 없이 완료되는가?
- [ ] index.md 및 9개 프로젝트 마크다운이 누락 없이 생성되었는가?
- [ ] 9개 프로젝트 페이지가 모두 15단계 정보 구조를 정확히 지키고 있는가?
- [ ] 사설 IP나 개인 절대경로가 포함되어 있지 않은가?
- [ ] 모바일 반응형 뷰에서 가로 스크롤로 레이아웃이 터져 나가는 버그가 없는가?
