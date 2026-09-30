<script setup>
import HomeDemo from './HomeDemo.vue'

const backend = [
  { k: '언어', v: 'PHP, Node.js, TypeScript, Rust, Python' },
  { k: '데이터', v: 'PostgreSQL, MySQL, Redis, Kafka' },
  { k: '인프라', v: 'Docker, Nginx, AWS, GitHub Actions' },
  { k: '보안', v: 'SSO, 키 관리, 접근 제어, 감사 로그' },
  { k: '운영', v: '레거시 PHP 구조 개선, 배포 자동화, Redis 조회 성능 개선, 장애 대응' },
]
const llm = [
  { k: 'Gateway', v: '인증, 모델 접근 정책, rate limit, 감사 메타데이터를 처리하는 OpenAI-compatible Gateway (Rust)' },
  { k: '서빙', v: '로컬 노드 3대에서 llama.cpp 기반 모델 서빙' },
  { k: 'RAG', v: '프로젝트 범위 안에서만 저장·검색하는 RAG (pgvector)' },
  { k: '검증', v: 'ICU·용어집·QA를 통과해야 커밋되는 LLM 번역 배포 파이프라인' },
  { k: '적용', v: 'OCR과 LLM을 이용한 사내 반복 업무 자동화' },
]
const notes = [
  { t: '인증과 정책은 Gateway', b: '모델 접근 권한, rate limit, 감사 기록을 한 곳에서 처리합니다. 호출하는 쪽은 인증 방식만 알면 됩니다.' },
  { t: '도구와 지식은 애플리케이션', b: 'Gateway는 요청 내용을 해석하지 않습니다. Workflow, 도구, 지식은 호출하는 쪽이 소유합니다.' },
  { t: '실패는 성공으로 바꾸지 않음', b: '검증 실패, 모델 장애, 연결 없음은 오류로 반환하고 기록합니다.' },
]
</script>

<template>
  <main class="hm">
    <section class="hm-hero" aria-labelledby="hm-title">
      <div class="hm-in">
        <h1 id="hm-title">Backend,<br><span>LLM 서비스 개발·운영.</span></h1>
        <p>그룹웨어·B2B 서비스의 백엔드를 개발하고 운영해 왔습니다. 현재는 LLM Gateway, 로컬 모델 서빙, RAG, 검증 파이프라인을 만들고 있습니다.</p>
        <div class="hm-cta">
          <a class="hm-btn hm-btn-primary" href="#demo">직접 실행해 보기</a>
          <a class="hm-btn" href="https://github.com/devcy0922">GitHub ↗</a>
        </div>
      </div>
    </section>

    <section id="demo" class="hm-sec" aria-labelledby="hm-demo-title">
      <div class="hm-in">
        <header class="hm-head"><h2 id="hm-demo-title">라이브 데모</h2><p>실제 Gateway로 요청이 나가고, 통과 과정과 응답이 스트림으로 돌아옵니다.</p></header>
        <HomeDemo />
      </div>
    </section>

    <section id="skills" class="hm-sec" aria-label="Backend와 LLM">
      <div class="hm-in hm-cols">
        <div>
          <h2>Backend</h2>
          <dl class="hm-list">
            <div v-for="p in backend" :key="p.k"><dt>{{ p.k }}</dt><dd>{{ p.v }}</dd></div>
          </dl>
        </div>
        <div>
          <h2>LLM</h2>
          <dl class="hm-list hm-list-blue">
            <div v-for="p in llm" :key="p.k"><dt>{{ p.k }}</dt><dd>{{ p.v }}</dd></div>
          </dl>
        </div>
      </div>
    </section>

    <section id="architecture" class="hm-sec" aria-labelledby="hm-arch-title">
      <div class="hm-in">
        <header class="hm-head hm-head-row">
          <h2 id="hm-arch-title">구조</h2>
          <p class="hm-legend"><span class="lg be"></span>Backend <span class="lg llm"></span>LLM</p>
        </header>
        <div class="hm-diagram" role="img" aria-label="호출자에서 Gateway, 서비스 계층, 모델 추론으로 이어지는 요청 경로. 아래에 데이터 계층과 관측·CI/CD가 있다.">
          <div class="hm-flow">
            <div class="hm-node be"><b>호출자</b><span>업무 서비스<br>Agent · IDE</span></div>
            <i class="hm-arrow" aria-hidden="true"></i>
            <div class="hm-node be"><b>Gateway</b><span>인증 · 접근 정책<br>rate limit · 감사</span></div>
            <i class="hm-arrow" aria-hidden="true"></i>
            <div class="hm-node llm"><b>서비스 계층</b><span>모델 라우팅 · Workflow<br>Trace</span></div>
            <i class="hm-arrow" aria-hidden="true"></i>
            <div class="hm-node llm"><b>모델 추론</b><span>로컬 노드<br>외부 Provider</span></div>
          </div>
          <div class="hm-links" aria-hidden="true"><i></i><i></i></div>
          <div class="hm-shared">
            <div class="hm-node be wide"><b>데이터 계층</b><code>PostgreSQL · pgvector · Redis · Kafka</code></div>
            <div class="hm-node dash wide"><b>관측 · CI/CD</b><code>Prometheus · Grafana · Loki · Langfuse · GitHub Actions · Docker</code></div>
          </div>
        </div>
        <div class="hm-notes">
          <div v-for="n in notes" :key="n.t"><h3>{{ n.t }}</h3><p>{{ n.b }}</p></div>
        </div>
      </div>
    </section>

    <footer class="hm-foot">
      <div class="hm-in">
        <span>devcy0922</span>
        <nav aria-label="바로가기"><a href="/playground">라이브 콘솔</a><a href="/posts/">기록</a><a href="https://github.com/devcy0922">GitHub ↗</a></nav>
      </div>
    </footer>
  </main>
</template>
