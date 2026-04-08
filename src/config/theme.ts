import type { OrganizationType, ScreenTheme } from '../types'

export function isTheme(value: string | undefined): value is ScreenTheme {
  return value === 'light' || value === 'dark'
}

export function isOrganization(value: string | undefined): value is OrganizationType {
  return value === 'mainBuyer' || value === 'supplier' || value === 'admin'
}

export const DESIGN_THEME_TOKENS: Record<ScreenTheme, Record<string, string>> = {
  dark: {
    background: '#131313',
    surface: '#131313',
    'surface-dim': '#131313',
    'surface-container-lowest': '#0E0E0E',
    'surface-container-low': '#1B1B1B',
    'surface-container': '#1F1F1F',
    'surface-container-high': '#2A2A2A',
    'surface-container-highest': '#353535',
    'surface-bright': '#393939',
    'surface-variant': '#353535',
    primary: '#FFFFFF',
    'primary-container': '#D4D4D4',
    'on-primary': '#1A1C1C',
    'on-background': '#E2E2E2',
    'on-surface': '#E2E2E2',
    'on-surface-variant': '#C6C6C6',
    outline: '#919191',
    'outline-variant': '#474747',
    secondary: '#C6C6C6',
    tertiary: '#E2E2E2',
    error: '#FFB4AB',
    'error-container': '#93000A',
    'surface-tint': '#C6C6C7',
  },
  light: {
    background: '#F9F9F9',
    surface: '#F9F9F9',
    'surface-dim': '#F9F9F9',
    'surface-container-lowest': '#FFFFFF',
    'surface-container-low': '#F2F4F4',
    'surface-container': '#EBEEEF',
    'surface-container-high': '#E4E9EA',
    'surface-container-highest': '#DDE4E5',
    'surface-bright': '#FFFFFF',
    'surface-variant': '#DDE4E5',
    primary: '#5E5E5E',
    'primary-container': '#E2E2E2',
    'on-primary': '#F8F8F8',
    'on-background': '#2D3435',
    'on-surface': '#2D3435',
    'on-surface-variant': '#596061',
    outline: '#757C7D',
    'outline-variant': '#ACB3B4',
    secondary: '#5F5F5F',
    'secondary-container': '#E4E2E1',
    tertiary: '#5F5F5F',
    error: '#9F403D',
    'error-container': '#FE8983',
    'surface-tint': '#5E5E5E',
  },
}
