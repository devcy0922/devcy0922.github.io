---
title: "프로젝트"
description: "문제, 책임 경계와 현재 보장 범위를 중심으로 정리한 devcy0922의 공개 프로젝트."
outline: [2, 3]
aside: false
---

# 프로젝트

<div class="project-intro">
  <p class="project-lead">
    많이 만든 것을 보여주기보다 <strong>왜 만들었고, 어떤 경계를 선택했으며,
    어디까지 검증했는지</strong>를 남깁니다.
    공개 레포에는 실험·데모 목적의 작업도 있으며 현재 수준과 한계를 구분해 설명합니다.
  </p>
</div>

## 선택한 작업

<div class="project-ledger">
  <a href="/projects/govail-gateway">
    <span class="project-kind">AI PLATFORM</span>
    <div>
      <h3>GoVail Gateway</h3>
      <p>AI 요청의 인증, 정책, 감사와 모델 실행을 하나의 명확한 경계로 만들기 위한 플랫폼 작업.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/lingo-agent">
    <span class="project-kind">AUTOMATION</span>
    <div>
      <h3>LingoAgent</h3>
      <p>번역 생성 이후 ICU 검증과 QA, 자동 커밋까지 연결해 결과를 검증 가능한 pipeline으로 만든 작업.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>

  <a href="/projects/leandraft-linter">
    <span class="project-kind">DEV TOOL</span>
    <div>
      <h3>Leandraft Linter</h3>
      <p>기술 설계 문서의 구조와 민감정보 노출을 커밋 전에 검사하는 Rust 기반 Markdown 정적 분석 도구.</p>
    </div>
    <span class="project-arrow">↗</span>
  </a>
</div>

## AI 플랫폼 실험

아래 작업은 하나의 거대한 제품처럼 묶어 과장하지 않고, 각 책임 경계를 검증한 작은 사례로 둡니다.

- [Aegis-LLM](/projects/aegis-llm) — LLM Gateway의 인증, DLP와 fallback
- [Aperture MCP](/projects/aperture-mcp) — Tool 실행 전 policy 검사
- [SliceRAG](/projects/slicerag) — 프로젝트 단위 RAG 데이터 격리
- [AgentSecOps Playground](/projects/agentsecops-playground) — Agent 보안 실패 경로 회귀 검증

## 인프라와 지원 도구

- [AI Gateway Infra Demo](/projects/ai-gateway-infra-demo) — Gateway와 private runtime의 배포 경계
- [Infra Security](/projects/infra-security) — 호스트·컨테이너 네트워크 보안 자동화
- [Mock LLM Server](/projects/mock-llm) — CI에서 LLM 오류와 응답 계약을 재현하는 테스트 서버

## 공개 원칙

회사에서 수행한 소스 코드나 내부 운영 데이터는 공개 프로젝트로 포장하지 않습니다.

개인 프로젝트 역시 README의 목표와 현재 구현이 다르면 현재 동작을 기준으로 설명하고, 구현 예정인 내용은 `Next Steps`로 분리합니다.

[GitHub에서 공개 레포 보기 ↗](https://github.com/devcy0922)
