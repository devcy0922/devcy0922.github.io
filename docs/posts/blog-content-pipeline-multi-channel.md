---
title: "블로그 콘텐츠 파이프라인 — 하나의 원본, 여러 채널로 보내기"
date: 2026-11-20
description: "Obsidian 마크다운 형식을 원본으로 저장하고, MariaDB에서 관리하며, 개발자 블로그·네이버·티스토리·벨로그 등 여러 채널에 변환·발행하는 멀티 채널 Publishing 아키텍처를 설계하고 구현한 기록."
tags:
  - DevLog
  - Blog Studio
  - Content Pipeline
  - Architecture
  - Multi-Channel
---

# 블로그 콘텐츠 파이프라인 — 하나의 원본, 여러 채널로 보내기

블로그 글을 쓸 때 가장 골치 아픈 문제는 "어디에 쓸지"가 아니다. "한 번 썼으면 모든 곳에" 보내는 과정이다. 개발자 블로그에 올리면 네이버 블로그는 또 다르고, 티스토리는 또 다르다. 각 플랫폼마다 형식이 달라서 수정할 때마다 여러 곳을 다시 고쳐야 했다.

그래서 하나의 원본에서 여러 출력물을 만드는 파이프라인을 설계했다. Obsidian 호환 마크다운을 원본(SSOT)으로 두고, 이를 MariaDB에서 관리하면서 여러 외부 채널에 변환·발행한다.

## 왜 Obsidian 호환 마크다운인가

Obsidian 마크다운은 순수 마크다운 파일 저장소다. 양방향 링크(`[[위키링크]]`), 콜아웃(`>[!NOTE]`), 메타데이터(frontmatter)를 모두 마크다운 파일 안에 담는다. 외부 서비스나 데이터베이스에 의존하지 않으므로, 노트 앱이 사라져도 파일은 그대로 남아 있다.

블로그 글을 Obsidian 호환 형식으로 쓰면 얻는 이점이 세 가지 있다.

1. **저마찰 글쓰기:** 로컬에서 빠르고, 검색이 좋으며, 양방향 링크로 아이디어를 연결한다.
2. **포맷 독립성:** Obsidian 마크다운은 도구 종속이 아니다. 다른 노트 앱이나 정적 사이트 생성기로 옮겨도 파일은 그대로 쓸 수 있다.
3. **자동화 가능:** 원본이 마크다운이면, 변환 로직만 있으면 어디든 보낼 수 있다.

물론 단점도 있다. `[[위키링크]]`와 `>[!NOTE]` 콜아웃은 다른 플랫폼에서 직접 렌더링되지 않는다. 따라서 Obsidian 호환 마크다운을 각 채널 형식으로 변환해야 한다.

## 아키텍처 개요

블로그 스튜디오(Blog Studio)는 4층 구조로 설계했다. 각 층은 명확한 책임을 가지며, 한 층의 변경이 다른 층에 파급되지 않도록 경계를 뒀다.

### Layer 1: 데이터 저장

변환된 포스트와 메타데이터, 채널 정보를 MariaDB에 영속화한다. `posts` 테이블에 포스트 본문·메타데이터를 저장하고, `channels` 테이블에 발행 채널 정보를, `post_publishes` 테이블에 채널별 발행 이력을 기록한다.

MariaDB를 선택한 이유는 기존 내부 DB 인프라와 연동할 수 있었기 때문이다. mysql2 풀을 통해 연결을 관리하며, InnoDB 엔진으로 트랜잭션을 보장한다.

테이블 구조는 다음과 같다. 아래 목록은 테이블별 컬럼을 정리한 요약이며 실제 DDL이 아니다. 실제 생성 코드는 `blog-studio/src/server/db.ts`의 `initDatabase()`(23~101줄)에 있다.

<!-- illustrative: 테이블별 컬럼 요약 목록(원본 DDL 아님) -->
```
posts 테이블:
  id, slug (UNIQUE), title, description, content, date, status, created_at, updated_at

tags 테이블:
  id, post_id (FK), tag (UNIQUE on post_id+tag)

channels 테이블:
  id (PK), name, type, description, is_active, created_at

post_publishes 테이블:
  id, post_id (FK), channel_id (FK), status, published_url, published_at, payload_snapshot

backlinks 테이블:
  id, source_post_id (FK), target_slug, link_text, context

revisions 테이블:
  id, post_id (FK), content, diff_summary, created_at
```

