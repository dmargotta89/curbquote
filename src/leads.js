const KEY = "curbquote.leads.v1";

export function loadLeads() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLead(lead) {
  const leads = loadLeads();
  const next = [lead, ...leads.filter((item) => item.id !== lead.id)];
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    return { ok: true, storedPhotos: true };
  } catch {
    const slim = {
      ...lead,
      photos: lead.photos?.slice(0, 1).map((photo) => ({
        ...photo,
        dataUrl: photo.dataUrl?.slice(0, 80_000) ?? "",
      })),
    };
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify([slim, ...leads.filter((item) => item.id !== lead.id)]),
      );
      return { ok: true, storedPhotos: false };
    } catch {
      const noPhotos = [{ ...lead, photos: [] }, ...leads];
      localStorage.setItem(KEY, JSON.stringify(noPhotos));
      return { ok: true, storedPhotos: false };
    }
  }
}

export function clearLeads() {
  localStorage.removeItem(KEY);
}
