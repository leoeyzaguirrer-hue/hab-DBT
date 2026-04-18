import { getInvitationCodes } from './actions'
import { InvitationsClient } from './InvitationsClient'

export const metadata = { title: 'Invitaciones — hab-DBT' }

export default async function InvitationsPage() {
  const codes = await getInvitationCodes()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  return <InvitationsClient codes={codes} appUrl={appUrl} />
}
