<script setup lang="ts">
import { UI_COPY } from '../../config/appCopy'
import { useAtlasPreferencesStore } from '../../stores/preferences'
import { useAtlasSessionStore } from '../../stores/session'

const preferences = useAtlasPreferencesStore()
const session = useAtlasSessionStore()
</script>

<template>
  <main class="login-screen">
    <section class="login-card">
      <div class="login-card__eyebrow">{{ UI_COPY.secureAccess[preferences.language] }}</div>
      <h1>{{ UI_COPY.loginTitle[preferences.language] }}</h1>
      <p>{{ UI_COPY.loginDescription[preferences.language] }}</p>
      <form class="login-form" @submit.prevent="session.signIn">
        <label>
          <span>{{ UI_COPY.loginId[preferences.language] }}</span>
          <input v-model="session.loginId" type="text" autocomplete="username" />
        </label>
        <label>
          <span>{{ UI_COPY.loginPassword[preferences.language] }}</span>
          <input v-model="session.loginPassword" type="password" autocomplete="current-password" />
        </label>
        <button type="submit">{{ UI_COPY.loginButton[preferences.language] }}</button>
      </form>
      <div class="login-hint">{{ UI_COPY.loginHint[preferences.language] }}</div>
      <div v-if="session.loginError" class="login-error">{{ session.loginError }}</div>
    </section>
  </main>
</template>