`post_publishes` 테이블의 설계가 중요한 결정이었다. 각 포스트별로 채널마다 독립된 상태를 기록하므로, 같은 포스트가 하나의 채널에서는 `published`, 다른 채널에서는 `draft` 상태가 될 수 있다. `payload_snapshot` 컬럼에는 해당 채널에 변환된 콘텐츠의 일부를 스냅샷으로 저장해 나중에 어떤 형식으로 보냈는지 확인할 수 있다.

### Layer 2: 변환기 (Transformer)

Obsidian 호환 마크다운을 각 채널 형식으로 변환하는 층이다. 네 가지 채널에 각각 전용 변환 함수가 있다.

`transformForVitePress()`는 개발자 블로그용이다. `[[위키링크]]`를 `[라벨](./slug)` 상대 경로 링크로 바꾸고, frontmatter를 VitePress 형식으로 재작성한다.

`transformForNaver()`는 네이버 블로그 스마트에디터 호환 HTML을 생성한다. 인라인 스타일 CSS를 적용한 `<div>`로 감싸고, 콜아웃을 박스형 스타일로 변환한다.

`transformForTistory()`와 `transformForVelog()`도 각각 티스토리·벨로그 호환 형식으로 변환한다.

변환 함수 선언의 첫 부분(실제 코드 14줄)은 이렇다.

<!-- source: blog-studio/src/server/transformer.ts#L14-L14 -->
```typescript
export function transformForVitePress(post: Post, slugMap: Map<string, string>): string {
```

나머지 셋은 같은 파일에서 각각 28줄(`transformForNaver(post)`), 57줄(`transformForTistory(post)`), 67줄(`transformForVelog(post)`)에 같은 방식으로 선언된다.

변환 로직의 핵심은 `[[위키링크]]`를 각 채널의 링크 형식으로 바꾸는 것이다. Obsidian의 `[[타이틀|별명]]`은 VitePress에서는 `[별명](./slug)`, 네이버에서는 `<strong>` 태그로, 티스토리·벨로그에서는 `**별명**` 마크다운 굵게로 변환한다(각각 32~34줄, 58~59줄, 68~69줄).

### Layer 3: 발행 (Publish)

변환된 결과를 각 채널에 발행한다. `publishToChannel()` 함수가 slug와 채널 ID를 받아 해당 채널 형식으로 변환하고 상태를 업데이트한다. 함수 서명은 이렇다(실제 코드 82줄).

<!-- source: blog-studio/src/server/transformer.ts#L82-L82 -->
```typescript
export async function publishToChannel(slug: string, channelId: string): Promise<{ success: boolean; url?: string; error?: string }> {
```

여기서 중요한 점은 네 가지 채널의 동작이 모두 같지는 않다는 것이다.

- **devcy0922:** `fs.writeFileSync()`로 로컬 파일 디렉터리에 마크다운을 실제로 쓴다. 즉, 실제 파일 동기화가 일어난다.
- **naver_blog, tistory, velog:** 변환 결과만 생성하고 DB에 `published` 상태와 "준비완료" 문구를 기록한다. 실제 외부 API 호출이나 게시는 하지 않는다.

즉, `naver_blog`·`tistory`·`velog` 채널은 현재 **변환 결과 생성**까지만 구현되어 있고, 실제 게시(External API 호출)는 구현되지 않은 상태다.

### Layer 4: API 서버

Express 기반 REST API다. 포트 9180에서 실행되며, 클라이언트(웹 UI)가 포스트를 관리하고 채널별 발행을 실행할 수 있다. 아래 목록은 요약이며 실제 코드에서 옮긴 것이 아니다. 노선 등록 코드는 `blog-studio/src/server/index.ts`에 있다(health 35줄, channels 46줄, posts 목록 56줄, 포스트 조회 66줄, 저장 81줄, 삭제 92줄, 발행 104줄, 미리보기 117줄, 동기화 144줄, 그래프 154줄, AI 164~191줄).

<!-- illustrative: API 노선 요약 목록(요약이지 소스 사본 아님) -->
```
GET    /api/health              ← 헬스체크 (MariaDB 연결 상태 포함)
GET    /api/channels            ← 지원 채널 목록
GET    /api/posts               ← 포스트 목록
GET    /api/posts/:slug         ← 특정 포스트 상세 (백링크·아웃링크 포함)
POST   /api/posts               ← 포스트 저장 (생성/갱신)
DELETE /api/posts/:slug         ← 포스트 삭제
POST   /api/posts/:slug/publish/:channelId  ← 채널별 발행
GET    /api/posts/:slug/preview/:channelId  ← 채널별 변환 결과 미리보기
POST   /api/sync/import         ← 블로그 레포에서 DB로 수동 동기화
GET    /api/graph               ← 지식 그래프 데이터
POST   /api/ai/outline          ← AI 목차 생성
POST   /api/ai/draft            ← AI 초안 작성
POST   /api/ai/polish           ← AI 퇴고
POST   /api/ai/metadata         ← AI 메타데이터 생성
```

