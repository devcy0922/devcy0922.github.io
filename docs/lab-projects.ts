// 제품 목록의 단일 출처(SSOT). 홈·/lab/·제품 상세 헤더가 모두 이 파일만 읽는다.
// status는 실제 구현 범위와 일치해야 한다: live(운영 중) · prototype(미리 써보기) · design(준비 중)
// plan의 state: done(완료) · now(진행 중) · next(예정). 실제 진행 상황과 같아야 한다.
// 타입은 `pnpm typecheck`(docs:build 앞에서 실행)가 검사한다. 잘못된 status·state는 빌드를 막는다.

export type Status = 'live' | 'prototype' | 'design'
export type PlanState = 'done' | 'now' | 'next'

export interface Link {
  label: string
  href: string
}

export interface Product {
  id: string
  title: string
  area: string
  status: Status
  tagline: string
  summary: string
  stack: string[]
  /** 제품 페이지 경로 (/lab/<id>) */
  href: string
  /** 제품 페이지 안의 데모 앵커 */
  demo?: string
  problem: string
  plan: Array<{ state: PlanState; text: string }>
  /** 핵심 기능. 화면에는 앞의 3개를 쓴다 */
  features: Array<{ title: string; body: string }>
  /** 바로 써보기 링크 (prototype·live) */
  tools?: Link[]
  /** 외부·관련 링크 */
  links?: Link[]
  /** 홈 '대표 제품'에 노출(최대 3개) */
  featured?: boolean
}

export const STATUS: Record<Status, { label: string; hint: string }> = {
  live: { label: '운영 중', hint: '실제 환경에서 돌아가는 중' },
  prototype: { label: '미리 써보기', hint: '브라우저에서 바로 써볼 수 있음' },
  design: { label: '준비 중', hint: '설계와 화면 뼈대까지 공개' },
}

// 목록 순서: 운영 중 → 미리 써보기 → 준비 중. 같은 상태 안에서는 아래 배열 순서를 따른다.
export const STATUS_ORDER: Status[] = ['live', 'prototype', 'design']

