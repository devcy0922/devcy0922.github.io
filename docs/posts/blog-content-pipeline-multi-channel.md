---
title: "블로그 콘텐츠 파이프라인 — 하나의 원본, 여러 채널로 보내기"
date: 2026-11-21
description: "Obsidian 마크다운 형식을 원본으로 저장하고, MariaDB에서 관리하며, 개발자 블로그·네이버·티스토리·벨로그 등 여러 채널에 변환·발행하는 멀티 채널 Publishing 아키텍처를 설계하고 구현한 기록."
tags:
  - DevLog
  - Blog Studio
  - Content Pipeline
  - Architecture
  - Multi-Channel
---

# 블로그 콘텐츠 파이프라인 — 하나의 원본, 여러 채널로 보내기

한동안 같은 글을 네 군데에서 관리했다. 개발자 블로그에 올리면 네이버는 형식을 다시 맞춰야 했고, 티스토리에 옮기면 또 손봐야 했다. 오타 하나 고치려면 여러 곳을 돌아다녀야 하니, 몇 번 고치다 나중엔 어느 버전이 최신인지 나조차 헷갈렸다. 복사·붙여넣기를 반복하는 대신 파이프라인을 만들었다. 원본은 하나로 두고 MariaDB에 모아 관리하면서, 발행 시점에 채널마다 형식을 바꿔 내보내는 구조다. 블로그 스튜디오(Blog Studio)를 설계하고 구현한 과정을 적어둔다.

## 원본 포맷 정하기

원본은 Obsidian 호환 마크다운으로 정했다. Obsidian 마크다운은 순수한 마크다운 파일 저장소다. 양방향 링크(`[[위키링크]]`), 콜아웃(`>[!NOTE]`), 메타데이터(frontmatter)가 전부 마크다운 파일 안에 들어 있고, 외부 서비스나 DB에 의존하지 않는다. 노트 앱이 없어져도 파일은 그대로 남는다. 로컬에서 빠르게 쓸 수 있고 검색이 잘 되며, 위키링크로 아이디어를 이을 수 있다는 점도 마음에 들었다. 다른 노트 앱이나 정적 사이트 생성기로 이사 가도 파일은 그대로 쓸 수 있고, 원본이 마크다운이면 변환 로직만 있으면 어디든 보낼 수 있다.

대가도 분명하다. `[[위키링크]]`와 `>[!NOTE]`는 마크다운 표준이 아니라 Obsidian 확장 문법이라 다른 플랫폼에서 그대로 렌더링되지 않는다. 이걸 감수한 이유는 변환 문제가 한 번의 설계로 끝나는 문제였고, 저장 포맷을 특정 도구나 서비스에 묶어버리면 되돌리기 훨씬 어려웠기 때문이다.

## 글을 한 곳에 모으기 — MariaDB

포스트 본문, 메타데이터, 채널 정보, 채널별 발행 이력을 MariaDB에 넣었다. 사내에서 이미 MariaDB를 굴리고 있었고 연결 풀이며 트랜잭션이며 운용 경험이 이미 쌓여 있어서 새로 인프라를 세울 이유가 없었다. mysql2 풀로 연결하고 InnoDB 엔진으로 테이블을 만든다.

<!-- source: blog-studio/src/server/db.ts#L27-L39 -->
```typescript
      CREATE TABLE IF NOT EXISTS posts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slug VARCHAR(191) NOT NULL UNIQUE,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        content MEDIUMTEXT,
        date VARCHAR(20) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_posts_status (status),
        INDEX idx_posts_date (date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

테이블 여섯 개(posts, tags, channels, post_publishes, backlinks, revisions) 중에서 나중에 가장 쓸모가 컸던 건 `post_publishes`다.

<!-- source: blog-studio/src/server/db.ts#L65-L77 -->
```typescript
      CREATE TABLE IF NOT EXISTS post_publishes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        post_id INT NOT NULL,
        channel_id VARCHAR(50) NOT NULL,
        status VARCHAR(30) NOT NULL DEFAULT 'draft',
        published_url VARCHAR(255) DEFAULT '',
        published_at DATETIME NULL,
        payload_snapshot MEDIUMTEXT,
        UNIQUE KEY uq_post_channel (post_id, channel_id),
        INDEX idx_publish_status (status),
        CONSTRAINT fk_pub_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
        CONSTRAINT fk_pub_channel FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