API 서버 기동 시 MariaDB 테이블을 자동 생성(`initDatabase()`)하고, 블로그 레포의 posts 디렉토리에서 콘텐츠를 DB로 첫 동기화를 실행한다(`syncFromBlogRepo()`).

## 동기화: 블로그 레포에서 DB로

블로그 스튜디오의 동기화(`syncFromBlogRepo()`)는 Obsidian vault를 읽는 것이 아니라, 블로그 레포지토리의 `docs/posts/` 디렉토리에서 마크다운 파일을 읽어 MariaDB에 가져온다. 경로는 이렇게 정해진다(6~7줄).

<!-- source: blog-studio/src/server/sync.ts#L6-L7 -->
```typescript
export const BLOG_REPO_DIR = process.env.BLOG_REPO_DIR || path.resolve(process.cwd(), '../devcy0922.github.io');
export const POSTS_DIR = path.resolve(BLOG_REPO_DIR, 'docs/posts');
```

동기화 함수는 이렇게 시작한다(12~18줄).

<!-- source: blog-studio/src/server/sync.ts#L12-L18 -->
```typescript
export async function syncFromBlogRepo(): Promise<{ total: number; imported: number; updated: number }> {
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[Sync] 포스트 디렉토리를 찾을 수 없습니다: ${POSTS_DIR}`);
    return { total: 0, imported: 0, updated: 0 };
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && f !== 'index.md');
```

이 설계의 의도는 다음과 같다. 블로그 스튜디오는 블로그 레포지토리의 `docs/posts/` 디렉토리를 소스로 삼아 DB에 동기화한다. 즉, Blog Studio의 실제 데이터 흐름은 **블로그 레포 → MariaDB**이며, Obsidian vault → 레포 간 흐름은 이 도구의 범위에 포함되지 않는다.

wiki 문서에서는 "Obsidian Markdown SSOT"이라는 개념적 레이블을 사용하지만, 코드 상에서 Blog Studio가 직접 Obsidian vault를 읽지는 않는다. `obsidian.ts`의 `parseMarkdownFile()`은 **원본 파일**(블로그 레포의 `.md` 파일)을 읽은 직후 호출되고(`sync.ts` 24~25줄), `extractWikilinks()`는 동기화 이후 백링크를 갱신하는 `refreshAllBacklinks()`에서 호출된다(`sync.ts` 69줄).

## 채널별 변환: 실제 코드에서 본 차이

Obsidian의 `[[위키링크]]`가 각 채널에서 어떻게 처리되는지 실제 코드에서 확인했다.

우선 위키링크를 찾는 정규식(obsidian.ts 9줄).

<!-- source: blog-studio/src/server/obsidian.ts#L9-L9 -->
```typescript
const WIKILINK_REGEX = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;
```

VitePress 채널은 slug 매핑으로 상대 링크로 바꾼다(obsidian.ts 40~52줄).

<!-- source: blog-studio/src/server/obsidian.ts#L40-L52 -->
```typescript
export function convertWikilinksToVitePress(content: string, slugMap: Map<string, string>): string {
  return content.replace(WIKILINK_REGEX, (_match, rawTarget, alias) => {
    const target = rawTarget.trim();
    const [pageTarget, heading] = target.split('#');
    const label = alias?.trim() || target;

    // slugMap에서 제목이나 파일명에 매핑되는 slug를 찾는다. 없으면 target 그대로 slug화
    const targetSlug = slugMap.get(pageTarget) || slugMap.get(pageTarget.toLowerCase()) || pageTarget;
    const hash = heading ? `#${heading.trim()}` : '';

    return `[${label}](./${targetSlug}${hash})`;
  });
}
```

네이버 채널은 `<strong>` 태그로 치환한다(transformer.ts 31~34줄).

<!-- source: blog-studio/src/server/transformer.ts#L31-L34 -->
```typescript
  // [[위키링크]] 일반 텍스트 볼드로 치환
  html = html.replace(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (_, target, alias) => {
    return `<strong>${alias || target}</strong>`;
  });
```

티스토리는 마크다운 굵게로 바꾼다(transformer.ts 58~60줄).

<!-- source: blog-studio/src/server/transformer.ts#L58-L60 -->
```typescript
  let content = post.content.replace(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (_, target, alias) => {
    return `**${alias || target}**`;
  });
