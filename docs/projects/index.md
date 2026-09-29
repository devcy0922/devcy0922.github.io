---
title: "프로젝트"
description: "직접 만든 도구와 실험의 문제, 책임 경계, 현재 검증 범위를 정리합니다."
outline: [2, 3]
aside: false
---

# 프로젝트

<div class="project-intro">
  <p class="project-lead">
    프로젝트 개수보다 <strong>어떤 책임을 맡겼고, 어디서 경계를 그었는지</strong>를 먼저 보여줍니다.
    AI를 둘러싼 규칙 관리, 모델 접근, 업무 실행, 검증, 공용 인프라를 각각의 책임으로 나눠 설계합니다.
  </p>
</div>

## 시스템을 나누는 기준

<DiagramFrame caption="상태, 업무 흐름, 실행 증거와 공용 데이터의 책임을 분리한 지도입니다.">

```mermaid
flowchart LR
    User[사람 / 개발자] --> Gateway[GoVail Gateway\n모델 실행 경계]
    Gateway --> Lingo[LingoAgent\ni18n 배포 게이트]
    Gateway --> RAG[SliceRAG\n프로젝트 범위 검색]
    User --> ITGC[ITGC ControlOps\nread-only 증적 수집]
    Data[AI Data Infra\nDB·이벤트·스케줄러] --> RAG
    CLI[Engine CLI\n코딩 에이전트] --> Gateway
    Gateway --> Service[AI Service Infra\nmodel · workflow · observe]
    Service --> Inference[AI Gateway Infra\nDGX · M1 · Mac mini]
    Service --> Data
```

</DiagramFrame>

위 그래프는 제품 간 의존성을 모두 그린 것이 아니라, 시스템을 나누는 기준을 보여주는 지도입니다.
Gateway는 모델 실행 정책을, ITGC ControlOps는 원천 증적 수집을, LingoAgent는 번역 배포 품질을, SliceRAG는 프로젝트별 검색 범위를 맡습니다.

## 대표 시스템

<SelectedProjects />

## 확장 프로젝트와 실험

대표 프로젝트와 책임 범위가 다르거나, 실험으로 공개한 작업입니다. 설명이 없는 GitHub 레포는 제외하고, 나머지 공개 레포는 빌드 시점에 동기화되어 이 목록 아래에 이어집니다.

<OtherProjects />
<AutoProjects />

## 기록할 때 지키는 것

회사에서 만든 코드나 업무 데이터는 개인 프로젝트처럼 다루지 않습니다.

각 작업도 README의 목표보다 실제 구현과 검증 범위를 기준으로 적습니다. 만들 예정인 기능은 만들어진 것처럼 쓰지 않습니다.

[GitHub에서 공개 레포 보기 ↗](https://github.com/devcy0922)
