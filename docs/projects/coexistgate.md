---
title: "coexistgate"
description: "변경을 안전하게 릴리스하고 롤백할 수 있는지 검증하는 Cross-artifact release safety engine."
---

# coexistgate

변경이 여러 산출물에 걸쳐 안전하게 릴리스되고, 필요할 때 되돌릴 수 있는지 검증하는 릴리스 안전성 엔진입니다.

- **상태**: 공개 개발 중
- **저장소**: [devcy0922/coexistgate](https://github.com/devcy0922/coexistgate)
- **기술**: Rust

## 핵심 질문

> 이 변경은 안전하게 릴리스하고 롤백할 수 있는가?

산출물 간 의존성과 변경 경계를 확인해 배포 전에 실패 경로를 드러내는 것을 목표로 합니다.