```

벨로그도 같은 방식이다(transformer.ts 68~70줄).

<!-- source: blog-studio/src/server/transformer.ts#L68-L70 -->
```typescript
  let content = post.content.replace(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (_, target, alias) => {
    return `**${alias || target}**`;
  });
```

채널마다 처리 방식이 다르다는 것까지만 코드로 확인했다. 왜 이렇게 나눴는지는 소스에 적혀 있지 않아 이 글에서는 추측하지 않는다.

## 구현 과정에서 배운 것

### 1. Obsidian 특화 문법의 경계

Obsidian 마크다운은 "완전한 마크다운 표준"이 아니다. `[[위키링크]]`와 `>[!NOTE]`는 Obsidian 고유의 확장 문법이다. 이 문법을 다른 플랫폼으로 옮길 때, "어디까지 호환할 것인가"를 정해야 했다.

결론은 채널별로 "어떤 Obsidian 문법을 어떤 형식으로 변환할지"를 명시적으로 정의하는 것이었다. 모든 Obsidian 특화 문법을 무작정 일반 마크다운으로 바꾸는 것이 아니라, 각 채널의 렌더링 능력을 고려해 선택적으로 변환한다.

### 2. publishToChannel은 if-else 분기다

새 채널을 추가할 때 기존 코드를 수정하지 않도록 인터페이스로 분리했다는 wiki 문서의 설명과 달리, 실제 코드는 `if (channelId === ...)` 분기로 구현되어 있다.

`transformer.ts`를 열어 보면 `publishToChannel()` 본문은 try 블록 안에서 채널 ID별 `if` 문을 순차로 배치하고 각 분기가 `return`으로 끝나는 구조다. 분기 시작 지점은 `devcy0922` 94줄, `naver_blog` 108줄, `tistory` 114줄, `velog` 120줄이며, 어느 채널에도 해당하지 않으면 126줄에서 `지원하지 않는 채널입니다`를 반환한다. 구조만 요약한 예시는 다음과 같다(실제 코드의 축약이다).

<!-- illustrative: if 분기 구조 요약(실제 코드의 축약) -->
```
if (channelId === 'devcy0922') { ... }
if (channelId === 'naver_blog') { ... }
if (channelId === 'tistory') { ... }
if (channelId === 'velog') { ... }
```

새 채널을 추가하려면 `publishToChannel()` 함수 안에 새로운 `if` 분기를 추가해야 한다. 코드 확장에 Open/Closed Principle을 지키려면 실제 인터페이스 기반 설계로 변경이 필요하다.

### 3. "발행"과 "변환"의 차이

`naver_blog`, `tistory`, `velog` 채널은 `publishToChannel()`이 `published` 상태를 기록하지만, 실제 외부 게시는 하지 않는다. DB에 "준비완료" 문구만 남길 뿐이다. `naver_blog` 분기 전체(transformer.ts 108~112줄)가 이렇다.

<!-- source: blog-studio/src/server/transformer.ts#L108-L112 -->
```typescript
    if (channelId === 'naver_blog') {
      const naverHtml = transformForNaver(post);
      await updateChannelPublishStatus(post.id, 'naver_blog', 'published', 'https://blog.naver.com (준비완료)', naverHtml.slice(0, 1000));
      return { success: true, url: '네이버 블로그 HTML 클립보드/규격 준비 완료' };
    }
```

이것은 아직 구현 중이거나, 또는 "변환 결과 생성"까지만 목표로 한 설계일 수 있다. 이 점을 정확히 명시하지 않으면 독자가 "왜 실제 게시가 안 되지?"라고 의문을 가질 수 있다.

### 4. 백링크는 동기화 단계에서 계산

`syncFromBlogRepo()`는 모든 포스트를 DB에 저장한 후 `refreshAllBacklinks()`를 호출한다. 이 함수는 모든 포스트의 본문을 스캔하여 `[[위키링크]]`를 추출하고, `backlinks` 테이블에 저장한다. 아래는 `refreshAllBacklinks()` 전체(57~81줄)를 그대로 옮긴 코드다.

<!-- source: blog-studio/src/server/sync.ts#L57-L81 -->
```typescript
export async function refreshAllBacklinks(): Promise<void> {
  const [rows] = await pool.query('SELECT id, slug, content FROM posts');
  const posts = rows as { id: number; slug: string; content: string }[];

  const allPostSummaries = await getAllPosts();
  const slugTitleMap = new Map<string, string>();
  for (const p of allPostSummaries) {
    slugTitleMap.set(p.slug.toLowerCase(), p.slug);
    slugTitleMap.set(p.title.toLowerCase(), p.slug);
  }

  for (const post of posts) {
    const links = extractWikilinks(post.content || '');
    const backlinkEntries = links.map((l) => {
      const targetSlug = slugTitleMap.get(l.target.toLowerCase()) || l.target;
      return {
        target_slug: targetSlug,
        link_text: l.alias || l.target,
        context: l.context,
      };
    });

    await updateBacklinksForPost(post.id, backlinkEntries);
  }
}
```

## 검증 결과

이 프로젝트의 검증 결과는 wiki 문서에 기록된 바와 같다. 직접 확인한 것은 소스 코드의 구조와 데이터 흐름일 뿐이다. wiki 문서 기록에 따르면:

- 단위 테스트: `pnpm test` 통과 (8/8 tests pass)
- 정적 타입 검증: `pnpm typecheck` (0 errors)
- 런타임 헬스체크: `curl http://127.0.0.1:9180/api/health` 200 OK (`db: mariadb`)
- 채널 API 검증: `GET /api/channels` (4개 채널 정상 조회)

