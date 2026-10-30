<script setup>
import { data as posts } from '../../posts.data.js'

const selectedWorks = [
  {
    id: 'govail-gateway',
    role: 'Model Gateway & Access Control',
    title: 'GoVail Gateway',
    lead: 'AI 요청의 인증, 접근 정책, 감사 원장과 모델 전달 책임을 한 경계에서 다루는 OpenAI 호환 게이트웨이',
    problem: '애플리케이션마다 흩어진 모델 권한, Upstream 장애 처리, 무분별한 API 키 노출로 인해 보안과 사용량 제어가 불가능해지는 문제를 겪었습니다.',
    decision: '"Agent owns workflow, Application owns tools, Gateway owns governed execution." 게이트웨이가 프롬프트나 워크플로우를 대신 소유하지 않고, 오직 인증·인가·DLP 마스킹·토큰 예산·감사 메타데이터라는 실행 통제에만 집중하도록 경계를 분리했습니다.',
    status: '운영 중',
    href: '/projects/govail-gateway',
    liveUrl: '/playground',
    liveText: '라이브 모델 콘솔',
  },
  {
    id: 'ai-service-infra',
    role: 'Inference & Observability Platform',
    title: 'AI Service Infra',
    lead: '로컬 GPU/CPU 분산 추론 환경과 모델 슬롯 라우팅, 장기 워크플로우 및 전사 관측성을 통합 관리하는 서비스 플랫폼',
    problem: '애플리케이션이 추론 엔드포인트에 직접 접근하면 모델의 일시 장애가 서비스 전체 장애로 번지고, 비즈니스 워크플로우와 LLM 호출 추적이 뒤섞여 원인 파악이 지연됩니다.',
    decision: '논리적 모델 슬롯(govail/worker 등)과 물리 인프라를 분리하고, 무제한 재시도 대신 Fail-fast와 Fallback을 호출 계약으로 강제했습니다. 장기 상태(Temporal), 호출 추적(Langfuse), 시스템 메트릭(Prometheus/Loki)의 수명을 각각 독립 레이어로 격리했습니다.',
    status: '운영 중',
    href: '/projects/ai-service-infra',
  },
  {
    id: 'ai-data-infra',
    role: 'Shared Data Platform',
    title: 'AI Data Infra',
    lead: '여러 서비스가 공유하는 RDBMS, 캐시, 메시지 브로커와 저빈도 스케줄러의 수명 및 운영 책임을 명시적으로 분리한 데이터 계층',
    problem: '서비스마다 데이터베이스와 큐를 따로 띄우면 운영 비용이 폭증하고, 반대로 공용 계층이 비즈니스 트랜잭션까지 소유하면 장애 영향 범위가 걷잡을 수 없이 커집니다.',
    decision: '공용 데이터 인프라(PostgreSQL 16, Redis 7, Kafka KRaft, Dagu)는 인프라 생명주기와 배치 스케줄러까지만 책임지고, 애플리케이션 트랜잭션과 고빈도 이벤트 처리는 상위 서비스의 책임으로 엄격히 한정했습니다.',
    status: '운영 중',
    href: '/projects/ai-data-infra',
  },
]