`(post_id, channel_id)`에 유니크 키를 걸어서 포스트×채널 조합당 한 행만 갖도록 했다. 같은 글이 이 블로그에는 이미 발행됐는데 네이버에선 아직 초안인 상태가 자연스럽게 표현된다. 발행할 때마다 상태를 UPSERT하고, `payload_snapshot`에는 채널에 보낸 변환 결과의 앞부분 1000자를 잘라 저장한다. 나중에 "그때 네이버에 어떤 HTML로 보냈지?"를 DB에서만 확인할 수 있어서, 디버깅할 때 이 컬럼에 꽤 빚이 있다.

## 변환기 — 한 개의 문법을 채널마다 다른 말로

네 개의 변환 함수를 뒀다. `transformForVitePress()`, `transformForNaver()`, `transformForTistory()`, `transformForVelog()`. 각 채널의 규격에 맞춰 콜아웃을 박스 스타일로 바꾸고 frontmatter를 재작성하는 식인데, 실제 시간을 잡아먹은 건 위키링크 처리였다.

원본에서 `[[...]]`를 찾아내는 정규식 하나에서 시작한다.

<!-- source: blog-studio/src/server/obsidian.ts#L9-L9 -->
```typescript
const WIKILINK_REGEX = /\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g;
```

VitePress 채널은 이걸 상대 링크로 바꾼다. 글 전체의 제목→slug 맵(`slugMap`)을 미리 만들어 두고 별칭과 `#헤딩`까지 처리한다.

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

네이버 변환기는 링크로 바꾸는 시도를 아예 하지 않고 굵은 텍스트로 내린다.

<!-- source: blog-studio/src/server/transformer.ts#L31-L34 -->
```typescript
  // [[위키링크]] 일반 텍스트 볼드로 치환
  html = html.replace(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (_, target, alias) => {
    return `<strong>${alias || target}</strong>`;
  });
```

티스토리와 벨로그는 마크다운을 그대로 받는 채널이라 굵게 처리로 끝낸다. 벨로그 분기가 티스토리와 똑같은 방식을 쓴다.

<!-- source: blog-studio/src/server/transformer.ts#L58-L60 -->
```typescript
  let content = post.content.replace(/\[\[([^[\]|]+)(?:\|([^[\]]+))?\]\]/g, (_, target, alias) => {
    return `**${alias || target}**`;
  });
```

네 채널의 처리 규칙을 한 장의 표로 정리해 두고 하나씩 맞춰 가는 식으로 작업했다. 네이버가 그중 제일 성가셨다. 콜아웃을 HTML 박스로 바꾸는 건 간단한데, 위키링크를 링크로 해석할 방법이 없어서 그냥 굵게 처리로 타협했다.

## 발행 — 파일을 실제로 쓰는 곳과, 준비만 해두는 곳

`publishToChannel(slug, channelId)`이 발행의 출입구다. 포스트를 DB에서 꺼내고 slug 맵을 만들고, 채널 분기로 들어간다.

가장 먼저 완성한 devcy0922 분기는 진짜로 파일을 쓴다. 이 블로그 저장소의 `docs/posts/`에 변환 결과를 마크다운으로 쓰고 발행 URL을 기록한다.

