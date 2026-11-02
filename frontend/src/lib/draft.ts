export type GuestDraft = {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
};

// Данные формы живут вне страницы: после SLOT_TAKEN гость возвращается к выбору времени
// и снова открывает форму для того же типа встречи (docs/frontend.md).
const drafts = new Map<string, GuestDraft>();

export const saveDraft = (meetingTypeId: string, draft: GuestDraft) =>
  void drafts.set(meetingTypeId, draft);
export const loadDraft = (meetingTypeId: string) => drafts.get(meetingTypeId) ?? null;
export const clearDraft = () => drafts.clear();
