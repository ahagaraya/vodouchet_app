export const SORT_OPTIONS = [
  { id: "new", label: "Сначала новые" },
  { id: "old", label: "Сначала старые" },
  { id: "best", label: "Хорошие сначала" },
  { id: "worst", label: "Плохие сначала" }
];

export function reviewCountLabel(n) {
  if (n === 1) return "отзыв";
  if (n >= 2 && n <= 4) return "отзыва";
  return "отзывов";
}

export function ratingFromReviews(reviews) {
  if (!reviews.length) return { avg: null, count: 0 };
  const sum = reviews.reduce((s, r) => s + Number(r.rating || 0), 0);
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length };
}

export function sortReviews(items, sortBy) {
  const list = [...items];
  const byDateDesc = (a, b) => new Date(b.created_at) - new Date(a.created_at) || b.id - a.id;
  const byDateAsc = (a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id;

  switch (sortBy) {
    case "old":
      return list.sort(byDateAsc);
    case "best":
      return list.sort((a, b) => Number(b.rating) - Number(a.rating) || byDateDesc(a, b));
    case "worst":
      return list.sort((a, b) => Number(a.rating) - Number(b.rating) || byDateDesc(a, b));
    default:
      return list.sort(byDateDesc);
  }
}
