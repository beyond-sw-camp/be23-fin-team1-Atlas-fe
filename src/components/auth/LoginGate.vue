<script setup lang="ts">
import { computed } from 'vue'
import { UI_COPY } from '../../config/appCopy'
import { useAtlasSessionStore } from '../../stores/session'

const session = useAtlasSessionStore()

// 인증 만료 시각을 화면에 보기 좋게 바꿉니다.
const formattedVerificationExpiresAt = computed(() => {
  if (!session.loginVerificationExpiresAt) return '-'

  const date = new Date(session.loginVerificationExpiresAt)

  // 날짜 파싱이 안 되면 원본을 그대로 보여줍니다.
  if (Number.isNaN(date.getTime())) {
    return session.loginVerificationExpiresAt
  }

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'Asia/Seoul',
  }).format(date)
})
</script>

<template>
  <main class="login-screen">
    <section class="login-card">
      <div class="login-card__brand" aria-label="ATLAS">
        <img src="/atlas_A_wordmark_light.svg" alt="ATLAS" />
      </div>
      <div class="login-card__eyebrow">{{ UI_COPY.secureAccess.ko }}</div>

      <!-- 일반 로그인 단계입니다. -->
      <template v-if="!session.loginVerificationRequired">
        <h1>{{ UI_COPY.loginTitle.ko }}</h1>
        <p>{{ UI_COPY.loginDescription.ko }}</p>

        <form class="login-form" @submit.prevent="session.signIn">
          <label>
            <span>{{ UI_COPY.loginId.ko }}</span>
            <input v-model="session.loginId" type="text" autocomplete="username" />
          </label>

          <label>
            <span>{{ UI_COPY.loginPassword.ko }}</span>
            <input
              v-model="session.loginPassword"
              type="password"
              autocomplete="current-password"
            />
          </label>

          <button type="submit">{{ UI_COPY.loginButton.ko }}</button>
        </form>

        <div class="login-hint">{{ UI_COPY.loginHint.ko }}</div>
        <div v-if="session.loginError" class="login-error">{{ session.loginError }}</div>
      </template>

      <!-- 새 IP 이메일 인증 단계입니다. -->
      <template v-else>
        <h1>{{ '이메일 인증' }}</h1>

        <p>
          새로운 IP에서 로그인이 감지되었습니다. 이메일로 받은 인증 코드를 3분 안에 입력해 주세요.
        </p>

        <form class="login-form" @submit.prevent="session.verifyLoginIp">
          <label>
            <span>{{ '인증 코드' }}</span>
            <input
              v-model="session.loginVerificationCode"
              type="text"
              inputmode="numeric"
              autocomplete="one-time-code"
              placeholder="123456"
            />
          </label>

          <button type="submit">
            {{ '인증하기' }}
          </button>
        </form>

        <div class="login-hint">
          인증 만료 시각: {{ formattedVerificationExpiresAt }}
        </div>

        <div v-if="session.loginVerificationError" class="login-error">
          {{ session.loginVerificationError }}
        </div>

        <button
          type="button"
          class="login-link"
          style="margin-top: 12px;"
          @click="session.cancelLoginVerification"
        >
          {{ '다시 로그인하기' }}
        </button>
      </template>
    </section>
  </main>
</template>