const capabilities = [
  {
    title: 'Backend & System Architecture',
    desc: '복잡한 비즈니스 규칙을 가진 B2B 백엔드와 REST API 설계, RDBMS 정규화 및 인덱스 튜닝, 비동기 작업 큐 분리를 통한 고가용성 시스템 구축.',
    points: ['PHP 레거시 구조 개선 및 Node.js/TypeScript 전환', 'MySQL · PostgreSQL 모델링 및 쿼리 최적화', 'Redis 기반 세션 관리, 분산 락, 성능 병목 해소'],
  },
  {
    title: 'Platform & Operations',
    desc: '컨테이너 가상화와 무중단 배포, 리버스 프록시 보안 라우팅, 중앙 집중식 로깅 및 메트릭 파이프라인 구축을 통한 운영 안정성 확보.',
    points: ['Docker / Compose 기반 서비스 배포 및 수명주기 관리', 'Nginx 리버스 프록시, mTLS 및 SSL/TLS 인증서 자동화', 'Prometheus · Grafana · Loki 기반 관측성(Observability)'],
  },
  {
    title: 'Identity & Access Control',
    desc: '사내 다수 서비스 간 싱글 사인온(SSO) 통합, 역할 기반 권한 제어(RBAC), 데이터 접근 추적 및 감사 원장(Audit Trail) 보증.',
    points: ['Keycloak OIDC / SSO 통합 인증 체계 운영', '관리자 백오피스 메뉴 및 API 권한 매트릭스 설계', '개인정보(PII) 마스킹 및 호출 감사 로그 저장'],
  },
  {
    title: 'AI Platform & Infrastructure',
    desc: 'OpenAI 호환 API 게이트웨이 설계, 로컬 GPU/CPU 분산 추론 엔진 연동, 안전한 에이전트 도구 실행 경계 및 샌드박스 운영.',
    points: ['Rust/Axum 기반 고성능 경량 AI Gateway 구축', 'vLLM / llama.cpp 모델 서빙 슬롯 라우팅 및 장애 대응', 'MCP(Model Context Protocol) 기반 사내 도구 표준화'],
  },
]
</script>

