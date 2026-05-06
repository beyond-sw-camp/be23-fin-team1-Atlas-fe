<script setup lang="ts">
import { computed } from 'vue'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    introTitle: 'KINETIC BLUEPRINT SYSTEM SPEC V1.0',
    introMeta: 'Sovereign Architecture Protocol // Technical Documentation',
    introText:
      'Stitch의 SYSTEM Spec 화면과 현재 FE의 DESIGN.md를 기준으로, 디자인 시스템이 실제 화면 구현에서 지켜야 할 계층과 규칙을 정리한 운영 문서.',
    foundationTitle: 'Foundation Modes',
    foundationChip: 'SPEC',
    foundations: [
      { label: 'DARK MODE', title: 'Technical Precision', text: '배경 tonal stacking, no-line rule, 고밀도 명령형 운영 인터페이스.' },
      { label: 'LIGHT MODE', title: 'Kinetic Blueprint', text: '밝은 시트 위 얇은 선과 정교한 여백으로 기술 도면 같은 리듬 형성.' },
      { label: 'VARIANT', title: 'High Contrast', text: '핵심 KPI와 상태 리본의 우선순위를 극대화하는 감사/관리 레이어.' },
    ],
    colorsTitle: 'Color Architecture',
    colorsChip: 'TOKENS',
    typeTitle: 'Editorial Grid Hierarchy',
    typeChip: 'TYPO',
    triggerTitle: 'Kinetic Trigger Library',
    triggerChip: 'UI',
    symbolTitle: 'Technical Symbol Array',
    symbolChip: 'RULES',
    footerTitle: 'Governance Notes',
    footerChip: 'CHECKLIST',
    footerItems: [
      { label: 'No Radius', text: '모든 카드와 버튼은 0px radius 유지' },
      { label: 'No Shadow', text: '일반 카드 그림자 금지, tonal layering만 허용' },
      { label: 'Upper Metadata', text: '네비게이션과 메타 데이터는 대문자·확장 자간 유지' },
      { label: 'Status First', text: '색은 경고/오류/상태에만 사용, 장식용 색상 금지' },
    ],
  },
  en: {
    introTitle: 'KINETIC BLUEPRINT SYSTEM SPEC V1.0',
    introMeta: 'Sovereign Architecture Protocol // Technical Documentation',
    introText:
      'Operational documentation derived from the Stitch SYSTEM Spec screen and local DESIGN.md rules, describing the hierarchy and implementation constraints of the interface.',
    foundationTitle: 'Foundation Modes',
    foundationChip: 'SPEC',
    foundations: [
      { label: 'DARK MODE', title: 'Technical Precision', text: 'Tonal stacking, no-line rule, and dense command-oriented operational UI.' },
      { label: 'LIGHT MODE', title: 'Kinetic Blueprint', text: 'Blueprint-like line work and precise spacing on bright sheets.' },
      { label: 'VARIANT', title: 'High Contrast', text: 'Audit and control layer emphasizing KPI and status ribbons.' },
    ],
    colorsTitle: 'Color Architecture',
    colorsChip: 'TOKENS',
    typeTitle: 'Editorial Grid Hierarchy',
    typeChip: 'TYPO',
    triggerTitle: 'Kinetic Trigger Library',
    triggerChip: 'UI',
    symbolTitle: 'Technical Symbol Array',
    symbolChip: 'RULES',
    footerTitle: 'Governance Notes',
    footerChip: 'CHECKLIST',
    footerItems: [
      { label: 'No Radius', text: 'All cards and buttons maintain 0px radius' },
      { label: 'No Shadow', text: 'Standard card shadows are forbidden; tonal layering only' },
      { label: 'Upper Metadata', text: 'Navigation and metadata use uppercase with extended tracking' },
      { label: 'Status First', text: 'Color is reserved for alerts and status only, never decoration' },
    ],
  },
}

const content = computed(() => CONTENT.ko)

