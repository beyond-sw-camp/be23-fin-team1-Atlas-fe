import { apiClient } from './http'

// 백엔드가 내려주는 섹션 타입입니다.
export type IntegratedSearchSectionType =
  | 'USER'
  | 'ORGANIZATION'
  | 'SUPPLIER'
  | 'ITEM'
  | 'PURCHASE_ORDER'
  | 'SHIPMENT'
  | 'RETURN'
  | 'PRODUCTION_LINE'
  | 'SETTLEMENT'

// 검색 결과 한 줄 아이템입니다.
export interface IntegratedSearchItem {
  // 어떤 섹션 소속인지 구분합니다.
  type: IntegratedSearchSectionType

  // 숫자 ID를 쓰는 도메인용 값입니다.
  id: number | null

  // publicId를 쓰는 도메인용 값입니다.
  publicId: string | null

  // 카드에서 크게 보여줄 제목입니다.
  title: string

  // 카드 아래쪽 보조 설명입니다.
  subtitle: string | null

  // 상태값이 있으면 같이 내려옵니다.
  status: string | null
  
  thumbnailUrl?: string | null
}

// 섹션 묶음입니다.
export interface IntegratedSearchSection {
  // 섹션 종류입니다.
  type: IntegratedSearchSectionType

  // 섹션 표시 이름입니다.
  label: string

  // 현재 내려준 결과 개수입니다.
  totalCount: number

  // 실제 결과 목록입니다.
  items: IntegratedSearchItem[]
}

// 최종 통합검색 응답입니다.
export interface IntegratedSearchResponse {
  // 사용자가 입력한 검색어입니다.
  keyword: string

  // 섹션별 결과 목록입니다.
  sections: IntegratedSearchSection[]
}

export const integratedSearchService = {
  // 게이트웨이 통합검색 API를 호출합니다.
  async search(keyword: string, size: number = 5) {
    const response = await apiClient.get<IntegratedSearchResponse>('/api/search', {
      params: {
        keyword,
        size,
      },
    })

    return response.data
  },
}