<template>
  <main class="editorial-home">
    <!-- Section A: Hero -->
    <header class="hero-section page-wrap">
      <div class="hero-role-label">Senior Backend & Platform Engineer</div>
      <h1 class="hero-title">서비스를 만들고,<br />끝까지 운영하는 엔지니어.</h1>
      <p class="hero-description">
        그룹웨어와 B2B 백오피스 백엔드부터 인증·접근제어 아키텍처, AI Gateway와 모델 서빙 인프라까지.<br class="desktop-br" />
        복잡한 시스템의 경계를 명확히 정의하고, 실제 프로덕션 환경에서 지속 가능하게 작동하도록 만듭니다.
      </p>
      <div class="hero-cta-group">
        <a class="btn-editorial primary" href="#selected-work">주요 엔지니어링 사례 보기 ↓</a>
        <a class="btn-editorial secondary" href="/about">경력과 설계 관점 →</a>
        <span class="hero-sep"></span>
        <a class="hero-sublink" href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub ↗</a>
      </div>
    </header>

    <!-- Section B: Selected Engineering Work -->
    <section id="selected-work" class="section-wrap page-wrap" aria-labelledby="work-heading">
      <div class="section-title-area">
        <h2 id="work-heading">대표 엔지니어링 사례</h2>
        <p class="section-subtitle">
          실제 운영 환경에서 마주한 병목과 구조적 문제를 해결하기 위해 시스템 경계를 정의하고 검증해 온 프로젝트입니다.
        </p>
      </div>

      <div class="case-study-list">
        <article v-for="work in selectedWorks" :key="work.id" class="case-card">
          <div class="case-top">
            <span class="case-category">{{ work.role }}</span>
            <span class="case-badge">{{ work.status }}</span>
          </div>

          <h3 class="case-name">
            <a :href="work.href">{{ work.title }}</a>
          </h3>
          <p class="case-summary">{{ work.lead }}</p>

          <div class="case-details">
            <div class="case-col">
              <span class="col-label">문제 정의</span>
              <p class="col-text">{{ work.problem }}</p>
            </div>
            <div class="case-col">
              <span class="col-label">설계 판단</span>
              <p class="col-text">{{ work.decision }}</p>
            </div>
          </div>

          <div class="case-links">
            <a class="link-primary" :href="work.href">아키텍처 및 세부 설계 확인 →</a>
            <a v-if="work.liveUrl" class="link-secondary" :href="work.liveUrl" target="_blank" rel="noopener">
              {{ work.liveText }} ↗
            </a>
          </div>
        </article>
      </div>
    </section>

    <!-- Section C: Engineering Capabilities -->
    <section class="section-wrap page-wrap" aria-labelledby="cap-heading">
      <div class="section-title-area">
        <h2 id="cap-heading">전문 분야 및 엔지니어링 역량</h2>
        <p class="section-subtitle">
          단순한 기술 스택 나열이 아니라, 실제 프로덕션 시스템에서 직접 구현하고 책임져 온 핵심 영역입니다.
        </p>
      </div>

      <div class="capabilities-grid">
        <div v-for="cap in capabilities" :key="cap.title" class="capability-card">
          <h3>{{ cap.title }}</h3>
          <p class="capability-desc">{{ cap.desc }}</p>
          <ul class="capability-points">
            <li v-for="point in cap.points" :key="point">{{ point }}</li>
          </ul>
        </div>
      </div>
    </section>

    <!-- Section D: Products & Experiments -->
    <section class="section-wrap page-wrap" aria-labelledby="lab-heading">
      <div class="lab-callout-panel">
        <div class="lab-callout-copy">
          <h2 id="lab-heading">제품 및 실험실 (Lab)</h2>
          <p>
            현업의 반복적인 비효율을 직접 해소하기 위해 만든 도메인 RAG, 사업보고서 공시 diff 비교기, 노코드 웹페이지 빌더 등
            브라우저에서 바로 테스트해 볼 수 있는 10종의 프로토타입과 화면 설계는 Lab에서 탐색할 수 있습니다.
          </p>
        </div>
        <div class="lab-callout-action">
          <a class="btn-editorial secondary" href="/lab/">제품 & 실험 10선 탐색하기 →</a>
        </div>
      </div>
    </section>

    <!-- Section E: Recent Writing & About -->
    <section class="section-wrap page-wrap" aria-labelledby="writing-heading">
      <div class="footer-dual-layout">
        <div class="footer-left-col">
          <h2 id="writing-heading">최근 기술 기록</h2>
          <p class="footer-col-sub">실제 시스템을 구축하고 운영하면서 고민했던 설계 판단과 장애 대응 기록입니다.</p>
          <ul v-if="posts.length" class="writing-list">
            <li v-for="post in posts.slice(0, 3)" :key="post.url">
              <a :href="post.url" class="writing-link">
                <span class="writing-title">{{ post.title }}</span>
                <time :datetime="post.date">{{ post.dateLabel }}</time>
              </a>
            </li>
          </ul>
          <div class="writing-all-link">
            <a href="/posts/">전체 기록 보기 ({{ posts.length }}편) →</a>
          </div>
        </div>

        <div class="footer-right-col">
          <h2>만든 사람</h2>
          <p class="about-summary">
            <strong>devcy0922</strong>. 백엔드 및 플랫폼 엔지니어입니다.
            그룹웨어·B2B 백오피스 서비스 구축부터 시작해 인증·권한 체계, 인프라 자동화, AI 서비스 운영 기반까지
            시스템의 시작과 끝을 함께 다뤄왔습니다.
          </p>
          <div class="about-actions">
            <a class="about-primary-link" href="/about">상세 경력 및 설계 철학 읽기 →</a>
            <div class="about-sub-links">
              <a href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub ↗</a>
              <span class="dot-sep">·</span>
              <a href="/rss.xml">RSS</a>
            </div>
          </div>
        </div>
      </div>
    </section>
  </main>
</template>

<style scoped>
.editorial-home {
  padding-bottom: 120px;
}

/* Page wrap helper */
.page-wrap {
  width: min(var(--page-max, 1080px), calc(100% - var(--page-gutter, 24px) * 2));
  margin-inline: auto;
}

@media (min-width: 768px) {
  .page-wrap {
    --page-gutter: 32px;
  }
}