<!-- source: blog-studio/src/server/transformer.ts#L94-L106 -->
```typescript
    if (channelId === 'devcy0922') {
      // devcy0922 VitePress 로컬 파일 발행
      if (!fs.existsSync(POSTS_DIR)) {
        fs.mkdirSync(POSTS_DIR, { recursive: true });
      }
      const filePath = path.join(POSTS_DIR, `${post.slug}.md`);
      const formatted = transformForVitePress(post, slugMap);
      fs.writeFileSync(filePath, formatted, 'utf-8');

      const publishedUrl = `https://devcy0922.github.io/posts/${post.slug}`;
      await updateChannelPublishStatus(post.id, 'devcy0922', 'published', publishedUrl, formatted.slice(0, 1000));
      return { success: true, url: publishedUrl };
    }
```

네이버·티스토리·벨로그 분기는 솔직히 준비 단계다. 변환 결과를 만들고 DB에 `published`와 "준비완료" 문구를 남길 뿐, 플랫폼으로 실제 게시 요청을 보내지 않는다. 처음엔 세 채널 다 붙일 생각이었는데 네이버 API 문서를 먼저 열어본 뒤 계획을 접었다.

<!-- source: blog-studio/src/server/transformer.ts#L108-L112 -->
```typescript
    if (channelId === 'naver_blog') {
      const naverHtml = transformForNaver(post);
      await updateChannelPublishStatus(post.id, 'naver_blog', 'published', 'https://blog.naver.com (준비완료)', naverHtml.slice(0, 1000));
      return { success: true, url: '네이버 블로그 HTML 클립보드/규격 준비 완료' };
    }
