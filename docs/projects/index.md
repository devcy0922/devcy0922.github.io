---
title: "프로젝트"
description: "직접 만든 도구와 실험의 문제, 책임 경계, 현재 검증 범위를 정리합니다."
outline: [2, 3]
aside: false
---

# 프로젝트

<div class="project-intro">
  <p class="project-lead">
    공개 가능한 프로젝트 중에서 <strong>문제와 책임 경계가 분명한 작업</strong>을 남깁니다.
    완성도보다 지금 검증한 범위와 아직 남은 한계를 정확하게 적습니다.
  </p>
</div>

## 대표 프로젝트

<div class="project-ledger">
  <a href="/projects/govail-gateway">
    <span class="project-kind">AI PLATFORM</span>
    <div>
      <h3>GoVail Gateway</h3>
      <p>인증, 정책, 감사와 모델 실행 책임을 분리하는 OpenAI-compatible Gateway.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/lingo-agent">
    <span class="project-kind">AUTOMATION</span>
    <div>
      <h3>LingoAgent</h3>
      <p>번역 생성부터 ICU 검증, QA, 커밋까지 연결한 i18n 배포 게이트.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/leandraft-linter">
    <span class="project-kind">DEV TOOL</span>
    <div>
      <h3>Leandraft Linter</h3>
      <p>기술 문서를 커밋하기 전 구조와 민감정보를 검사하는 Rust 기반 로컬 도구.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/coexistgate">
    <span class="project-kind">RELEASE SAFETY</span>
    <div>
      <h3>coexistgate</h3>
      <p>변경을 안전하게 릴리스하고 롤백할 수 있는지 검증하는 Rust 엔진.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/works-agent-demo">
    <span class="project-kind">AGENT WORKFLOW</span>
    <div>
      <h3>works-agent-demo</h3>
      <p>증거 기반 에이전트 워크플로를 직접 확인하는 인터랙티브 데모.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>
</div>

## GitHub 공개 프로젝트

GitHub의 공개 레포 목록을 빌드 시점에 동기화합니다. 새 레포나 최근 수정된 레포가 자동으로 반영됩니다.

<AutoProjects />

## AI 플랫폼과 보안 실험

각 프로젝트는 독립적으로 만들고 검증했습니다. 하나의 제품군으로 보이게 묶지 않습니다.

- [Aegis-LLM](/projects/aegis-llm) — LLM Gateway의 인증, DLP와 fallback
- [Aperture MCP](/projects/aperture-mcp) — Tool 실행 전 policy 검사
- [SliceRAG](/projects/slicerag) — 프로젝트 단위 RAG 데이터 격리
- [AgentSecOps Playground](/projects/agentsecops-playground) — Agent 보안 실패 케이스 재현

## 운영과 개발 자동화

- [AI Gateway Infra Demo](/projects/ai-gateway-infra-demo) — Gateway와 private runtime을 나눠 배포해본 예제
- [Infra Security](/projects/infra-security) — 호스트·컨테이너 네트워크 보안 자동화
- [Mock LLM Server](/projects/mock-llm) — CI에서 LLM 오류 응답을 재현하기 위한 테스트 서버

## 공개 기준

회사에서 만든 코드나 내부 데이터는 개인 프로젝트처럼 공개하지 않습니다.

개인 프로젝트도 목표보다 실제 구현이 덜 되어 있다면 현재 되는 수준을 기준으로 적습니다. 계획 단계의 기능은 구현된 것처럼 쓰지 않습니다.

[GitHub에서 공개 레포 보기 ↗](https://github.com/devcy0922)
