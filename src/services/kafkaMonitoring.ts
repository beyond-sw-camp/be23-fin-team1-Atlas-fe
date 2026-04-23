import { apiClient } from './http'
import type { SpringPage } from '../types'

export interface KafkaEventSummaryResponse {
  ruleId: string
  ruleName: string
  topic: string
  eventType: string
  condition: string
  threshold: string | number
  triggeredCount: number
  enabled: boolean
  importance: string
}

export interface KafkaSubscriptionStatusResponse {
  topic: string
  partitionCount: number
  committedOffset: number | string
  endOffset: number | string
  lag: number | string
  messagesPerHour: number
  brokerConnectionStatus: string
  consumerSubscriptionStatus: string
}

export interface KafkaEventSummaryUpsertRequest {
  ruleId?: string
  ruleName: string
  topic: string
  eventType: string
  condition: string
  threshold: string | number
  importance: string
  enabled: boolean
}

export interface KafkaEventEnabledUpdateRequest {
  enabled: boolean
}

export interface GetKafkaEventRulesParams {
  page?: number
  size?: number
}

export async function getKafkaEventRules(
  params: GetKafkaEventRulesParams = {},
): Promise<SpringPage<KafkaEventSummaryResponse>> {
  const response = await apiClient.get<SpringPage<KafkaEventSummaryResponse>>(
    '/api/control/monitoring/kafka/events',
    {
      params: {
        page: 0,
        size: 10,
        ...params,
      },
    },
  )
  return response.data
}

export async function getKafkaSubscriptions(): Promise<KafkaSubscriptionStatusResponse[]> {
  const response = await apiClient.get<KafkaSubscriptionStatusResponse[]>(
    '/api/control/monitoring/kafka/subscriptions',
  )
  return response.data
}

export async function createKafkaEventRule(
  data: KafkaEventSummaryUpsertRequest,
): Promise<KafkaEventSummaryResponse> {
  const response = await apiClient.post<KafkaEventSummaryResponse>(
    '/api/control/monitoring/kafka/events',
    data,
  )
  return response.data
}

export async function updateKafkaEventRule(
  ruleId: string,
  data: KafkaEventSummaryUpsertRequest,
): Promise<KafkaEventSummaryResponse> {
  const response = await apiClient.put<KafkaEventSummaryResponse>(
    `/api/control/monitoring/kafka/events/${ruleId}`,
    data,
  )
  return response.data
}

export async function updateKafkaEventRuleEnabled(
  ruleId: string,
  enabled: boolean,
): Promise<void> {
  await apiClient.patch(
    `/api/control/monitoring/kafka/events/${ruleId}/enabled`,
    { enabled } satisfies KafkaEventEnabledUpdateRequest,
  )
}

export async function deleteKafkaEventRule(ruleId: string): Promise<void> {
  await apiClient.delete(`/api/control/monitoring/kafka/events/${ruleId}`)
}