/* Section A: Hero */
.hero-section {
  padding: 80px 0 64px;
  border-bottom: 1px solid var(--mist-strong, #e2e8f0);
}

.hero-role-label {
  display: inline-block;
  color: var(--slate, #64748b);
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.04em;
  margin-bottom: 16px;
}

.hero-title {
  margin: 0;
  color: var(--ink, #0f172a);
  font-size: clamp(34px, 4.8vw, 54px);
  font-weight: 800;
  line-height: 1.18;
  letter-spacing: -0.04em;
  word-break: keep-all;
}

.hero-description {
  max-width: 42em;
  margin: 20px 0 0;
  color: var(--ink-soft, #334155);
  font-size: 17px;
  line-height: 1.75;
  word-break: keep-all;
}

.hero-cta-group {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 36px;
}

.hero-sep {
  width: 1px;
  height: 18px;
  background: var(--mist-strong, #e2e8f0);
  margin: 0 4px;
}

.hero-sublink {
  color: var(--slate, #64748b);
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
}

.hero-sublink:hover {
  color: var(--ink, #0f172a);
}

/* Buttons */
.btn-editorial {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 42px;
  padding: 0 18px;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 650;
  text-decoration: none !important;
  transition: all 140ms ease;
}

.btn-editorial.primary {
  background: var(--ink, #0f172a);
  color: #ffffff !important;
  border: 1px solid var(--ink, #0f172a);
}

.btn-editorial.primary:hover {
  background: #1e293b;
  border-color: #1e293b;
}

.btn-editorial.secondary {
  background: var(--paper, #ffffff);
  color: var(--ink, #0f172a) !important;
  border: 1px solid var(--mist-strong, #e2e8f0);
}

.btn-editorial.secondary:hover {
  background: var(--wash, #f8fafc);
  border-color: var(--slate, #64748b);
}

/* Sections Common */
.section-wrap {
  padding-top: 80px;
}

.section-title-area {
  margin-bottom: 36px;
  max-width: 48em;
}

.section-title-area h2 {
  margin: 0;
  color: var(--ink, #0f172a);
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.03em;
}

.section-subtitle {
  margin: 8px 0 0;
  color: var(--slate, #64748b);
  font-size: 15px;
  line-height: 1.65;
  word-break: keep-all;
}

/* Section B: Case Studies (Row layout) */
.case-study-list {
  display: flex;
  flex-direction: column;
  border-top: 1px solid var(--ink, #0f172a);
}

.case-card {
  padding: 36px 0;
  border-bottom: 1px solid var(--mist-strong, #e2e8f0);
}

.case-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.case-category {
  color: var(--slate, #64748b);
  font-family: var(--vp-font-family-mono, monospace);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.case-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--wash, #f8fafc);
  border: 1px solid var(--mist-strong, #e2e8f0);
  color: #15803d;
  font-size: 11px;
  font-weight: 700;
}

.case-name {
  margin: 0;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.35;
}

.case-name a {
  color: var(--ink, #0f172a);
  text-decoration: none;
}

.case-name a:hover {
  color: var(--cobalt, #2563eb);
}

.case-summary {
  margin: 8px 0 20px;
  color: var(--ink-soft, #334155);
  font-size: 15px;
  line-height: 1.65;
  word-break: keep-all;
}

.case-details {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px;
  padding: 20px 24px;
  border-radius: 8px;
  background: var(--wash, #f8fafc);
  border: 1px solid var(--mist, #f1f5f9);
  margin-bottom: 20px;
}

.case-col {
  display: flex;
  flex-direction: column;
}

.col-label {
  color: var(--slate, #64748b);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
  margin-bottom: 6px;
}

.col-text {
  margin: 0;
  color: var(--ink-soft, #334155);
  font-size: 14px;
  line-height: 1.7;
  word-break: keep-all;
}

.case-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 20px;
}

.link-primary {
  color: var(--ink, #0f172a);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.link-primary:hover {
  color: var(--cobalt, #2563eb);
}

.link-secondary {
  color: var(--slate, #64748b);
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
}

.link-secondary:hover {
  color: var(--ink, #0f172a);
}

/* Section C: Capabilities Grid */
.capabilities-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
}

.capability-card {
  padding: 28px;
  border-radius: 8px;
  background: var(--paper, #ffffff);
  border: 1px solid var(--mist-strong, #e2e8f0);
}

.capability-card h3 {
  margin: 0 0 10px;
  color: var(--ink, #0f172a);
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.capability-desc {
  margin: 0 0 18px;
  color: var(--slate, #64748b);
  font-size: 14px;
  line-height: 1.65;
  word-break: keep-all;
}

.capability-points {
  margin: 0;
  padding: 0;
  list-style: none;
  border-top: 1px solid var(--mist, #f1f5f9);
  padding-top: 14px;
}

.capability-points li {
  position: relative;
  padding-left: 14px;
  color: var(--ink-soft, #334155);
  font-size: 13px;
  line-height: 1.7;
  margin-bottom: 4px;
}

.capability-points li::before {
  content: "•";
  position: absolute;
  left: 0;
  color: var(--slate, #64748b);
}

/* Section D: Lab Callout */
.lab-callout-panel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 36px;
  padding: 36px 40px;
  border-radius: 8px;
  background: var(--wash, #f8fafc);
  border: 1px solid var(--mist-strong, #e2e8f0);
}

.lab-callout-copy {
  max-width: 48em;
}

.lab-callout-copy h2 {
  margin: 0 0 10px;
  color: var(--ink, #0f172a);
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.lab-callout-copy p {
  margin: 0;
  color: var(--ink-soft, #334155);
  font-size: 14.5px;
  line-height: 1.7;
  word-break: keep-all;
}

.lab-callout-action {
  flex-shrink: 0;
}

/* Section E: Writing & About Dual Layout */
.footer-dual-layout {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 56px;
  padding-top: 20px;
  border-top: 1px solid var(--mist-strong, #e2e8f0);
}

.footer-left-col h2,
.footer-right-col h2 {
  margin: 0;
  color: var(--ink, #0f172a);
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.footer-col-sub {
  margin: 8px 0 20px;
  color: var(--slate, #64748b);
  font-size: 13.5px;
  line-height: 1.6;
}

.writing-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.writing-list li {
  border-top: 1px solid var(--mist-strong, #e2e8f0);
}

.writing-link {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 13px 0;
  text-decoration: none !important;
}

.writing-title {
  color: var(--ink, #0f172a);
  font-size: 14px;
  font-weight: 600;
  line-height: 1.45;
}

.writing-link:hover .writing-title {
  color: var(--cobalt, #2563eb);
}

.writing-link time {
  color: var(--slate, #64748b);
  font-size: 12px;
  white-space: nowrap;
}

.writing-all-link {
  margin-top: 16px;
}

.writing-all-link a {
  color: var(--slate, #64748b);
  font-size: 13px;
  font-weight: 650;
  text-decoration: none;
}

.writing-all-link a:hover {
  color: var(--ink, #0f172a);
}

.about-summary {
  margin: 14px 0 20px;
  color: var(--ink-soft, #334155);
  font-size: 14.5px;
  line-height: 1.75;
  word-break: keep-all;
}

.about-summary strong {
  color: var(--ink, #0f172a);
}

.about-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.about-primary-link {
  color: var(--ink, #0f172a);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.about-primary-link:hover {
  color: var(--cobalt, #2563eb);
}

.about-sub-links {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--slate, #64748b);
  font-size: 13px;
}

.about-sub-links a {
  color: var(--slate, #64748b);
  text-decoration: none;
}

.about-sub-links a:hover {
  color: var(--ink, #0f172a);
}

.dot-sep {
  color: var(--mist-strong, #e2e8f0);
}

/* Responsive */
@media (max-width: 900px) {
  .capabilities-grid {
    grid-template-columns: 1fr;
  }
  .case-details {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .lab-callout-panel {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
    padding: 28px;
  }
  .footer-dual-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
}

@media (max-width: 640px) {
  .hero-section {
    padding: 48px 0 40px;
  }
  .hero-title {
    font-size: 32px;
  }
  .hero-description {
    font-size: 15.5px;
  }
  .desktop-br {
    display: none;
  }
  .section-wrap {
    padding-top: 60px;
  }
  .case-card {
    padding: 28px 0;
  }
  .case-details {
    padding: 16px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .btn-editorial,
  .writing-link,
  .case-name a {
    transition: none;
  }
}
</style>
