import type { IntegrationQuery, IntegrationResponse } from '../shared/types/integration'

const INTEGRATION_API_URL = 'https://api1.simplyworkcrm.com/api:hBCeAvlC/integration'
const INTEGRATION_AUTH_TOKEN = 'eyJhbGciOiJBMjU2S1ciLCJlbmMiOiJBMjU2Q0JDLUhTNTEyIiwiemlwIjoiREVGIn0.yZeAJ0dQLw_vpoOXSLgEVcRYC_aI1K2ykE4IA9VpabUQ-QeQffts1CmmjuepOXjgPg0NJbQCkDLz9xVCTqAPj9QQJMzKNsBt.JTBM0Pd9hNc886n-_Sy5aA.iXxNCLMPFMvZr34_YluCfT6fZp2WmHZ-c5r8czN0B304XcjhLFH1ymbpder2JOkdQ_UWJ_mFcx25BMqWcrdiLvODVV8ryVO3djKn8uITNgJcT6o6BmLw9fd5w_ojkS66VmPiIK3S_m3XU2AGkZNBTWS2pryOVfEc6zguvg0_-JzVMYZJnXAhkKJM8_dhUdmL.doH_ISvq0mYIGQ8F4mnZKa4oKkS4CCkMA1cpbucb6_o'

export async function fetchIntegrations(query: IntegrationQuery, signal?: AbortSignal): Promise<IntegrationResponse> {
  const body: Record<string, unknown> = {
    page: query.page,
    per_page: query.perPage,
    sort: query.sort,
  }

  if (query.search) {
    body.search = query.search
  }

  if (query.filterExpression) {
    body.filter = query.filterExpression
  }

  const response = await fetch(INTEGRATION_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${INTEGRATION_AUTH_TOKEN}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
    signal,
  })

  if (!response.ok) {
    throw new Error(`Integration API request failed with status ${response.status}.`)
  }

  return response.json() as Promise<IntegrationResponse>
}
