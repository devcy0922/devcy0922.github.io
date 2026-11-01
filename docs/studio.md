---
layout: page
title: "AI 블로그 스튜디오"
description: "devcy0922 블로그 포스트를 DB화하여 관리하고, 옵시디언 양방향 링크와 지식 그래프, AI 집필 파이프라인을 지원하는 저작 스튜디오입니다."
aside: false
outline: false
---

<div style="max-width: 800px; margin: 40px auto; padding: 24px; border: 1px solid var(--vp-c-divider); border-radius: 12px; background: var(--vp-c-bg-soft);">
  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
    <div style="width: 40px; height: 40px; border-radius: 8px; background: #3b82f6; display: flex; align-items: center; justify-content: center; color: white; font-size: 20px;">
      ✍️
    </div>
    <div>
      <h2 style="margin: 0; font-size: 1.4rem; font-weight: 700;">AI 블로그 스튜디오 (Blog Studio)</h2>
      <p style="margin: 2px 0 0; color: var(--vp-c-text-2); font-size: 0.9rem;">devcy0922 포스트 저작 및 옵시디언 지식망 연동 시스템</p>
    </div>
  </div>

  <p style="line-height: 1.7; margin-bottom: 20px;">
    블로그 스튜디오는 정적 블로그의 모든 글을 SQLite DB로 구조화하고, 옵시디언(Obsidian) 특유의 <code>[[위키링크]]</code>, Callout, 지식 그래프를 실시간으로 탐색하며, AI 어시스턴트를 활용해 목차 수립부터 초안 작성, 톤앤매너 퇴고 후 1클릭으로 블로그에 발행할 수 있는 독립형 저작 워크스페이스입니다.
  </p>

  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 24px;">
    <div style="padding: 14px; background: var(--vp-c-bg); border-radius: 8px; border: 1px solid var(--vp-c-divider);">
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">🗄️ 포스트 DB화 & 상태 관리</div>
      <div style="font-size: 0.82rem; color: var(--vp-c-text-2);">초안, 집필 중, 검토, 발행 완료 4단계 라이프사이클 관리</div>
    </div>
    <div style="padding: 14px; background: var(--vp-c-bg); border-radius: 8px; border: 1px solid var(--vp-c-divider);">
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">🔗 옵시디언 양방향 링크 & 그래프</div>
      <div style="font-size: 0.82rem; color: var(--vp-c-text-2);">문서 간 [[위키링크]] 역링크 자동 분석 및 시각화</div>
    </div>
    <div style="padding: 14px; background: var(--vp-c-bg); border-radius: 8px; border: 1px solid var(--vp-c-divider);">
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">🤖 AI 집필 파이프라인</div>
      <div style="font-size: 0.82rem; color: var(--vp-c-text-2);">3단 목차 구성, 단락 집필, 개발자 톤 교정, SEO 추출</div>
    </div>
    <div style="padding: 14px; background: var(--vp-c-bg); border-radius: 8px; border: 1px solid var(--vp-c-divider);">
      <div style="font-weight: 600; font-size: 0.95rem; margin-bottom: 4px;">🚀 1클릭 블로그 발행</div>
      <div style="font-size: 0.82rem; color: var(--vp-c-text-2);">작성한 글을 VitePress 마크다운으로 자동 변환 및 발행</div>
    </div>
  </div>

  <div style="display: flex; gap: 12px; align-items: center;">
    <a href="http://127.0.0.1:9180" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; padding: 10px 20px; background: #3b82f6; color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.95rem;">
      스튜디오 열기 ↗
    </a>
    <span style="font-size: 0.85rem; color: var(--vp-c-text-3);">로컬 서버 포트: <code>9180</code></span>
  </div>
</div>
