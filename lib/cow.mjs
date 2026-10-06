export const COW_MAX = 10;

export function mergeCowClips(remoteClips, incomingClips) {
  const byId = {};
  (remoteClips || []).forEach((c) => {
    if (c && c.id && !c.up) byId[c.id] = c;
  });
  (incomingClips || []).forEach((c) => {
    if (!c || !c.id || c.up) return;
    const prev = byId[c.id] || {};
    byId[c.id] = Object.assign({}, prev, c, {
      votes: Math.max(prev.votes || 0, c.votes || 0),
    });
  });
  return Object.values(byId)
    .sort((a, b) => (b.votes || 0) - (a.votes || 0))
    .slice(0, COW_MAX);
}

export function emptyCowFile() {
  return { v: 1, updatedAt: new Date().toISOString(), clips: [] };
}
