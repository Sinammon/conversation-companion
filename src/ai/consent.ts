export function isApproved(session: { allowAI: boolean; approvedUrl?: string; approvedProvider?: string }, url: string) {
  return !!url && session.allowAI && session.approvedUrl === url && session.approvedProvider === 'gemini';
}