이 실행에서는 직접 빌드하거나 테스트를 실행하지 않았으며, 위의 결과는 모두 wiki 문서의 전승이다. 그 wiki 문서 원문은 이번 글에 인용한 소스 스냅샷에 포함되어 있지 않아, 이번 작성 과정에서 원문까지 다시 확인하지는 못했다.

또한 `Dockerfile`을 직접 확인했다. 1·20줄의 `FROM node:20-slim` 멀티스테이지 구성, 42~43줄의 `HEALTHCHECK`(`curl -f http://127.0.0.1:9180/api/health`), 45줄의 `CMD ["node", "dist/server/index.js"]`가 실제 구현이다.

## 한계와 다음 단계

이 파이프라인은 아직 완벽하지 않다.

1. **외부 채널 실제 발행:** naver_blog, tistory, velog 채널은 아직 변환 결과 생성까지만 구현되어 있고, 실제 외부 게시(REST API 호출 등)는 구현되지 않았다.
2. **확장 가능한 채널 구조:** `publishToChannel()`이 if-else 분기로 구현되어 있어 새 채널 추가 시 코드 수정이 필요하다. 인터페이스 기반 설계로 변경하면 Open/Closed Principle을 지킬 수 있다.
3. **동기화 방향:** wiki 문서에는 "Obsidian Markdown SSOT"이라는 개념적 레이블이 있지만, Blog Studio는 Obsidian vault를 직접 읽지 않고 블로그 레포의 posts 디렉토리에서 읽어온다. Obsidian에서 바로 동기화하는 플러그인이나 webhook 연동이 필요하다면 별도의 구현이 필요하다.
4. **대규모 vault 처리:** 수백 개 파일의 디렉토리를 동기화할 때 성능이 어떻게 나오는지 측정하지 않았다.
5. **실시간 동기화:** 현재는 `POST /api/sync/import`로 수동 호출해야 한다. 파일 변경 감지(auto-sync)는 구현되지 않았다.

## 요약

블로그 콘텐츠를 하나의 원본에서 여러 채널로 보내기 위해 설계한 파이프라인은 다음과 같다. 아래는 코드나 설정이 아니라 흐름을 나타낸 개념도다.

<!-- illustrative: 데이터 흐름 개념도(코드 아님) -->
```
Obsidian 마크다운 (원본 — 위키 문서의 개념적 레이블)
    ↓ (Blog Studio 외부: Obsidian → 레포지토리 간 흐름은 이 도구 범위를 벗남)
블로그 레포 posts/
    ↓ syncFromBlogRepo()
MariaDB (posts, channels, post_publishes, backlinks)
    ↓ publishToChannel()
devcy0922 (실제 파일 동기화)
naver_blog (변환 결과 준비)
tistory (변환 결과 준비)
velog (변환 결과 준비)
```

원본 콘텐츠는 하나다. 수정할 때도 Obsidian 마크다운 파일 한 군데만 고치면 된다는 원칙은 위키 문서의 개념적 설명에 기반하지만, Blog Studio가 Obsidian vault를 직접 읽지 않는다는 점은 이미 위 섹션에서 명시했다. devcy0922 채널은 실제 파일로 동기화되고, 다른 채널은 변환 결과 생성까지만 구현되어 있다.

이건 단순한 "Obsidian → 블로그" 변환이 아니다. 단일 진실 소스에서 시작해 여러 채널로 확장하는 Publishing 아키텍처의 설계 원칙과 한계를 기록한 것이다.
