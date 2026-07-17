---
title: Live LLM Demo
description: GCP API Gateway와 GoVail 정책 경계를 통과하는 사설 LLM을 직접 체험합니다.
aside: false
outline: false
---

# AI Platform Live Lab

첫 화면과 동일한 실전형 분석 환경입니다. 일반 채팅 대신 아키텍처 검토, 장애 분석, PR 위험 분석을 실제 사설 LLM 경로에서 실행합니다.

<LiveLlmDemo />

## 이 요청에서 검증되는 것

1. GCP API Gateway가 외부 요청을 단일 공개 경로로 받습니다.
2. GoVail Gateway가 SurrealDB의 Key Hash로 `portfolio-demo` 프로젝트를 식별합니다.
3. 분당 요청 수, 허용 모델, 입력 크기, DLP와 Prompt Policy를 검사합니다.
4. LiteLLM이 `auto` 별칭을 실제 추론 Backend로 라우팅합니다.
5. Trace ID, 상태, 지연시간을 감사 이벤트로 남겨 운영 경로를 재현할 수 있게 합니다.

## 공개 체험의 경계

- 체험 Key는 `portfolio-demo` 프로젝트와 `auto` 모델에만 사용할 수 있습니다.
- 분당 4회, 질문 2,000자, 출력 512 tokens로 제한합니다.
- 프롬프트와 답변 원문은 포트폴리오 방문 분석 목적으로 저장하지 않습니다.
- 운영 상태나 자원 예산에 따라 체험이 일시적으로 중지될 수 있습니다.
- 이 환경은 서비스 SLA를 제공하는 공개 API가 아니라 아키텍처 검증용 Demo입니다.

상세 설계와 보안 판단은 [AI Gateway Infra Demo](/projects/ai-gateway-infra-demo)와 [Aegis-LLM](/projects/aegis-llm)에서 확인할 수 있습니다.
