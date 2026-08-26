---
title: "기술 블로그를 다시 만들면서 VitePress를 남긴 이유"
date: 2026-08-24
description: "새 프레임워크로 갈아엎는 대신 기존 VitePress를 콘텐츠 중심 구조로 줄인 이유와 블로그의 유지 비용을 생각한 기록."
tags:
  - DevLog
  - VitePress
  - Product
---

# 기술 블로그를 다시 만들면서 VitePress를 남긴 이유

개발자가 개인 사이트를 다시 만들기 시작하면 프레임워크를 고르는 데 쉽게 빠진다.

Next.js로 갈지, Astro로 갈지, headless CMS를 붙일지, 검색과 태그는 어떤 서비스로 만들지 고민하다 보면 정작 글은 하나도 없다.

나도 기존 사이트가 마음에 들지 않았지만 이번에는 스택보다 먼저 질문을 바꿨다.

> 이 사이트에서 가장 자주 해야 하는 작업은 무엇인가?

답은 개발이 아니라 **글 하나를 추가하는 것**이었다.

그래서 기존 VitePress를 버리지 않았다.

## 기존 사이트의 문제는 프레임워크가 아니었다

이전 홈에는 보여주고 싶은 것이 너무 많았다.

- 경력
- 프로젝트
- 아키텍처
- 데모
- 다국어
- 검증 수치
- CTA
- 프로젝트별 상태

각 기능은 따로 보면 이유가 있었다.

하지만 한 화면에 모이면 방문자는 "이 사람이 어떤 생각을 하는 개발자인가"보다 사이트 기능부터 해석해야 했다.

문제는 VitePress가 문서 도구라서가 아니라 **홈페이지가 제품 소개서처럼 커진 것**이었다.

## 블로그의 요구사항을 다시 줄였다

이번에는 요구사항을 네 개만 남겼다.

1. Markdown 하나를 추가하면 글이 된다.
2. 홈과 글 목록이 자동으로 갱신된다.
3. 서버 없이 GitHub Pages에 배포된다.
4. 몇 달 쉬었다 돌아와도 구조를 다시 공부할 필요가 없다.

VitePress는 이미 이 조건 대부분을 만족하고 있었다.

특히 `createContentLoader`로 Markdown frontmatter를 읽어 글 목록을 만들 수 있어서 별도 CMS나 데이터 파일을 유지할 필요가 없다.

```js
export default createContentLoader('posts/*.md', {
  transform(raw) {
    return raw
      .filter((page) => page.frontmatter.date)
      .sort((a, b) =>
        +new Date(b.frontmatter.date) - +new Date(a.frontmatter.date)
      )
  }
})
```

새 글의 source of truth는 계속 Markdown이다.

## 기능을 더한 것이 아니라 제거했다

이번 개편에서 중요한 작업은 새 기능 추가보다 제거였다.

다국어 런타임과 번역 workflow를 홈에서 걷어냈다. 특정 프로젝트의 live demo도 전역 내비게이션에서 제거했다. 숫자 카드와 프로젝트 홍보 섹션도 없앴다.

남긴 것은 다음뿐이다.

```text
Home
 ├─ Latest writing
 ├─ Selected work
 └─ About

Posts
 └─ Markdown

Build
 ├─ local search
 ├─ sitemap
 ├─ RSS
 └─ GitHub Pages
```

기술 블로그의 인프라는 글보다 존재감이 작아야 한다고 봤다.

## 디자인도 같은 기준으로 줄였다

개발자 사이트에서 흔한 다크 배경 + 네온 색 + 카드 묶음을 피했다.

대신 실제 일하는 방식에서 하나를 가져왔다.

```text
problem → boundary → build → operate → write
```

분산 시스템의 trace처럼 한 줄로 보여주고, 나머지는 최대한 조용한 목록형 UI로 만들었다.

시그니처는 하나만 쓰고, 글 제목과 설명이 더 강하게 보이도록 했다.

## 앞으로의 유지 기준

블로그 기능을 추가할 때는 이 질문을 먼저 할 생각이다.

> 이 기능이 글을 더 잘 쓰거나 찾게 해주는가?

그렇지 않으면 대부분 넣지 않는다.

댓글, 조회수, 복잡한 CMS, 자체 분석 시스템은 필요가 생긴 뒤에 결정해도 늦지 않다.

이번 개편의 목표는 멋진 블로그 엔진을 만드는 것이 아니다.

**개발하면서 생긴 판단을 가장 적은 마찰로 남기는 공간을 만드는 것**이다.
