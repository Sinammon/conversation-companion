export function isApproved(session: { allowAI: boolean; approvedUrl?: string }, url: string) {
  return !!url && session.allowAI && session.approvedUrl === url;
}
