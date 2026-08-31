---
title: "프로젝트"
description: "직접 만들고 운영해본 프로젝트와 실험을 정리합니다."
outline: [2, 3]
aside: false
---

# 프로젝트

<div class="project-intro">
  <p class="project-lead">
    완성도 높은 것만 모아놓기보다 <strong>직접 만들면서 배운 게 있었던 작업</strong>을 남깁니다.
    공개 레포 중에는 실험이나 데모로 끝난 것도 있고, 지금도 계속 바꾸고 있는 것도 있습니다.
  </p>
</div>

## 지금 보여주고 싶은 것

<div class="project-ledger">
  <a href="/projects/govail-gateway">
    <span class="project-kind">AI PLATFORM</span>
    <div>
      <h3>GoVail Gateway</h3>
      <p>LLM 앞에 인증, 정책, 감사, 라우팅을 붙여보면서 Gateway가 어디까지 해야 하는지 계속 줄이고 다시 만든 작업.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/lingo-agent">
    <span class="project-kind">AUTOMATION</span>
    <div>
      <h3>LingoAgent</h3>
      <p>번역 생성에서 끝내지 않고 검증, QA, 커밋까지 이어지게 만든 자동화 파이프라인.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/leandraft-linter">
    <span class="project-kind">DEV TOOL</span>
    <div>
      <h3>Leandraft Linter</h3>
      <p>기술 문서를 커밋하기 전에 구조와 민감정보를 먼저 검사해보려고 만든 Rust 기반 도구.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>
</div>

## AI 쪽에서 이것저것 해본 것

하나의 거대한 플랫폼으로 보이게 묶기보다는 각각 따로 만들고 확인해본 작업들입니다.

- [Aegis-LLM](/projects/aegis-llm) — LLM Gateway의 인증, DLP와 fallback
- [Aperture MCP](/projects/aperture-mcp) — Tool 실행 전 policy 검사
- [SliceRAG](/projects/slicerag) — 프로젝트 단위 RAG 데이터 격리
- [AgentSecOps Playground](/projects/agentsecops-playground) — Agent 보안 실패 케이스 재현

## 인프라와 개발 도구

- [AI Gateway Infra Demo](/projects/ai-gateway-infra-demo) — Gateway와 private runtime을 나눠 배포해본 예제
- [Infra Security](/projects/infra-security) — 호스트·컨테이너 네트워크 보안 자동화
- [Mock LLM Server](/projects/mock-llm) — CI에서 LLM 오류 응답을 재현하기 위한 테스트 서버

## 공개할 때 지키는 것

회사에서 만든 코드나 내부 데이터는 개인 프로젝트처럼 공개하지 않습니다.

개인 프로젝트도 README에 적은 목표보다 실제 구현이 덜 되어 있다면 지금 되는 수준을 기준으로 적습니다. 만들 예정인 기능은 만들어진 것처럼 쓰지 않으려고 합니다.

[GitHub에서 공개 레포 보기 ↗](https://github.com/devcy0922)