```

이건 반쯤 지은 다리다. 플랫폼에 글을 프로그램으로 올리려면 API 연동이 필요한데, 신청과 키 발급이 전부 사람 절차다. 변환까지가 이번 범위의 끝이고 나머지는 다음 공사로 넘겼다. 상태에 "준비완료"를 남긴 건 이 경계를 코드 안에 정직하게 남겨두려는 선택이었다.

발행 진입로 구현에 대해서도 적어둔다. `publishToChannel()`은 채널 ID 문자열 비교 if 분기를 순차로 늘어놓은 구조다. 채널을 하나 추가하려면 이 함수를 열어서 분기를 끼워 넣어야 한다. 채널 목록이 더 늘면 어댑터 맵 같은 형태로 정리할 생각이다. 지금으로선 네 개를 이 상태로 유지하는 대가가 감당 가능한 수준이라 그대로 뒀다.

## 동기화 방향 — 저장소에서 DB로

이 도구의 데이터 흐름은 Obsidian에서 바로 들어오는 게 아니다. 동기화 코드가 읽는 대상은 블로그 저장소의 `docs/posts/` 디렉토리다.

<!-- source: blog-studio/src/server/sync.ts#L6-L7 -->
```typescript
export const BLOG_REPO_DIR = process.env.BLOG_REPO_DIR || path.resolve(process.cwd(), '../devcy0922.github.io');
export const POSTS_DIR = path.resolve(BLOG_REPO_DIR, 'docs/posts');
```

<!-- source: blog-studio/src/server/sync.ts#L12-L18 -->
```typescript
export async function syncFromBlogRepo(): Promise<{ total: number; imported: number; updated: number }> {
  if (!fs.existsSync(POSTS_DIR)) {
    console.warn(`[Sync] 포스트 디렉토리를 찾을 수 없습니다: ${POSTS_DIR}`);
    return { total: 0, imported: 0, updated: 0 };
  }

  const files = fs.readdirSync(POSTS_DIR).filter((f) => f.endsWith('.md') && f !== 'index.md');
```

`.md` 파일을 하나씩 읽어서 frontmatter를 파싱하고 slug·제목·태그를 꺼내 포스트 단위로 UPSERT한다. 서버를 띄우면 테이블 생성(`initDatabase()`)과 이 초기 동기화가 한 번 실행되고, 이후에는 `POST /api/sync/import`로 수동 동기화를 걸 수 있다.

"Obsidian 마크다운이 원본(SSOT)"이라는 이름으로 설명했지만, 코드상 이 도구가 Obsidian 볼트를 직접 읽지는 않는다. Obsidian에서 글을 써서 저장소에 반영하는 흐름은 이 도구 밖에 있고, 스튜디오가 실제로 손대는 구간은 저장소→MariaDB다. 이 경계를 문서에는 적어뒀지만 처음엔 나 스스로도 흐름을 흐릿하게 그려놓고 설계부터 했다가, 뒤늦게 코드와 설명을 맞췄다.

## 백링크는 동기화 끝에서 한 번에 계산

위키링크를 역방향 링크 테이블로 바꾸는 작업은 개별 파일 단위가 아니라 전체 동기화가 끝난 뒤 한 번에 도는다. 링크가 가리키는 글은 제목이든 slug든 전체 글 목록을 봐야 풀리기 때문이다.

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

전체 포스트로 slug·제목 맵을 만들고, 본문에서 링크를 전부 뽑아 `backlinks` 테이블에 다시 기록한다. 글 하나 저장할 때마다 증분 계산하는 방식 대신 이렇게 단순하게 짠 이유는 링크 해석이 애초에 전체 집합에 의존하기 때문이다. 어차피 한 편만 봐서는 링크가 어디를 가리키는지 확정할 수 없다.

## API 얼굴

Express REST API 하나로 서고, 웹 UI도 같은 API를 쓴다. 서버 기동 시 테이블 생성과 초기 동기화가 끝나면 포트 9180에서 listen 한다. 노선은 대략 이렇다(전체가 아니라 면면만 옮긴 요약 예시다).

<!-- illustrative: API 노선 요약 목록(요약 예시) -->
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

변환 결과 미리보기(`/preview/:channelId`)가 의외로 쓸모가 많았다. 발행 전에 채널별 변환 결과를 눈으로 확인하는 게 전부인데, 변환기 디버깅의 9할이 이 엔드포인트로 이뤄진다.

## 다시 돌려 본 테스트

파서와 변환기 단위 테스트는 이 글을 쓰면서 다시 돌려봤고, 7개 전부 통과했다. MariaDB에 실제로 붙이는 통합 테스트는 DB 인스턴스가 있는 환경에서 도는 것이라 이번 재실행에서는 뺐다.

## 아쉬운 것들

제일 걸리는 건 네이버다. 변환 HTML까지는 만들어지는데 실제 게시는 못 하고 있다. API 신청 페이지를 열어놓고 며칠 방치 중인데, 내 이름으로 된 신청과 키 발급을 통과해야 다음 문장이 생긴다. 코드 문제라면 오늘 안에 끝낼 일을 사람 절차를 기다리고 있으니 답답하다.

나머지는 담담하다. `publishToChannel()` if 분기 구조는 채널 다섯 개 넘으면 건드릴 거 알고 그대로 뒀고, Obsidian 쪽 파일 변경을 감지하는 자동 동기화는 그냥 없다. 수동 호출이 불편한 건 아닌데, 언젠가 귀찮음이 임계를 넘길 것 같다. 백링크 전체 재계산 성능은 포스트가 몇 백 개 넘어야 확인 가능한데 그때까지 미루기로 했다.

## 마무리

흐름을 한 장으로 줄이면 이렇다(코드나 설정이 아니라 흐름 그림 예시다).

<!-- illustrative: 데이터 흐름 개념도(흐름 그림 예시) -->
```
Obsidian 마크다운 (원본 — 개념적 레이블)
    ↓ (Obsidian → 저장소 반영은 이 도구 범위 밖)
블로그 레포 docs/posts/
    ↓ syncFromBlogRepo()
MariaDB (posts, channels, post_publishes, backlinks)
    ↓ publishToChannel()
devcy0922 (실제 파일 동기화)
naver_blog / tistory / velog (변환 결과 준비)
```

원본은 하나이고, 수정도 한 군데만 하면 된다. 채널 변환이 한 번의 설계로 끝나고, 발행 상태는 채널마다 독립적으로 남는다. 다리는 절반쯤 놓였고, 나머지는 각 플랫폼의 문을 두드려야 비로소 이어진다.
