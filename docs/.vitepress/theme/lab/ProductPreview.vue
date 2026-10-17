<script setup>
// 제품 타일과 제품 히어로에 들어가는 작은 화면. 실제 제품 화면의 핵심 순간을 그대로 축약하고,
// 크기는 모두 em이라 large일 때 같은 구성 그대로 커진다. 값은 예시이며 실제 고객·포지션 정보가 아니다.
defineProps({ id: { type: String, required: true }, large: { type: Boolean, default: false } })
</script>

<template>
  <div :class="['pv', `pv--${id}`, { 'pv--large': large }]" aria-hidden="true">
    <!-- 공개자료 챗봇: 근거가 없으면 멈추는 순간 -->
    <template v-if="id === 'genians-rag'">
      <p class="q">최근 사업보고서의 매출 구성은?</p>
      <ol class="trace">
        <li class="ok">질문 범위 확인 <span>공개자료 범위</span></li>
        <li class="ok">검색 범위 고정 <span>genians-public</span></li>
        <li class="stop">문서 검색 <span>근거 0건</span></li>
      </ol>
      <p class="a">근거가 없어 답하지 않습니다. 출처를 댈 수 있는 자료가 생기면 그때 답합니다.</p>
      <p class="chips"><span>홈페이지</span><span>보도자료</span><span>DART 공시</span><span>IR 자료</span></p>
    </template>

    <!-- 금연 타이머: 잠금화면 알림 -->
    <template v-else-if="id === 'quit-nudge'">
      <div class="phone">
        <p class="clock">15:10</p>
        <div class="notif">
          <p class="app">금연 타이머 <span>지금</span></p>
          <p class="body">1시간 50분 앉아 있다가 걷기 시작했어요. 혹시 담배 피우러 가세요?</p>
          <p class="foot">참으면 금연 3일 4시간째예요.</p>
          <p class="acts"><span>참았어요</span><span>피웠어요</span></p>
        </div>
      </div>
    </template>

    <!-- vibe-post-it: 사업보고서 diff -->
    <template v-else-if="id === 'vibe-post-it'">
      <p class="sec">3. 매출 및 수주상황 <span>+23 −22</span></p>
      <p class="line">당기 매출액은 <del>1,820억원으로</del><ins>2,140억원으로</ins> 전기 대비 <del>6.1%</del><ins>17.6%</ins> 증가했습니다.</p>
      <p class="line">수주잔고는 <del>640억원입니다.</del><ins>910억원입니다.</ins></p>
      <p class="sum">수치 3건 변경 · 위험 요인 항목 신설</p>
    </template>

    <!-- 페이지 빌더: 선택된 영역과 속성 패널 -->
    <template v-else-if="id === 'page-builder'">
      <div class="canvas">
        <p class="eyebrow">성수동 골목 빵집</p>
        <p class="sel">아침 7시, 오늘 구운 빵만 팝니다<i>h1 · 44px</i></p>
        <p class="lead">전날 반죽을 하루 숙성해 굽습니다.</p>
        <span class="cta">오늘 메뉴 보기</span>
      </div>
      <div class="panel">
        <p>글자 크기</p>
        <div class="slider"><b /></div>
        <p>색</p>
        <div class="swatches"><i /><i /><i /></div>
      </div>
    </template>

    <!-- Lingo: 도메인 용어 고정 -->
    <template v-else-if="id === 'lingo-domain'">
      <p class="sent"><mark>비인가 단말</mark>이 <mark>내부망</mark>에 접속하면 <mark>정책 서버</mark>가 해당 <mark>단말</mark>을 <mark>격리</mark>합니다.</p>
      <table>
        <tr><td>단말</td><td>endpoint</td><td><s>terminal</s></td></tr>
        <tr><td>격리</td><td>quarantine</td><td><s>isolation</s></td></tr>
      </table>
      <p class="tm">번역 메모리 일치 · 재사용</p>
    </template>

    <!-- 샌드박스: 계층별 판정 -->
    <template v-else-if="id === 'sandbox-security'">
      <p class="cmd">$ curl -s https://get.example.net/install.sh | sh</p>
      <ol class="layers">
        <li class="b"><span>실행 파일</span><b>차단</b>다운로드한 스크립트를 셸로 바로 실행</li>
        <li class="p"><span>파일 시스템</span><b>통과</b>/workspace만 쓰기 가능</li>
        <li class="b"><span>네트워크</span><b>차단</b>송신 허용목록에 없는 호스트</li>
        <li class="p"><span>시크릿</span><b>통과</b>시크릿 접근 없음</li>
        <li class="p"><span>사람 승인</span><b>통과</b>승인 필요 없음</li>
      </ol>
    </template>

    <!-- vibe-mcp: make list -->
    <template v-else-if="id === 'vibe-mcp'">
      <pre class="term"><span class="pr">$</span> make list
