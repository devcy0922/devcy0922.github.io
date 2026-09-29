<script setup>
import { computed } from 'vue'
import { data as posts } from '../../posts.data.js'
const latestPosts = computed(() => posts.slice(0, 3))
</script>
<template>
  <main class="dev-home">
    <section class="portfolio-hero" aria-labelledby="home-title">
      <div class="portfolio-intro">
        <p class="career-line">devcy0922 / 10년차 개발자</p>
        <h1 id="home-title">Backend &amp;<br>AI Platform Engineer</h1>
        <p class="hero-copy">AI가 실제 업무를 수행할 수 있도록 실행 경계를 설계합니다. 모델을 연결하고, 권한을 제한하고, 결과를 검증하며 운영까지 책임집니다.</p>
        <p class="career-context">그룹웨어·B2B 서비스의 백엔드와 운영에서 출발해 Gateway, Agent Runtime, Verification, Serving으로 확장하고 있습니다.</p>
        <div class="hero-actions"><a class="action-primary" href="/playground">Playground 실행하기</a><a class="action-quiet" href="#selected-work">대표 프로젝트</a><a class="action-text" href="/about">경력과 소개</a></div>
      </div>
      <aside class="system-map" aria-label="대표 시스템의 책임">
        <p>하나의 AI 기능 뒤에 필요한 시스템</p>
        <a href="/projects/govail-control"><span>규칙과 상태</span><strong>GoVail Control</strong><small>에이전트가 따르는 계약을 관리</small></a>
        <a href="/projects/govail-gateway"><span>모델 실행</span><strong>GoVail Gateway</strong><small>인증·정책·모델 전달의 경계</small></a>
        <a href="/projects/works-daily-agents"><span>업무 실행</span><strong>Works Daily Agents</strong><small>조사와 승인 후 변경을 분리</small></a>
        <a href="/projects/pinchq"><span>결과 검증</span><strong>PinchQ</strong><small>관찰한 실행 증거로 판정</small></a>
        <div class="system-foundation">AI Service Infra / AI Data Infra<br><span>서빙 연결 · 워크플로우 · 관측 · 공용 데이터</span></div>
      </aside>
    </section>
    <section id="selected-work" class="home-section" aria-labelledby="work-title">
      <header class="section-head"><div><h2 id="work-title">대표 프로젝트</h2><p>무엇을 만들었는지, 왜 그 경계로 나눴는지.</p></div><a href="/projects/">전체 프로젝트</a></header>
      <SelectedProjects />
    </section>
    <section class="demo-invitation" aria-labelledby="demo-title">
      <div><h2 id="demo-title">설명을 넘어, 실행 경계를 직접 확인하세요.</h2><p>권한이 없을 때 요청을 거부하고, 승인 전에는 변경을 막고, 실행하지 않은 검사는 성공으로 판정하지 않습니다.</p><p class="demo-disclosure">공개용 브라우저 시뮬레이션입니다. 실제 모델 요청은 별도의 라이브 콘솔에서 전송합니다.</p></div>
      <a class="action-primary" href="/playground">데모 열기</a>
    </section>
    <section class="home-section" aria-labelledby="approach-title">
      <header class="section-head"><h2 id="approach-title">시스템을 설계하는 기준</h2></header>
      <ol class="principle-flow">
        <li><strong>Problem</strong><span>자동화할 문제와 사용자의 일을 정의합니다.</span></li>
        <li><strong>Boundary</strong><span>모델·도구·사람의 권한을 나눕니다.</span></li>
        <li><strong>Execution</strong><span>실제 시스템과 실패 경로를 연결합니다.</span></li>
        <li><strong>Verification</strong><span>응답이 아닌 실행 증거를 확인합니다.</span></li>
        <li><strong>Operation</strong><span>장애 원인과 복구 조건을 남깁니다.</span></li>
      </ol>
    </section>
    <section class="home-section" aria-labelledby="latest-title">
      <header class="section-head"><div><h2 id="latest-title">Engineering Notes</h2><p>구현 뒤에 남은 판단과 트레이드오프.</p></div><a href="/posts/">모든 기록</a></header>
      <div class="post-ledger"><a v-for="post in latestPosts" :key="post.url" class="ledger-row" :href="post.url"><time :datetime="post.date">{{ post.dateLabel }}</time><div class="ledger-copy"><h3>{{ post.title }}</h3><p>{{ post.description }}</p></div><span class="row-arrow" aria-hidden="true">↗</span></a></div>
    </section>
    <footer class="portfolio-signoff"><p>실행할 수 있고, 실패를 통제할 수 있으며,<br>결과를 검증할 수 있는 시스템을 만듭니다.</p><a href="/about">경력과 설계 관점</a><a href="https://github.com/devcy0922">GitHub</a></footer>
  </main>
</template>
