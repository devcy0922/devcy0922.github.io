---
title: "Production Experience"
description: "10년 차 기업용 백엔드·플랫폼 경험이 AI Gateway와 Agent Security 설계로 이어진 과정"
outline: [2, 3]
---

# Production Experience

## 기업용 백엔드 경험을 AI 플랫폼으로 확장합니다

10년 차 **Backend / AI Platform Engineer**입니다. 기업 내부 시스템을 개발하고 운영하며 다뤄온 인증·권한, 감사, 배포, 클라우드 운영과 레거시 연동 문제를 생성형 AI 요청 경계에 맞게 다시 설계하고 있습니다.

현재 포트폴리오의 중심은 모델 학습이 아니라 **기업이 AI를 안전하게 연결하고 운영하는 플랫폼 경계**입니다. [GoVail Gateway](/projects/govail-gateway)를 대표 시스템으로 두고, 공개 저장소와 [Live Lab](/live-demo)에서 구현 범위와 한계를 검증할 수 있게 구성했습니다.

## 실무 문제와 AI 플랫폼 설계의 연결

| 기업 시스템에서 다뤄온 문제 | AI 플랫폼에서의 설계 판단 | 공개 근거 |
|---|---|---|
| SSO, 인증과 역할 기반 권한 | API Key를 Project·Role·RPM·Allowed Models가 포함된 Principal로 변환 | [GoVail Gateway](/projects/govail-gateway), [Aegis-LLM](/projects/aegis-llm) |
| 감사 대응과 Key 관리 | 원문과 Secret을 남기지 않는 Audit Event, Trace ID 기반 추적 | [GoVail Gateway](/projects/govail-gateway) |
| CI/CD와 Docker 실행 환경 표준화 | 재현 가능한 통합 환경과 보안 회귀 테스트 | [AgentSecOps Playground](/projects/agentsecops-playground), [AI Gateway Infra Demo](/projects/ai-gateway-infra-demo) |
| AWS 운영과 장애 대응 | Gateway, Upstream, Data Plane의 실패 경계와 관측 신호 분리 | [Live Lab](/live-demo), [Infra Security](/projects/infra-security) |
| 레거시 데이터와 외부 API 연동 | Project 단위 RAG 격리와 MCP Tool 실행 전 정책 검사 | [SliceRAG](/projects/slicerag), [Aperture MCP](/projects/aperture-mcp) |

## 책임 범위

### Enterprise Backend & Integration

- 사내 업무 시스템과 B2B 백엔드의 인증·권한 경계 설계
- 레거시 데이터, 외부 API와 업무 흐름의 안정적인 연동
- SQL 병목과 Redis 캐시를 포함한 애플리케이션 성능 개선

### Delivery & Cloud Operations

- CI/CD와 Docker 기반 실행 환경 표준화
- AWS 환경의 배포·운영과 장애 원인 추적
- 변경 위험을 줄이기 위한 자동화와 운영 절차 정리

### Security & Auditability

- SSO, Key 관리와 최소 권한 원칙 적용
- 감사에 필요한 이벤트와 추적 정보 설계
- 민감한 원문과 인증정보를 저장하지 않는 로깅 경계 구분

## GoVail로 이어진 이유

생성형 AI가 기업 시스템에 들어오면 기존의 인증, 권한, 감사와 장애 문제가 사라지는 것이 아니라 **모델·프롬프트·도구·RAG 데이터라는 새로운 자원까지 확장**됩니다. GoVail은 이 문제를 다음의 실행 경계로 나눠 검증한 결과입니다.

1. **Request Boundary** — 누가 어떤 Project와 Model에 접근할 수 있는지 확인합니다.
2. **Tool & Data Boundary** — MCP Tool 실행과 RAG 검색 범위를 정책으로 제한합니다.
3. **Runtime Boundary** — 내부 Model ID와 사설 Runtime을 공개 요청에서 분리합니다.
4. **Operations Boundary** — 원문을 저장하지 않고도 Trace, 상태와 지연을 관측합니다.

## 포지션 정체성

가장 잘 맞는 역할은 **Backend / AI Platform Engineer**, **AI Infrastructure & Platform Engineer**, **Developer Platform Engineer**입니다. 모델 학습이나 GPU Kernel 연구보다 API 호환, 인증·정책, 데이터 격리, 모델 서빙 경계와 관측 가능한 운영에 강점이 있습니다.

다음 단계에서는 새로운 프로젝트 수를 늘리기보다 부하 테스트, 장애 주입, SLO와 복구 절차처럼 운영 깊이를 보여주는 증거를 보강합니다. 구현되지 않은 항목은 현재 기능으로 주장하지 않고 각 프로젝트의 `Next Steps`로 구분합니다.

<div class="portfolio-page-actions">
  <a href="/projects/govail-gateway">대표 시스템 보기</a>
  <a href="/live-demo">실행 경로 확인하기</a>
  <a href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub에서 공개 코드 보기 ↗</a>
</div>
