<script setup lang="ts">
import { computed } from 'vue'
import { useAtlasPreferencesStore } from '../../../stores/preferences'

const preferences = useAtlasPreferencesStore()

const CONTENT = {
  ko: {
    intro: 'SCM Webpage Design 프로젝트의 Stitch 스타일 가이드와 DESIGN.md 기준을 정리한 운영용 디자인 시스템 보드.',
    metrics: [
      { label: '모드', value: '3', meta: '기술 정밀 / 도면형 / 고대비' },
      { label: '토큰', value: '24', meta: '밝은 표면 · 어두운 표면 / 외곽선 / 상태 색상' },
      { label: '컴포넌트', value: '12', meta: '트리거 · 프롬프트 · 패널 · 리본 패턴' },
    ],
    modesTitle: '시각 모드',
    modesChip: '스타일',
    modes: [
      { eyebrow: '어두운 모드', title: '기술 정밀', text: '순수 흑백, 배경 tonal stacking, 고밀도 운영 레이아웃.' },
      { eyebrow: '밝은 모드', title: '도면형 설계', text: '도면 같은 라인, 얇은 보더, 밝은 시트 기반 정보 패널.' },
      { eyebrow: '변형', title: '고대비', text: '핵심 수치와 상태 리본의 가독성을 극단적으로 올린 감사/관리 모드.' },
    ],
    colorTitle: '색상 구조',
    colorChip: '토큰',
    lightTitle: '밝은 표면',
    darkTitle: '기술 정밀',
    typeTitle: '타이포그래피 계층',
    typeChip: '글꼴',
    triggersTitle: '트리거 라이브러리',
    triggersChip: '컴포넌트',
    symbolsTitle: '기술 기호 규칙',
    symbolsChip: '가이드',
    symbolItems: [
      ['반경 없음', '모든 컨테이너와 버튼은 90도 각진 모서리 유지'],
      ['강한 라벨', '네비게이션과 메타 라벨은 강한 자간 적용'],
      ['상태 리본', '상태는 아이콘보다 좌측 리본과 수치 강조로 표현'],
      ['그림자 없음', '일반 카드 그림자 금지, tonal layering으로만 깊이 표현'],
    ],
  },
  en: {
    intro: 'Operational design board distilled from the SCM Webpage Design Stitch guide and the local DESIGN.md system rules.',
    metrics: [
      { label: 'MODE', value: '3', meta: 'Technical Precision / Blueprint / High Contrast' },
      { label: 'TOKENS', value: '24', meta: 'Light · Dark surface / outline / status set' },
      { label: 'COMPONENTS', value: '12', meta: 'Trigger · Prompt · Panel · Ribbon patterns' },
    ],
    modesTitle: 'Visual Modes',
    modesChip: 'STITCH',
    modes: [
      { eyebrow: 'Dark Mode', title: 'Technical Precision', text: 'Pure monochrome, tonal stacking, and dense operational layouts.' },
      { eyebrow: 'Light Mode', title: 'Kinetic Blueprint', text: 'Blueprint-like line work, hairline borders, and bright sheet-based information panels.' },
      { eyebrow: 'Variant', title: 'High Contrast', text: 'Audit and control mode with extreme readability for metrics and status ribbons.' },
    ],
    colorTitle: 'Color Architecture',
    colorChip: 'TOKENS',
    lightTitle: 'Monolith Light',
    darkTitle: 'Technical Precision',
    typeTitle: 'Editorial Grid Hierarchy',
    typeChip: 'TYPE',
    triggersTitle: 'Kinetic Trigger Library',
    triggersChip: 'COMPONENT',
    symbolsTitle: 'Technical Symbol Array',
    symbolsChip: 'GUIDE',
    symbolItems: [
      ['No Radius', 'All containers and buttons keep strict 90-degree corners'],
      ['Upper Labels', 'Navigation and metadata labels use uppercase with extended tracking'],
      ['Status Ribbon', 'Status is expressed through left ribbons and numeric emphasis, not decorative icons'],
      ['No Shadow', 'Standard shadows are forbidden; depth comes from tonal layering only'],
    ],
  },
}

