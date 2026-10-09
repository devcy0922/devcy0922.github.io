<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'
import projects from '../../selected-projects.js'

const latestPosts = computed(() => posts.slice(0, 3))
const featuredProjects = computed(() => projects.slice(0, 3))
</script>

<template>
  <main class="dev-home">
    <section class="portfolio-hero" aria-labelledby="home-title">
      <div class="portfolio-intro">
        <p class="career-line"><span class="status-mark" aria-hidden="true"></span>devcy0922 · Backend &amp; AI Platform Engineer</p>
        <h1 id="home-title">만들고, 운영하고,<br>왜 그렇게 했는지 기록합니다.</h1>
        <p class="hero-copy">AI가 실제 업무를 수행할 수 있도록 실행 경계를 설계합니다. 모델을 연결하고, 권한을 제한하고, 결과를 검증하며 운영까지 책임집니다.</p>
        <div class="hero-actions">
          <a class="action-primary" href="/playground">공개 데모 실행</a>
          <a class="action-quiet" href="#selected-work">대표 작업 보기</a>
          <a class="action-text" href="/about">경력과 관점</a>
        </div>
      </div>

      <aside class="system-map" aria-labelledby="system-map-title">
        <div class="system-map-heading">
          <span class="section-kicker">SYSTEM MAP</span>
          <p id="system-map-title">하나의 AI 기능 뒤에<br>필요한 책임 경계</p>
        </div>
        <a href="/projects/govail-gateway">
          <span class="map-index">01</span>
          <span><strong>모델 실행</strong><small>인증 · 정책 · 전달</small></span>
          <span class="map-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/projects/itgc-control">
          <span class="map-index">02</span>
          <span><strong>증적 수집</strong><small>원천 시스템 · read-only</small></span>
          <span class="map-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/projects/lingo-agent">
          <span class="map-index">03</span>
          <span><strong>배포 품질</strong><small>검증 · 커밋 게이트</small></span>
          <span class="map-arrow" aria-hidden="true">↗</span>
        </a>
        <a href="/projects/slicerag">
          <span class="map-index">04</span>
          <span><strong>데이터 경계</strong><small>프로젝트 범위 · 검색</small></span>
          <span class="map-arrow" aria-hidden="true">↗</span>
        </a>
        <div class="system-foundation"><span>FOUNDATION</span><strong>AI Service Infra · AI Data Infra</strong><small>서빙 연결 · 워크플로우 · 관측 · 공용 데이터</small></div>
      </aside>
    </section>

    <nav class="trace-shell" aria-label="작업 흐름">
      <div class="trace-line" aria-hidden="true"></div>
      <ol class="trace-rail">
        <li><span>01</span><strong>문제 정의</strong></li>
        <li><span>02</span><strong>경계 설정</strong></li>
        <li><span>03</span><strong>실행 연결</strong></li>
        <li><span>04</span><strong>검증</strong></li>
        <li><span>05</span><strong>운영</strong></li>
      </ol>
    </nav>

    <section id="selected-work" class="home-section featured-section" aria-labelledby="work-title">
      <header class="section-head">
        <div><span class="section-kicker">SELECTED WORK</span><h2 id="work-title">대표 작업</h2><p>무엇을 만들었는지보다, 어떤 책임을 맡겼고 왜 그렇게 나눴는지를 봅니다.</p></div>
        <a href="/projects/">전체 프로젝트 <span aria-hidden="true">↗</span></a>
      </header>

      <div class="featured-list">
        <article v-for="(project, index) in featuredProjects" :key="project.title" class="featured-project">
          <div class="featured-index">0{{ index + 1 }}</div>
          <div class="featured-identity">
            <span>{{ project.type }}</span>
            <h3><a :href="project.href">{{ project.title }}</a></h3>
            <p>{{ project.description }}</p>
          </div>
          <dl class="featured-decision">
            <div><dt>문제</dt><dd>{{ project.problem }}</dd></div>
            <div><dt>결정</dt><dd>{{ project.decision }}</dd></div>
          </dl>
          <a class="featured-link" :href="project.href">사례와 설계 범위 <span aria-hidden="true">↗</span></a>
        </article>
      </div>
    </section>

    <section class="demo-invitation" aria-labelledby="demo-title">
      <div>
        <span class="section-kicker">OPEN PLAYGROUND</span>
        <h2 id="demo-title">설명을 넘어, 실행 경계를 직접 확인하세요.</h2>
        <p>권한이 없을 때 요청을 거부하고, 승인 전에는 변경을 막고, 실행하지 않은 검사는 성공으로 판정하지 않습니다.</p>
        <p class="demo-disclosure">공개용 브라우저 시뮬레이션입니다. 실제 모델 요청은 별도의 라이브 콘솔에서 전송합니다.</p>
      </div>
      <a class="action-primary" href="/playground">데모 열기 <span aria-hidden="true">↗</span></a>
    </section>

    <section class="home-section principles-section" aria-labelledby="approach-title">
      <header class="section-head"><div><span class="section-kicker">HOW I WORK</span><h2 id="approach-title">시스템을 설계하는 기준</h2></div></header>
      <ol class="principle-flow">
        <li><span class="principle-index">01</span><strong>Problem</strong><p>자동화할 문제와 사용자의 일을 정의합니다.</p></li>
        <li><span class="principle-index">02</span><strong>Boundary</strong><p>모델·도구·사람의 권한을 나눕니다.</p></li>
        <li><span class="principle-index">03</span><strong>Execution</strong><p>실제 시스템과 실패 경로를 연결합니다.</p></li>
        <li><span class="principle-index">04</span><strong>Verification</strong><p>응답이 아닌 실행 증거를 확인합니다.</p></li>
        <li><span class="principle-index">05</span><strong>Operation</strong><p>장애 원인과 복구 조건을 남깁니다.</p></li>
      </ol>
    </section>

    <section class="home-section notes-section" aria-labelledby="latest-title">
      <header class="section-head">
        <div><span class="section-kicker">ENGINEERING NOTES</span><h2 id="latest-title">최근 기록</h2><p>구현 뒤에 남은 판단과 트레이드오프.</p></div>
        <a href="/posts/">모든 기록 <span aria-hidden="true">↗</span></a>
      </header>
      <div class="post-ledger">
        <a v-for="post in latestPosts" :key="post.url" class="ledger-row" :href="post.url">
          <time :datetime="post.date">{{ post.dateLabel }}</time>
          <div class="ledger-copy"><h3>{{ post.title }}</h3><p>{{ post.description }}</p></div>
          <span class="row-arrow" aria-hidden="true">↗</span>
        </a>
      </div>
    </section>

    <footer class="portfolio-signoff">
      <p>실행할 수 있고, 실패를 통제할 수 있으며,<br>결과를 검증할 수 있는 시스템을 만듭니다.</p>
      <div><a href="/about">경력과 설계 관점</a><a href="https://console.govail.cloud">GoVail Console ↗</a><a href="https://github.com/devcy0922">GitHub ↗</a></div>
    </footer>
  </main>
</template>