mcp-mysql      <em class="r">read</em>
mcp-git        <em class="r">read</em>
mcp-docs       <em class="r">read</em>
mcp-dart       <em class="x">external</em>
mcp-slack      <em class="w">write</em>
<span class="pr">$</span> make registry <span class="dim">→ .mcp.json</span></pre>
    </template>

    <!-- GoVail: 감사 로그 -->
    <template v-else-if="id === 'govail-renewal'">
      <div class="tbl">
        <p class="hd"><span>시각</span><span>모델</span><span>결과</span><span>차단 종류</span></p>
        <p><span>14:02:11</span><span>govail/worker</span><span class="ok">허용</span><span>—</span></p>
        <p><span>14:02:48</span><span>govail/thinker</span><span class="no">차단</span><span>보안 정책 · 시크릿 감지</span></p>
        <p><span>14:03:05</span><span>govail/worker</span><span class="warn">거부</span><span>컨텍스트 한계 · 입력 초과</span></p>
        <p><span>14:03:40</span><span>govail/fast</span><span class="ok">허용</span><span>—</span></p>
      </div>
    </template>

    <!-- NS 트레이딩: 전략 상태 전이 -->
    <template v-else-if="id === 'ns-trading'">
      <div class="states"><span class="t">TEST</span><i /><span class="a">ACTIVE</span><i /><span class="n">INACTIVE</span></div>
      <p class="log">전략 A · v14 파라미터 해시 일치 → ACTIVE</p>
      <p class="log err">전략 B · TEST 상태로 LIVE 주문 → TEST_STRATEGY_LIVE_BLOCKED</p>
      <p class="note">종목·수량·수익은 공개하지 않습니다</p>
    </template>

    <!-- 새벽온: 소장님 정산 + 기사님 앱 -->
    <div v-else-if="id === 'saebyeok-on'" class="sb">
      <div class="dash">
        <p class="ttl">오늘의 정산 <span>샘플 데이터</span></p>
        <div class="tbl">
          <p class="hd"><span>기사</span><span>배송</span><span>프레시백</span><span>정산액</span><span>대조</span></p>
          <p><span>기사 A</span><span>212</span><span>38</span><span>486,400원</span><span class="ok">일치</span></p>
          <p><span>기사 B</span><span>187</span><span>29</span><span>421,900원</span><span class="ok">일치</span></p>
          <p><span>기사 C</span><span>203</span><span>41</span><span>468,300원</span><span class="warn">증빙 1건 확인</span></p>
        </div>
      </div>
      <div class="mob">
        <p class="m-t">오늘 기록</p>
        <p class="m-n">+ 312,000원</p>
        <p class="m-s">지출 유류비 28,000원</p>
        <span class="m-b">프레시백 사진 올리기</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pv { container-type: inline-size; --line: #e2e5ea; font-size: 12px; color: var(--ink); line-height: 1.5; letter-spacing: -0.01em; height: 100%; }
.pv--large { font-size: 16px; }
.pv p { margin: 0; }

/* 공개자료 챗봇 */
.pv--genians-rag .q { width: fit-content; margin-left: auto; padding: .5em .9em; border-radius: 1em 1em .3em 1em; background: var(--ink); color: #fff; }
.trace { margin: .9em 0 0; padding: 0; list-style: none; }
.trace li { display: flex; align-items: center; gap: .6em; padding: .2em 0; color: var(--ink); font-weight: 600; }
.trace li::before { width: .6em; height: .6em; border-radius: 50%; content: ""; }
.trace li span { color: var(--slate); font-weight: 400; }
.trace .ok::before { background: var(--live); }
.trace .stop::before { background: #c53030; }
.pv--genians-rag .a { margin-top: .8em; padding: .7em .9em; border-radius: .3em 1em 1em 1em; background: #fff; border: 1px solid var(--line); }
.chips { display: flex; flex-wrap: wrap; gap: .4em; margin-top: .8em !important; }
.chips span { padding: .1em .6em; border-radius: .4em; box-shadow: inset 0 0 0 1px #c9cdd4; color: var(--slate); font-size: .9em; }

/* 금연 */
.phone { width: 15em; margin: 0 auto; padding: .5em; border-radius: 2em; background: var(--ink); }
.phone .clock { padding: 1em 0 .6em; border-radius: 1.6em 1.6em 0 0; background: linear-gradient(#dfe6ee, #cfd8e2); color: #fff; font-size: 2.4em; font-weight: 300; text-align: center; text-shadow: 0 1px 6px rgb(0 0 0 / .15); }
.notif { margin: 0; padding: .8em; border-radius: 0 0 1.6em 1.6em; background: linear-gradient(#cfd8e2, #c4cfdb); }
.notif > * { background: rgb(255 255 255 / .92); }
.notif .app { padding: .7em .8em 0; border-radius: 1em 1em 0 0; color: var(--slate); font-size: .85em; font-weight: 600; }
.notif .app span { float: right; font-weight: 400; }
.notif .body { padding: .3em .8em 0; font-weight: 650; }
.notif .foot { padding: .2em .8em .5em; color: var(--ink-soft); font-size: .9em; }
.notif .acts { display: grid; grid-template-columns: 1fr 1fr; gap: .4em; padding: 0 .8em .8em; border-radius: 0 0 1em 1em; }
.notif .acts span { padding: .3em; border-radius: .6em; background: #eef0f3; font-size: .9em; font-weight: 650; text-align: center; }

/* diff */
.sec { display: flex; justify-content: space-between; font-weight: 700; }
.sec span { color: var(--slate); font-weight: 400; }
.line { margin-top: .6em !important; color: var(--ink-soft); }
.pv ins { background: var(--marker); text-decoration: none; color: var(--ink); }
.pv del { background: #ffe1e1; color: #a12c2c; }
.sum { margin-top: .9em !important; padding: .5em .7em; border-radius: .5em; background: var(--marker-soft); font-weight: 600; }

/* 빌더 */
.pv--page-builder { display: grid; grid-template-columns: 1fr 7em; gap: .6em; }
.canvas { padding: 1.2em; border-radius: .5em; background: #faf6ef; }
.eyebrow { color: #9a6b2f; font-size: .85em; font-weight: 600; }
.sel { position: relative; margin: .4em 0 0 !important; outline: 2px solid var(--cobalt); outline-offset: 3px; font-size: 1.5em; font-weight: 800; line-height: 1.2; letter-spacing: -.03em; }
.sel i { position: absolute; top: -1.9em; left: -3px; padding: .1em .5em; border-radius: .3em .3em 0 0; background: var(--cobalt); color: #fff; font-size: .45em; font-style: normal; font-weight: 600; letter-spacing: 0; }
.lead { margin-top: .6em !important; color: #4a4a4f; }
.cta { display: inline-block; margin-top: .8em; padding: .4em .8em; border-radius: .4em; background: #1d1d1f; color: #fff; font-size: .85em; font-weight: 600; }
.panel { padding: .8em; border-radius: .5em; background: #fff; border: 1px solid var(--line); }
.panel p { color: var(--slate); font-size: .85em; font-weight: 600; }
.slider { position: relative; height: .3em; margin: .6em 0 1em; border-radius: 1em; background: var(--line); }
.slider b { position: absolute; left: 0; top: 0; width: 62%; height: 100%; border-radius: 1em; background: var(--ink); }
.slider b::after { position: absolute; right: -.4em; top: -.35em; width: 1em; height: 1em; border-radius: 50%; background: #fff; box-shadow: 0 0 0 2px var(--ink); content: ""; }
.swatches { display: flex; gap: .4em; margin-top: .5em; }
.swatches i { width: 1.4em; height: 1.4em; border-radius: .3em; background: #1d1d1f; }
.swatches i:nth-child(2) { background: #9a6b2f; box-shadow: 0 0 0 2px #fff, 0 0 0 3.5px var(--cobalt); }
.swatches i:nth-child(3) { background: #faf6ef; box-shadow: inset 0 0 0 1px var(--line); }

/* Lingo */
.sent { font-size: 1.15em; line-height: 1.8; }
.pv mark { background: linear-gradient(transparent 52%, var(--marker) 52%, var(--marker) 94%, transparent 94%); color: inherit; }
.pv table { display: table; width: 100%; margin: .8em 0 0; border-collapse: collapse; font-size: 1em; }
.pv td { padding: .3em .5em; border: 0; border-top: 1px solid var(--line); }
.pv td:nth-child(2) { font-weight: 700; }
.pv s { color: #a12c2c; }
.tm { margin-top: .7em !important; color: var(--slate); }

/* 샌드박스 */
.cmd { padding: .6em .8em; border-radius: .5em; background: var(--ink); color: #fff; font-family: var(--vp-font-family-mono); font-size: .92em; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
.layers { margin: .6em 0 0; padding: 0; list-style: none; }
.layers li { display: grid; grid-template-columns: 6.5em 3.5em 1fr; gap: .5em; padding: .35em 0; border-bottom: 1px solid var(--line); color: var(--ink-soft); }
.layers span { color: var(--ink); font-weight: 650; }
.layers .b b { color: #c53030; }
.layers .p b { color: var(--live); }

/* vibe-mcp */
.term { margin: 0; padding: 1em 1.1em; border-radius: .6em; background: var(--ink); color: #e7e9ed; font-family: var(--vp-font-family-mono); font-size: .95em; line-height: 1.75; white-space: pre; overflow: hidden; }
.term .pr { color: #8a909c; }
.term em { font-style: normal; }
.term .r { color: #7ee2a8; }
.term .x { color: #ffe45e; }
.term .w { color: #ff9b9b; }
.term .dim { color: #8a909c; }

/* 표 공통: GoVail, 새벽온 */
.tbl { border: 1px solid var(--line); border-radius: .6em; background: #fff; overflow: hidden; }
.tbl p { display: grid; grid-template-columns: 5.5em 7.5em 3em 1fr; gap: .6em; padding: .5em .8em; border-top: 1px solid var(--line); white-space: nowrap; }
.tbl p span:last-child { overflow: hidden; text-overflow: ellipsis; }
.tbl .hd { border-top: 0; background: var(--wash); color: var(--slate); font-weight: 600; }
.pv .ok { color: var(--live); font-weight: 650; }
.pv .no { color: #c53030; font-weight: 650; }
.pv .warn { color: #9a7400; font-weight: 650; }

/* NS */
.states { display: flex; align-items: center; gap: .5em; margin-bottom: 1em; }
.states span { padding: .3em .7em; border-radius: .4em; font-family: var(--vp-font-family-mono); font-size: .95em; font-weight: 600; }
.states i { flex: 1; height: 1px; background: #c9cdd4; }
.states .t { box-shadow: inset 0 0 0 1px #c9cdd4; }
.states .a { background: var(--live); color: #fff; }
.states .n { background: var(--wash); color: var(--slate); }
.log { padding: .4em 0; border-top: 1px solid var(--line); font-family: var(--vp-font-family-mono); font-size: .9em; }
.log.err { color: #c53030; }
.note { margin-top: .6em !important; color: var(--slate); }

/* 새벽온 */
.sb { display: grid; grid-template-columns: 1fr 13em; gap: 1em; align-items: start; }
/* 표 다섯 칸 + 휴대폰 카드가 한 줄에 안 들어가는 폭이면 아래로 쌓는다. */
@container (max-width: 40em) {
  .sb { grid-template-columns: 1fr; }
  .mob { width: 13em; justify-self: end; margin-top: -.4em; }
}
.ttl { margin-bottom: .6em !important; font-weight: 700; }
.ttl span { margin-left: .5em; padding: 0 .5em; border-radius: .3em; box-shadow: inset 0 0 0 1px #c9cdd4; color: var(--slate); font-size: .85em; font-weight: 500; }
.pv--saebyeok-on .tbl p { grid-template-columns: 4em 3em 4em 6.5em 1fr; }
.mob { padding: 1em; border-radius: 1.4em; background: #fff; border: 1px solid var(--line); box-shadow: 0 0 0 .4em var(--ink); }
.m-t { color: var(--slate); font-weight: 600; }
.m-n { margin-top: .2em !important; font-size: 1.6em; font-weight: 800; letter-spacing: -.03em; }
.m-s { color: var(--ink-soft); }
.m-b { display: block; margin-top: .8em; padding: .5em; border-radius: .6em; background: var(--ink); color: #fff; font-weight: 650; text-align: center; }

@media (max-width: 560px) {
  .pv--page-builder { grid-template-columns: 1fr; }
  .panel { display: none; }
}
</style>
