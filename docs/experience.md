---
title: "Experience"
description: "10년간 기업용 백엔드, 인증·연동, 데이터와 배포·운영 영역에서 맡아온 책임과 현재의 AI 플랫폼 작업"
outline: [2, 3]
---

# Experience

## 기업 시스템을 개발하고 운영해 온 10년

10년 차 **Backend / AI Platform Engineer**입니다. B2B·SaaS와 기업 내부 시스템에서 백엔드 개발, 인증·권한, 외부 API와 데이터 연동, 배포 자동화, 성능 개선과 장애 대응을 맡아왔습니다.

특정 기술을 오래 사용했다는 사실보다 **복잡한 업무 요구를 운영 가능한 시스템으로 바꾸고, 변경과 장애의 영향을 추적할 수 있게 만드는 일**을 강점으로 삼습니다. 현재는 이 경험을 AI 서비스의 API, 보안, 데이터 격리와 운영 자동화에 적용하고 있습니다.

## 공개 범위

회사에서 수행한 업무의 소스 코드와 세부 운영 수치는 공개할 수 없습니다. 이 페이지에서는 실제 책임 범위와 설계·운영 원칙을 설명하고, 공개 가능한 개인 프로젝트는 별도 링크로 구현 근거를 제공합니다. 비공개 회사 작업을 공개 코드로 대체하거나 검증되지 않은 수치로 과장하지 않습니다.

## 핵심 책임 영역

### Enterprise Backend & Integration

- 사내 업무 시스템과 B2B·SaaS 백엔드 개발 및 운영
- 레거시 시스템 현대화와 외부 API·데이터 연동
- SQL 병목과 Redis 캐시를 포함한 애플리케이션 성능 개선
- 변경 범위를 예측할 수 있도록 도메인과 서비스 책임 분리

### Identity, Data & Security

- SSO와 역할 기반 권한, Key 관리와 최소 권한 원칙 적용
- RDB·Redis를 포함한 데이터 접근 경계와 상태 관리
- 감사에 필요한 이벤트와 추적 정보 설계
- 민감한 원문과 인증정보를 저장하지 않는 로깅 범위 구분

### Delivery & Reliability

- CI/CD와 Docker 기반 실행 환경 표준화
- AWS 환경의 서비스 배포·운영과 장애 원인 추적
- 로드밸런싱과 고가용성을 고려한 서비스 구성
- 변경 위험을 줄이기 위한 자동화와 운영 절차 정리

## 문제를 다루는 방식

1. **경계를 먼저 구분합니다.** 인증, 정책, 데이터와 실행 책임이 섞이지 않도록 요청 흐름을 나눕니다.
2. **실패를 정상 흐름과 함께 설계합니다.** 차단, Timeout과 Upstream 오류가 어디에서 끝나고 무엇을 남겨야 하는지 정의합니다.
3. **운영자가 확인할 수 있는 신호를 남깁니다.** 상태, 지연과 Trace를 연결하되 Secret과 민감한 원문은 관측 범위에서 제외합니다.
4. **현재 구현과 다음 단계를 분리합니다.** 검증되지 않은 기능이나 수치는 현재 성과로 주장하지 않습니다.

## 현재의 AI Platform 작업

생성형 AI가 기업 시스템에 들어와도 인증, 권한, 감사, 데이터 관리와 장애 대응의 기본 문제는 사라지지 않습니다. 현재는 기존 플랫폼 경험을 다음 영역에 적용하고 있습니다.

- AI 요청의 인증, 모델 접근 정책과 사용량 제한
- MCP Tool 실행 전 정책 검사와 RAG 데이터 범위 격리
- 사설 모델 Runtime과 외부 API 계약의 분리
- 보안 회귀 테스트, Trace와 원문 비저장 감사

[GoVail Gateway](/projects/govail-gateway)는 이 가운데 요청과 운영 경계를 검증한 대표 사례이며, [LingoAgent](/projects/lingo-agent)와 [Leandraft Linter](/projects/leandraft-linter)는 자동화 파이프라인과 개발 도구 설계 경험을 보여줍니다. 전체 작업은 [프로젝트 목록](/projects/)에서 역할별로 확인할 수 있습니다.

## 포지션 정체성

가장 잘 맞는 역할은 **Backend / AI Platform Engineer**, **AI Infrastructure & Platform Engineer**, **Developer Platform Engineer**입니다. 모델 학습이나 GPU Kernel 연구보다 API 설계, 인증·연동, 데이터 경계, 배포 자동화와 관측 가능한 운영에 강점이 있습니다.

새로운 프로젝트 수를 늘리기보다 부하 테스트, 장애 주입, SLO와 복구 절차처럼 운영 깊이를 보여주는 근거를 보강합니다. 구현되지 않은 항목은 현재 기능으로 주장하지 않고 각 프로젝트의 `Next Steps`로 구분합니다.

<div class="portfolio-page-actions">
  <a href="/projects/">프로젝트 전체 보기</a>
  <a href="/live-demo">대표 사례 데모 보기</a>
  <a href="https://github.com/devcy0922" target="_blank" rel="noopener">GitHub에서 공개 코드 보기 ↗</a>
</div>
