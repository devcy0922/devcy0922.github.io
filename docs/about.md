---
title: "About"
description: "10년차 풀스택 개발자 devcy0922가 다뤄온 문제와 현재 집중하고 있는 영역."
outline: [2, 3]
---

# About

10년차 풀스택 개발자입니다.

웹 서비스의 화면과 API부터 시작해 인증·권한, 외부 연동, 데이터, 배포와 운영까지 제품이 실제로 돌아가기 위해 필요한 경계를 넓게 다뤄왔습니다. 지금은 이 경험을 **AI Platform / AI Infrastructure / Agent workflow** 영역으로 확장하고 있습니다.

특정 기술을 오래 사용했다는 사실보다 **복잡한 요구를 운영 가능한 구조로 바꾸고, 실패했을 때 어디를 봐야 하는지 남기는 일**을 중요하게 생각합니다.

## 지금 집중하는 것

### AI execution boundary

모델 호출 앞단에서 인증, 정책, 감사, rate limit과 오류 계약을 어디까지 소유해야 하는지 실험하고 있습니다.

Agent가 workflow를 소유하고, Application이 tool과 knowledge를 소유하며, Gateway는 governed model execution에 집중하도록 경계를 좁히는 방향을 선호합니다.

### 작은 모델과 실제 운영

로컬 LLM을 단순히 띄우는 것보다 어떤 요청을 맡길지, 실패 시 어디로 넘길지, 관측과 비용을 어떻게 연결할지에 관심이 있습니다.

모델 선택보다 serving, routing, fallback과 운영 신호를 시스템 문제로 봅니다.

### 제품 만들기

기술 데모를 만드는 것과 사용자가 계속 쓰는 제품을 만드는 것은 다르다고 생각합니다.

사이드 프로젝트에서는 기능 수를 늘리기보다 첫 사용 이유, 반복 사용 루프, 콜드스타트와 과금 지점을 먼저 검토하려고 합니다.

## 다뤄온 영역

- Backend: PHP, Node.js, Python, API 설계와 외부 연동
- Frontend: React 기반 웹 서비스와 제품 UI
- Data: RDB, Redis, 상태와 캐시 설계
- Platform: Docker, CI/CD, AWS, 서비스 운영
- Identity & Security: 인증·권한, Key 관리, 감사 경계
- AI Platform: LLM Gateway, model routing, MCP/Agent execution boundary

기술 목록 자체보다 각 기술이 **어떤 책임을 가져야 하는지**를 구분하는 데 더 관심이 있습니다.

## 일하는 방식

### 경계를 먼저 본다

기능이 늘어날수록 어느 컴포넌트가 무엇을 알아야 하는지 먼저 나눕니다. 가운데 있는 시스템이 모든 책임을 가져가는 구조를 경계합니다.

### 실패를 정상 흐름과 같이 설계한다

Timeout, retry, partial failure, 중복 요청과 복구 경로는 운영에 들어간 뒤 생기는 예외가 아니라 처음부터 API 계약의 일부라고 생각합니다.

### 구현과 주장을 분리한다

아직 구현하지 않은 기능, 실험만 한 기능, 운영에서 검증한 기능을 같은 상태로 소개하지 않으려고 합니다.

공개 프로젝트도 데모나 실험 목적이 섞여 있다면 그 한계를 함께 기록합니다.

## 이 블로그에서 쓰는 것

- AI 플랫폼과 LLM 운영 경계
- Backend / API / Reliability
- Docker와 인프라 운영에서 겪은 문제
- Agent와 자동화 workflow
- 제품을 만들면서 바뀐 판단
- 실패한 아이디어와 그만둔 이유

완성된 교과서를 쓰기보다 **직접 만들면서 생각이 어떻게 바뀌었는지**를 남기는 쪽에 가깝습니다.

[최근 글 읽기](/posts/) · [프로젝트 보기](/projects/) · [GitHub ↗](https://github.com/devcy0922)