const catalog = [
  {
    id: 'domain-rag',
    featured: true,
    title: '도메인 RAG',
    area: '출처를 대는 RAG 빌더',
    status: 'prototype',
    tagline: '도메인 이름과 자료만 넣으면, 출처를 대는 RAG가 만들어지는 과정',
    summary: '출처 등록부터 정규화·청킹·색인·범위 가드·인용 검증까지 단계마다 보여 줍니다. 데모 도메인 3개, 프로덕션은 원하는 도메인을 넣습니다.',
    stack: ['BM25', 'SurrealDB', 'GoVail Gateway', 'engine-process'],
    href: '/lab/domain-rag',
    demo: '#rag',
    problem: '사내 규정, 제품 문서, 공개자료처럼 답이 이미 문서에 있는 질문이 반복됩니다. 일반 챗봇은 그럴듯하지만 출처 없는 답을 만들고, RAG를 새로 붙일 때마다 수집·색인·거절 규칙을 처음부터 다시 짭니다.',
    plan: [
      { state: 'done', text: '범위 가드·출처 증적 원장·인용 검증기(Python)' },
      { state: 'done', text: '브라우저 데모: 도메인 3개와 직접 넣기로 만드는 과정 전체' },
      { state: 'next', text: '도메인 설정 파일 하나로 RAG를 만드는 범용 저장소로 정리' },
      { state: 'next', text: 'SurrealDB 한 곳에 조각·BM25·벡터·출처 관계 저장' },
      { state: 'next', text: '도메인을 직접 등록하는 프로덕션 화면과 LLM 답변 + 인용 검증' },
      { state: 'next', text: '도메인마다 평가 질문으로 인용 정확도 측정' },
    ],
    features: [
      { title: '도메인 하나 = 설정 하나', body: '이름, 허용 출처, 거절 규칙, 동의어만 정하면 같은 파이프라인으로 RAG가 만들어집니다.' },
      { title: '문장마다 출처', body: '답변 문장이 근거 조각 원문에 실제로 있는지 다시 확인합니다. 근거가 없으면 멈춥니다.' },
      { title: '묻기 전에 거르기', body: '보상·고객·개인정보 질문은 검색하기 전에 규칙으로 돌려보냅니다.' },
    ],
    tools: [{ label: '도메인 RAG 만들어 보기', href: '/lab/domain-rag#rag' }],
  },
  {
    id: 'quit-nudge',
    title: '금연 타이머',
    area: '안드로이드 행동 넛지 앱',
    status: 'design',
    tagline: '담배 피우러 일어나는 순간을 알아채는 금연 앱',
    summary: '오래 앉아 있다가 걷기 시작하면, 평소 피우던 시간대일 때만 조용히 묻습니다.',
    stack: ['Android', 'Activity Recognition', 'Health Connect', 'Room'],
    href: '/lab/quit-nudge',
    demo: '#simulator',
    problem: '담배는 대부분 습관적인 순간에 피웁니다. 회의가 끝나고, 오래 앉아 있다가 일어날 때. 금연 앱은 보통 날짜만 세고, 정작 그 순간에는 아무 말도 하지 않습니다.',
    plan: [
      { state: 'done', text: '넛지 규칙 설계와 브라우저 시뮬레이터' },
      { state: 'now', text: '규칙 엔진을 Kotlin으로 옮기고 같은 입력으로 결과 비교' },
      { state: 'next', text: '활동 전환 수신과 알림만 있는 최소 앱' },
      { state: 'next', text: '1주일 직접 써 보며 알림 빈도 조정' },
    ],
    features: [
      { title: '순간을 잡는 알림', body: '"가만히 있음 → 걷기" 전환만 받아 배터리를 거의 쓰지 않습니다.' },
      { title: '내 패턴에 맞춤', body: '참았어요·피웠어요 답으로 시간대별 위험도를 매일 다시 계산합니다.' },
      { title: '기록은 휴대폰 안에만', body: '서버가 없습니다. 흡연 기록은 기기 밖으로 나가지 않습니다.' },
    ],
  },
  {
    id: 'vibe-post-it',
    featured: true,
    title: 'vibe-post-it',
    area: '업무 자동화 도구 모음',
    status: 'prototype',
    tagline: '사업보고서 비교, Slack 변환처럼 반복 업무를 한 번에',
    summary: '입력 하나, 결과 하나로 끝나는 작은 도구들. 쓸 만해지면 서비스로 떼어냅니다.',
    stack: ['Vue', 'Vite', 'jsdiff', 'Slack Block Kit'],
    href: '/lab/vibe-post-it',
    demo: '#report-diff',
    problem: '공시 문서 두 버전을 나란히 놓고 숫자를 찾거나, 레거시 Slack 알림을 손으로 고치는 일은 매번 조금씩 다르지만 매번 같은 시간이 듭니다.',
    plan: [
      { state: 'done', text: '사업보고서 버전 비교와 수치 변경 요약' },
      { state: 'done', text: 'Slack 레거시 메시지 변환과 5개 언어 전송 코드' },
      { state: 'done', text: '웹·CLI를 한 패키지로: 문서 판 저장과 LLM 요약 숫자 검사' },
      { state: 'next', text: 'OpenDART에서 두 해 보고서 자동으로 불러오기' },
      { state: 'next', text: '재무제표 표의 셀 단위 비교' },
      { state: 'next', text: '변환 릴레이를 Docker 이미지로 배포' },
    ],
    features: [
      { title: '사업보고서 버전 비교', body: '항목별로 바뀐 곳을 칠하고, 바뀐 숫자만 모아 요약합니다.' },
      { title: 'Slack 메시지 변환', body: '레거시 attachment를 Block Kit으로 바꾸고 5개 언어 전송 코드를 만듭니다.' },
      { title: '브라우저 안에서만', body: '붙여넣은 내용은 서버로 보내지 않습니다.' },
    ],
    tools: [
      { label: '사업보고서 두 버전 비교', href: '/lab/vibe-post-it#report-diff' },
      { label: 'Slack 메시지 변환', href: '/lab/vibe-post-it#slack-blocks' },
    ],
  },
  {
    id: 'page-builder',
    title: '페이지 빌더',
    area: '노코드 웹페이지 편집기',
    status: 'prototype',
    tagline: '클릭해서 고치고, HTML 한 장으로 받는 페이지 편집기',
    summary: '영역을 고르고 오른쪽 패널에서 글자·여백·색을 바꾼 뒤 그대로 내려받습니다.',
    stack: ['GrapesJS', 'Vue', 'Vite'],
    href: '/lab/page-builder',
    links: [
      { label: '지금 써보기', href: 'https://devcy0922.github.io/page-builder/' },
      { label: 'GitHub 저장소', href: 'https://github.com/devcy0922/page-builder' },
    ],
    problem: '소개 페이지 문구 하나, 글자 크기 하나를 바꾸려고 개발자를 기다립니다. 노코드 도구는 많지만 결과를 내 서버에 그대로 올릴 HTML 한 장으로 주는 것은 드뭅니다.',
    plan: [
      { state: 'done', text: 'GrapesJS 기반 영역 편집과 HTML 내려받기' },
      { state: 'next', text: '프로젝트 JSON 저장과 불러오기' },
      { state: 'next', text: '이미지 업로드' },
      { state: 'next', text: '가격표·자주 묻는 질문 같은 섹션 템플릿' },
    ],
    features: [
      { title: '영역 선택 편집', body: '포토샵 속성 패널처럼 고른 영역의 글자 크기·색·여백을 바로 바꿉니다.' },
      { title: '기기별 미리보기', body: '데스크톱·태블릿·모바일 폭으로 바꿔 가며 확인합니다.' },
      { title: 'HTML 한 장으로', body: 'CSS까지 묶은 파일 하나로 받아 어디에 올려도 그대로 열립니다.' },
    ],
  },
  {
    id: 'lingo-domain',
    title: 'Lingo 도메인 번역',
    area: '번역 파이프라인',
    status: 'prototype',
    tagline: '업계 용어를 틀리지 않는 번역',
    summary: '용어집과 번역 메모리로 먼저 처리하고, LLM은 꼭 필요할 때만 부릅니다.',
    stack: ['LingoAgent', 'Glossary', 'Translation Memory', 'OPUS-MT'],
    href: '/lab/lingo-domain',
    demo: '#checker',
    problem: 'LLM 번역은 문장이 자연스러워도 업계 용어를 틀립니다. \"단말\"을 terminal로, \"격리\"를 isolation으로 옮기면 업계 사람에게는 틀린 문서입니다. 같은 문장도 매번 비용이 들고 결과가 조금씩 달라집니다.',
    plan: [
      { state: 'done', text: 'CI 번역 게이트(LingoAgent) 운영' },
      { state: 'done', text: '도메인 판정·용어 고정·번역 메모리 미리 써보기' },
      { state: 'done', text: 'LLM 번역 버튼: 잠근 문장만 보내고 용어 복원·규칙 QA' },
      { state: 'next', text: '용어집 YAML과 Lingo CLI --glossary 옵션' },
      { state: 'next', text: '번역 메모리 저장소(SQLite)' },
      { state: 'next', text: 'OPUS-MT와 LLM 번역 품질·속도 비교' },
    ],
    features: [
      { title: '이 분야의 말인지 판정', body: '용어 밀도로 업계 문장과 일반 문장을 나눠 엉뚱한 치환을 막습니다.' },
      { title: '용어 고정', body: '"단말"은 endpoint, "격리"는 quarantine. 번역 엔진이 바꾸지 못하게 잠급니다.' },
      { title: '한 번 승인하면 재사용', body: '번역 메모리에 있는 문장은 비용 없이 같은 결과를 냅니다.' },
    ],
  },
  {
    id: 'sandbox-security',
    title: '에이전트 실행 샌드박스',
    area: '보안 아키텍처',
    status: 'design',
    tagline: '에이전트가 실행하는 명령을 여섯 겹으로 막는 실행 환경',
    summary: '모델이 잘못 판단해도 피해가 없도록 실행 파일·파일·네트워크·시크릿·자원·승인을 따로 막습니다.',
    stack: ['gVisor', 'seccomp', 'egress proxy', 'secret broker', 'OPA'],
    href: '/lab/sandbox-security',
    demo: '#policy',
    problem: '코딩 에이전트는 셸 명령을 실행합니다. 테스트를 시켰는데 원격 스크립트를 실행하거나, 문서에 숨은 지시를 따를 수도 있습니다. 모델이 똑똑해지는 것과 잘못 판단해도 피해가 없는 것은 다른 문제입니다.',
    plan: [
      { state: 'done', text: '여섯 계층 설계와 명령 차단 판정 시뮬레이터' },
      { state: 'next', text: '정책 엔진을 OPA(Rego) 규칙으로 옮기기' },
      { state: 'next', text: 'gVisor 런타임과 송신 프록시 최소 구성' },
      { state: 'next', text: '시크릿 브로커 핸들 교환' },
      { state: 'next', text: '인젝션 문서 10종으로 계층별 차단율 측정' },
    ],
    features: [
      { title: '한 겹이 뚫려도', body: '모든 계층을 끝까지 평가해 앞 계층이 놓친 것을 다음 계층이 막습니다.' },
      { title: '시크릿은 핸들로만', body: '실제 토큰은 샌드박스에 들어가지 않고 송신 프록시에서만 주입됩니다.' },
      { title: '되돌리기 어려운 작업은 사람에게', body: 'rm -rf, force push, DROP은 승인 전까지 멈춥니다.' },
    ],
  },
  {
    id: 'vibe-mcp',
    title: 'vibe-mcp',
    area: 'MCP 서버 모음',
    status: 'design',
    tagline: 'DB·Git·공시를 에이전트에게 안전하게 여는 MCP 서버 모음',
    summary: 'mcp-* 디렉토리 하나가 서버 하나. 루트 Makefile 하나로 빌드·테스트·실행합니다.',
    stack: ['MCP', 'TypeScript', 'Make'],
    href: '/lab/vibe-mcp',
    problem: 'MCP 서버를 하나씩 만들다 보면 저장소마다 인증, 로그, 테스트, 클라이언트 설정 방법이 달라집니다. 새 서버를 붙일 때마다 같은 결정을 다시 합니다.',
    plan: [
      { state: 'done', text: '모노레포 뼈대와 읽기 전용 mcp-mysql' },
      { state: 'done', text: 'mcp-postgres: 레포별 계정·스키마 프로필, role·DB 현황 점검' },
      { state: 'next', text: 'mcp-git, mcp-docs' },
      { state: 'next', text: 'mcp-dart: 사업보고서 비교와 연결' },
      { state: 'next', text: 'write 등급 서버의 사람 승인 연결' },
    ],
    features: [
      { title: '디렉토리 하나에 서버 하나', body: 'make new NAME=jira 로 같은 규칙의 서버 뼈대가 생깁니다.' },
      { title: '읽기 전용 DB 조회', body: 'mcp-mysql·mcp-postgres는 조회 구문만 통과시키고 민감 컬럼을 가립니다.' },
      { title: '어디서든 같은 연결', body: 'make clients 가 Claude Code·Codex 등록 명령을 만듭니다. 비밀번호는 설정에 남기지 않습니다.' },
    ],
  },
  {
    id: 'govail-renewal',
    featured: true,
    title: 'GoVail',
    area: 'AI Gateway와 운영 콘솔',
    status: 'live',
    tagline: '사내 AI 요청을 한 곳에서 허용하고 기록하는 게이트웨이',
    summary: '키 발급부터 모델 호출, 막힌 이유 확인, 에이전트 세션 검토까지 한 콘솔에서 합니다.',
    stack: ['Rust Gateway', 'React', 'Keycloak', 'LiteLLM'],
    href: '/lab/govail-renewal',
    links: [{ label: '콘솔 열기', href: 'https://console.govail.cloud' }],
    problem: '팀마다 모델 키를 따로 받으면 누가 어떤 모델을 쓰는지 아무도 모르고, 요청이 막혔을 때는 로그를 뒤져야 이유를 압니다. 사내 AI 요청이 늘수록 허용과 기록을 한 곳에서 해야 합니다.',
    plan: [
      { state: 'done', text: '모바일 정합성과 계정별 관측·감사 경계' },
      { state: 'done', text: '감사·관측 타임라인 통일' },
      { state: 'done', text: '엔진 실행 과정 실시간 표시와 세션 검토' },
      { state: 'now', text: '기능별 화면 캡처와 짧은 시연 영상' },
      { state: 'next', text: '세션 피드백 집계' },
    ],
    features: [
      { title: '로그인 없이 1일 키', body: '소개 화면에서 바로 데모 키를 받아 OpenAI 호환 API로 호출합니다.' },
      { title: '왜 막혔는지 보이는 감사 로그', body: '보안 정책, 컨텍스트 한계, 모델 접근, 라우팅 실패를 나눠 보여줍니다.' },
      { title: '에이전트 세션 검토', body: '요청별 도구 흐름과 종료 사유를 펼쳐 보고 좋음·나쁨을 남깁니다.' },
    ],
  },
  {
    id: 'ns-trading',
    title: 'NS 트레이딩',
    area: '퀀트 운영 시스템',
    status: 'live',
    tagline: '전략 상태를 한 곳에서만 바꾸는 자동매매 운영 시스템',
    links: [{ label: 'NS 마켓 열기', href: 'https://ns.aircanvas.kr' }],
    summary: 'Rust가 계산하고, Go만 상태를 바꾸고, 콘솔은 보여주기만 합니다.',
    stack: ['Rust', 'Go', 'Next.js', 'PostgreSQL', 'Dagu'],
    href: '/lab/ns-trading',
    problem: '실거래 시스템에서 가장 위험한 것은 버그보다 누가 언제 무엇을 바꿨는지 모르는 상태입니다. 계산과 상태 변경과 화면이 섞이면 사고가 났을 때 어디를 봐야 할지 모릅니다.',
    plan: [
      { state: 'done', text: '스크리닝 엔진·컨트롤 플레인·콘솔 분리' },
      { state: 'done', text: '상태 전이와 해시 검증 안전 규칙' },
      { state: 'next', text: '백테스트와 실거래를 비율로 비교하는 화면' },
      { state: 'next', text: '브로커 장애 시 주문 상태 복구 테스트' },
    ],
    features: [
      { title: '상태 변경은 한 곳에서', body: 'TEST → ACTIVE → INACTIVE 전이는 Go 컨트롤 플레인만 합니다.' },
      { title: '실행 전 해시 검증', body: '파라미터·코드 해시가 다르면 엔진이 계산하지 않습니다.' },
      { title: '테스트 전략의 실거래 차단', body: 'TEST 상태로 실거래에 나가려 하면 거부합니다.' },
    ],
  },
  {
    id: 'saebyeok-on',
    title: '새벽온',
    area: '새벽배송 대리점 관리',
    status: 'prototype',
    tagline: '대리점 정산과 기사님 기록을 한 화면에서',
    summary: '소장님은 기사별 정산과 새벽배송 대조를, 기사님은 매출·지출·프레시백 증빙을 한 서비스에서 처리합니다. GCP에는 명령 한 번으로 올라갑니다.',
    stack: ['React', 'GCP', 'Terraform', 'Ansible'],
    href: '/lab/saebyeok-on',
    problem: '새벽배송 대리점 소장님은 기사님 수십 명의 배송 건수, 프레시백 회수, 거래처 단가를 엑셀로 맞추고, 기사님은 그날 번 돈과 쓴 돈을 따로 메모합니다. 같은 숫자를 두 사람이 따로 적습니다.',
    plan: [
      { state: 'done', text: '소장님·기사님 화면 프로토타입(브라우저 저장)' },
      { state: 'now', text: 'API 서버와 정산 DB 스키마' },
      { state: 'next', text: 'Terraform·Ansible로 GCP에 make up 한 번 배포' },
      { state: 'next', text: '명세서 PDF와 카카오톡 공유' },
    ],
    features: [
      { title: '소장님 대시보드', body: '기사별 정산, 거래처 수익, 새벽배송 대조를 한 화면에서 봅니다.' },
      { title: '기사님 기록 앱', body: '오늘 번 돈과 쓴 돈, 프레시백 사진 증빙을 휴대폰으로 남깁니다.' },
      { title: 'make up 한 번', body: '빈 GCP 프로젝트에 Terraform과 Ansible로 서비스가 뜹니다.' },
    ],
  },
] satisfies Product[]

const products: Product[] = [...catalog].sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status))

/** 홈에 보이는 대표 제품. 목록 순서를 그대로 따른다. */
export const featured = products.filter((p) => p.featured).slice(0, 3)

export default products
