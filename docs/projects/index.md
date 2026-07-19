---
title: "프로젝트"
description: "기업용 백엔드, AI 플랫폼, 자동화와 개발 도구 영역에서 문제와 설계 판단을 검증한 프로젝트"
outline: [2, 3]
aside: false
---

# 프로젝트

## 서로 다른 문제를 해결한 대표 작업

프로젝트 수보다 **어떤 문제를 정의했고, 어디까지 구현했으며, 무엇을 아직 보장하지 않는지**를 우선합니다. 대표 작업은 AI 플랫폼, 자동화 파이프라인과 개발 도구처럼 서로 다른 역량을 보여주는 세 사례로 구성했습니다.

<div class="project-grid project-grid--featured">
  <a class="project-card" href="/projects/govail-gateway">
    <div>
      <h3>GoVail Gateway <span class="status-badge status-mvp">MVP</span></h3>
      <p>AI 요청 앞단의 인증, 정책, 라우팅과 감사를 하나의 실행 경계로 분리한 AI 플랫폼 사례입니다.</p>
    </div>
    <div class="project-meta"><span>AI Platform Case Study</span><span>Rust · SurrealDB</span></div>
  </a>

  <a class="project-card" href="/projects/lingo-agent">
    <div>
      <h3>LingoAgent <span class="status-badge status-mvp">MVP</span></h3>
      <p>번역, ICU 검증, LLM QA와 자동 커밋을 연결해 검증되지 않은 결과의 배포를 차단하는 i18n 파이프라인입니다.</p>
    </div>
    <div class="project-meta"><span>Automation Pipeline</span><span>Python · GitHub Actions</span></div>
  </a>

  <a class="project-card" href="/projects/leandraft-linter">
    <div>
      <h3>Leandraft Linter <span class="status-badge status-stable">Stable</span></h3>
      <p>기술 설계 문서의 구조와 민감정보 노출을 커밋 전에 검사하는 Rust 기반 Markdown 정적 분석 도구입니다.</p>
    </div>
    <div class="project-meta"><span>Developer Tool</span><span>Rust · Markdown AST</span></div>
  </a>
</div>

## AI 플랫폼 구현과 실험

GoVail 하나를 여러 프로젝트로 부풀리기보다, 요청·도구·데이터·검증 경계에서 수행한 구현과 실험으로 구분했습니다.

<div class="compact-list">
  <a class="compact-item" href="/projects/aegis-llm">
    <span class="compact-title">Aegis-LLM</span>
    <span class="compact-desc">LLM Gateway · 인증, DLP와 Fallback</span>
  </a>
  <a class="compact-item" href="/projects/aperture-mcp">
    <span class="compact-title">Aperture MCP</span>
    <span class="compact-desc">Tool Policy · MCP 실행 전 정책 검사</span>
  </a>
  <a class="compact-item" href="/projects/slicerag">
    <span class="compact-title">SliceRAG</span>
    <span class="compact-desc">RAG Isolation · 프로젝트 단위 데이터 격리</span>
  </a>
  <a class="compact-item" href="/projects/agentsecops-playground">
    <span class="compact-title">AgentSecOps Playground</span>
    <span class="compact-desc">Security Regression · 실패 경로 통합 검증</span>
  </a>
</div>

## 인프라 및 지원 도구

<div class="compact-list">
  <a class="compact-item" href="/projects/ai-gateway-infra-demo">
    <span class="compact-title">AI Gateway Infra Demo</span>
    <span class="compact-desc">Gateway와 사설 Runtime의 배포 경계</span>
  </a>
  <a class="compact-item" href="/projects/infra-security">
    <span class="compact-title">Infra Security</span>
    <span class="compact-desc">호스트와 컨테이너 네트워크 보안 자동화</span>
  </a>
  <a class="compact-item" href="/projects/mock-llm">
    <span class="compact-title">Mock LLM Server</span>
    <span class="compact-desc">CI에서 LLM 실패와 응답 계약을 재현하는 테스트 서버</span>
  </a>
</div>

<div class="portfolio-page-actions">
  <a href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub에서 공개 코드 보기 ↗</a>
  <a href="/experience">경력과 책임 범위 보기</a>
  <a href="/live-demo">대표 AI 플랫폼 데모 보기</a>
</div>