const content = computed(() => CONTENT.ko)

const lightTokens = [
  ['Background', '#FFFFFF'],
  ['Surface', '#F5F5F5'],
  ['On Surface', '#121212'],
  ['Muted', '#474747'],
  ['Outline', '20% #474747'],
]

const darkTokens = [
  ['Background', '#000000'],
  ['Surface', '#131313'],
  ['On Surface', '#FFFFFF'],
  ['Muted', '#C6C6C6'],
  ['Outline', '#474747'],
]

const typography = [
  ['Display LG', '3.5rem / 700', 'DATA COMMAND CENTER'],
  ['Headline MD', '1.75rem / 600', 'Supply Chain Integration Terminal'],
  ['Title SM', '1rem / 500', 'Module title and operational labels'],
  ['Label MD', '0.75rem / 600', 'UPPERCASE NAVIGATION / METADATA'],
  ['Body MD', '0.875rem / 400', 'Readable dense table and operational copy'],
]
</script>

<template>
  <section class="app-screen design-system-page">
    <article class="page-panel design-system-page__intro">
      <div class="page-panel__head">
        <div>
          <div class="page-panel__eyebrow">스타일 // 디자인 시스템</div>
          <h3>공급망 화면 디자인</h3>
        </div>
        <span class="page-panel__chip">관리자</span>
      </div>
      <p class="design-system-page__lede">{{ content.intro }}</p>
    </article>

    <section class="page-metrics design-system-page__metrics">
      <article v-for="metric in content.metrics" :key="metric.label" class="page-metric">
        <span class="page-metric__label">{{ metric.label }}</span>
        <strong class="page-metric__value">{{ metric.value }}</strong>
        <span class="page-metric__meta">{{ metric.meta }}</span>
      </article>
    </section>

    <section class="page-panels">
      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">운영 모드</div>
            <h3>{{ content.modesTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.modesChip }}</span>
        </div>
        <div class="design-mode-grid">
          <div v-for="mode in content.modes" :key="mode.title" class="design-mode-card">
            <span class="page-panel__eyebrow">{{ mode.eyebrow }}</span>
            <strong>{{ mode.title }}</strong>
            <p>{{ mode.text }}</p>
          </div>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">토큰 보드</div>
            <h3>{{ content.colorTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.colorChip }}</span>
        </div>
        <div class="design-token-columns">
          <section class="design-token-stack design-token-stack--light">
            <header>
              <span class="page-panel__eyebrow">밝은 표면</span>
              <strong>{{ content.lightTitle }}</strong>
            </header>
            <div v-for="[label, value] in lightTokens" :key="label" class="design-token-row">
              <span>{{ label }}</span>
              <code>{{ value }}</code>
            </div>
          </section>
          <section class="design-token-stack design-token-stack--dark">
            <header>
              <span class="page-panel__eyebrow">어두운 표면</span>
              <strong>{{ content.darkTitle }}</strong>
            </header>
            <div v-for="[label, value] in darkTokens" :key="label" class="design-token-row">
              <span>{{ label }}</span>
              <code>{{ value }}</code>
            </div>
          </section>
        </div>
      </article>

      <article class="page-panel">
        <div class="page-panel__head">
          <div>
            <div class="page-panel__eyebrow">타이포그래피</div>
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
            <div class="page-panel__eyebrow">컴포넌트 라이브러리</div>
            <h3>{{ content.triggersTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.triggersChip }}</span>
        </div>
        <div class="design-trigger-column">
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
            <div class="page-panel__eyebrow">도식 규칙</div>
            <h3>{{ content.symbolsTitle }}</h3>
          </div>
          <span class="page-panel__chip">{{ content.symbolsChip }}</span>
        </div>
        <div class="page-feed">
          <div v-for="[label, text] in content.symbolItems" :key="label" class="page-feed__item">
            <span class="page-feed__label">{{ label }}</span>
            <strong class="page-feed__text">{{ text }}</strong>
          </div>
        </div>
      </article>
    </section>
  </section>
</template>
