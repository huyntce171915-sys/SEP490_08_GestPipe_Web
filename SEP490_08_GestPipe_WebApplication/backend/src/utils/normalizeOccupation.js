// Danh sách nghề
const OCCUPATION_LIST = [
  "IT", "Teacher", "Marketing", "Sales", "Finance",
  "Designer", "Healthcare", "Engineering", "Construction",
  "Legal", "Hospitality", "Science", "Administrative", "Student"
];

function normalizeOccupation(occupation) {
  if (!occupation) return "Other";
  const cleaned = occupation.trim().toLowerCase();

  for (const group of OCCUPATION_LIST) {
    if (cleaned === group.toLowerCase()) return group;
  }
  return "Other";
}

module.exports = { OCCUPATION_LIST, normalizeOccupation };
