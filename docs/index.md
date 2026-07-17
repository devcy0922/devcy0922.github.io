---
layout: home
hero:
  name: "devcy0922"
  text: "AI SaaS Platform & DevSecOps"
  tagline: "인증, 테넌트 격리, 모델 라우팅, 감사 가능성과 보안 회귀 검증을 하나의 운영 경계로 설계합니다."
  actions:
    - theme: brand
      text: Explore Projects
      link: /projects/aegis-llm
    - theme: alt
      text: GitHub Profile
      link: https://github.com/devcy0922
      target: _blank

features:
  - title: "Aegis-LLM — SaaS Control Plane"
    details: "API Key 인증, 프로젝트별 RPM 제한, DLP, Prompt Security, Audit Log와 Upstream Fallback을 제공하는 Rust 기반 AI Gateway MVP입니다."
    link: /projects/aegis-llm
  - title: "SliceRAG — Tenant-isolated Data Plane"
    details: "Gateway가 확정한 project_id 범위 안에서만 문서를 저장·검색하고 교차 테넌트 접근을 회귀 테스트로 차단하는 내부 RAG 서비스입니다."
    link: /projects/slicerag
  - title: "AgentSecOps — Governance E2E"
    details: "인증, RAG 격리, PII 마스킹, Prompt Injection 차단과 LLM Fallback을 가상 데이터로 자동 검증하는 Docker Compose 기반 하네스입니다."
    link: /projects/agentsecops-playground
  - title: "AI Gateway — Inference Routing"
    details: "LiteLLM으로 vLLM과 MLX를 OpenAI-compatible API로 통합하고 모델 별칭, Least-busy 라우팅, Retry와 Fallback을 선언한 인프라 템플릿입니다."
    link: /projects/ai-gateway-infra-demo
  - title: "LingoAgent — Vertical SaaS Prototype"
    details: "ICU 변수 무결성 검사, LLM-as-a-Judge 재검증, Diff 검토와 승인 배포 흐름을 제공하는 i18n 자동화 제품 프로토타입입니다."
    link: /projects/lingo-agent
  - title: "Aperture-MCP — Zero-trust Policy Proxy"
    details: "MCP tools/call 요청을 가로채 정책 Gateway의 위험도 판정에 따라 고위험 도구 실행을 차단하는 Rust 기반 프록시 MVP입니다."
    link: /projects/aperture-mcp
---