const lightTokens = [
  ['Core Background', '#FFFFFF'],
  ['Primary Surface', '#F5F5F5'],
  ['On Surface', '#121212'],
  ['Muted Text', '#474747'],
  ['Outline Variant', '20% #474747'],
]

const darkTokens = [
  ['Core Background', '#000000'],
  ['Primary Surface', '#131313'],
  ['On Surface', '#FFFFFF'],
  ['Muted Text', '#C6C6C6 / #919191'],
  ['Outline Variant', '#474747'],
]

const typography = [
  ['Display LG', '3.5rem · 700', 'DATA COMMAND CENTER'],
  ['Headline MD', '1.75rem · 600', 'Supply Chain Integration Terminal'],
  ['Title SM', '1rem · 500', 'Module titles / operator context'],
  ['Label MD', '0.75rem · 600', 'UPPERCASE LABEL / NAV TAG'],
]
</script>

<template>
  <section class="app-screen system-spec-page">
    <article class="page-panel spec-intro-panel">
      <div class="spec-intro-panel__rail" />
      <div class="spec-intro-panel__body">
        <span class="page-panel__eyebrow">SOVEREIGN</span>
        <h2>{{ content.introTitle }}</h2>
        <p class="spec-intro-panel__meta">{{ content.introMeta }}</p>
        <p class="spec-intro-panel__text">{{ content.introText }}</p>
      </div>
    </article>

    <section class="page-panels page-panels--spec">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">MODE STACK</div>
            <h3>{{ content.foundationTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.foundationChip }}</span>
        </div>
        <div class="design-mode-grid">
          <div v-for="mode in content.foundations" :key="mode.title" class="design-mode-card">
            <span class="page-panel__eyebrow">{{ mode.label }}</span>
            <strong>{{ mode.title }}</strong>
            <p>{{ mode.text }}</p>
          </div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">톤 시스템</div>
            <h3>{{ content.colorsTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.colorsChip }}</span>
        </div>
        <div class="design-token-columns">
          <section class="design-token-stack design-token-stack--dark">
            <header>
              <span class="page-panel__eyebrow">기술 정밀</span>
              <strong>어두운 표면 명세</strong>
            </header>
            <div v-for="[label, value] in darkTokens" :key="label" class="design-token-row">
              <span>{{ label }}</span>
              <code>{{ value }}</code>
            </div>
          </section>
          <section class="design-token-stack design-token-stack--light">
            <header>
              <span class="page-panel__eyebrow">도면형 설계</span>
              <strong>밝은 표면 명세</strong>
            </header>
            <div v-for="[label, value] in lightTokens" :key="label" class="design-token-row">
              <span>{{ label }}</span>
              <code>{{ value }}</code>
            </div>
          </section>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">글꼴 크기</div>
            <h3>{{ content.typeTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.typeChip }}</span>
        </div>
        <div class="design-type-list">
          <div v-for="[label, spec, sample] in typography" :key="label" class="design-type-sample">
            <span class="page-panel__eyebrow">{{ label }}</span>
            <strong>{{ sample }}</strong>
            <code>{{ spec }}</code>
          </div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">실행 패턴</div>
            <h3>{{ content.triggerTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.triggerChip }}</span>
        </div>
        <div class="spec-trigger-layout">
          <div class="design-trigger-row">
            <button class="page-button page-button--primary" type="button">주요 실행</button>
            <button class="page-button page-button--secondary" type="button">보조 절차</button>
          </div>
          <label class="design-command-field">
            <span class="page-panel__eyebrow">터미널 입력</span>
            <input type="text" placeholder="시스템 명령 입력..." readonly />
          </label>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">구현 규칙</div>
            <h3>{{ content.symbolTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.symbolChip }}</span>
        </div>
        <div class="page-feed">
          <div v-for="item in content.footerItems" :key="item.label" class="page-feed__item">
            <span class="page-feed__label">{{ item.label }}</span>
            <strong class="page-feed__text">{{ item.text }}</strong>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
