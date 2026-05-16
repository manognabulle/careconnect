const MEDICINES = [
  { id: "m1", name: "Paracetamol 500mg", salt: "Paracetamol" },
  { id: "m2", name: "Dolo 650", salt: "Paracetamol" },
  { id: "m3", name: "Amoxicillin 500mg", salt: "Amoxicillin" }
];

const text = "Paracitamol\nDulo 650\nAmoxcillin";

const getEditDistance = (a, b) => {
  if (!a || !b) return (a || b || "").length;
  const matrix = Array.from({ length: b.length + 1 }, (_, i) => [i]);
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
      else matrix[i][j] = Math.min(matrix[i - 1][j - 1], matrix[i][j - 1], matrix[i - 1][j]) + 1;
    }
  }
  return matrix[b.length][a.length];
};

const cleanedWords = text
  .toLowerCase()
  .replace(/[^a-z\s]/g, "")
  .split(/\s+/)
  .filter(w => w.length > 2);

console.log("cleanedWords:", cleanedWords);

const dictionary = {
  "dola": "dolo",
  "amoxicillan": "amoxicillin",
  "amox": "amoxicillin",
  "novamar": "novamox",
  "pavacetanol": "paracetamol"
};

const correctedWords = cleanedWords.map(w => dictionary[w] || w);
console.log("correctedWords:", correctedWords);

const matchedMeds = new Set();

MEDICINES.forEach(m => {
  const nameParts = m.name.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  const saltParts = m.salt.toLowerCase().replace(/[^a-z\s]/g, "").split(/\s+/).filter(w => w.length > 2);
  
  let isMatch = false;

  for (const word of correctedWords) {
    const checkMatch = target => {
      if (target === word) return true;
      if (target.length > 4 && word.length > 4 && (target.includes(word) || word.includes(target))) return true;
      if (target.length > 3) {
        const maxDist = target.length > 5 ? 2 : 1;
        if (getEditDistance(target, word) <= maxDist) return true;
      }
      return false;
    };

    if (nameParts.some(checkMatch) || saltParts.some(checkMatch)) {
      isMatch = true;
    }
  }

  if (isMatch) {
    matchedMeds.add(m.name.split(' ')[0]);
  }
});

const extractedList = Array.from(matchedMeds);
console.log("extractedList:", extractedList);
