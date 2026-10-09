// Countries and states/regions people pick from, so everyone's profile uses the same spelling
// (which is what school/region-limited shared courses, ads and internships match on).

export const COUNTRIES = [
  "Nigeria", "Ghana", "Kenya", "South Africa", "Cameroon", "Uganda", "Tanzania", "Rwanda", "Ethiopia", "Egypt", "Morocco", "Senegal", "Côte d'Ivoire", "Benin", "Togo", "Sierra Leone", "Liberia", "Gambia", "Zambia", "Zimbabwe", "Botswana", "Namibia", "Malawi", "Mozambique", "Angola", "DR Congo", "Congo", "Gabon", "Niger", "Chad", "Mali", "Burkina Faso", "Guinea", "Sudan", "South Sudan", "Somalia", "Tunisia", "Algeria", "Libya", "Mauritius", "Madagascar", "Lesotho", "Eswatini", "Burundi", "Eritrea", "Djibouti", "Equatorial Guinea", "Central African Republic", "Cape Verde", "Guinea-Bissau", "Mauritania", "Comoros", "Seychelles", "São Tomé and Príncipe",
  "United Kingdom", "Ireland", "United States", "Canada", "Mexico", "Brazil", "Argentina", "Colombia", "Chile", "Peru", "Jamaica", "Trinidad and Tobago",
  "Germany", "France", "Netherlands", "Belgium", "Spain", "Portugal", "Italy", "Switzerland", "Austria", "Sweden", "Norway", "Denmark", "Finland", "Poland", "Czechia", "Hungary", "Romania", "Bulgaria", "Greece", "Ukraine", "Russia", "Turkey", "Cyprus", "Malta",
  "United Arab Emirates", "Saudi Arabia", "Qatar", "Kuwait", "Oman", "Bahrain", "Jordan", "Lebanon", "Israel", "Iran", "Iraq", "Pakistan", "India", "Bangladesh", "Sri Lanka", "Nepal",
  "China", "Japan", "South Korea", "Singapore", "Malaysia", "Indonesia", "Philippines", "Thailand", "Vietnam", "Australia", "New Zealand",
].sort((a, b) => (a === "Nigeria" ? -1 : b === "Nigeria" ? 1 : a.localeCompare(b)));

export const REGIONS: Record<string, string[]> = {
  Nigeria: ["Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara"],
  Ghana: ["Ahafo", "Ashanti", "Bono", "Bono East", "Central", "Eastern", "Greater Accra", "North East", "Northern", "Oti", "Savannah", "Upper East", "Upper West", "Volta", "Western", "Western North"],
  Kenya: ["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Kiambu", "Uasin Gishu", "Machakos", "Kajiado", "Kakamega", "Nyeri", "Meru", "Kilifi", "Embu", "Kisii", "Bungoma"],
  "South Africa": ["Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"],
  Cameroon: ["Adamawa", "Centre", "East", "Far North", "Littoral", "North", "Northwest", "South", "Southwest", "West"],
  Uganda: ["Central", "Eastern", "Northern", "Western"],
  "United Kingdom": ["England", "Scotland", "Wales", "Northern Ireland"],
};

// ---- Matching school names however people type them ----
// "Federal University Lokoja", "federal university of lokoja", "FUL" and "Fed Uni Lokoja" should
// all find the same school, so profiles, shared-course limits and ads all line up.

const STOP = new Set(["of", "the", "and", "&", "at", "in", "for"]);
const SHORT: Record<string, string> = { fed: "federal", uni: "university", univ: "university", poly: "polytechnic", tech: "technology", coll: "college", educ: "education", sci: "science", st: "state" };

/** Lowercase words without punctuation, filler words or the "(ACRONYM)" part; common shortenings expanded. */
export function normName(s: string): string {
  return s.toLowerCase().replace(/\(.*?\)/g, " ").replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w && !STOP.has(w)).map((w) => SHORT[w] ?? w).join(" ");
}

/** The acronyms a school goes by: the one in brackets ("UNILAG") and its initials ("FUL"). */
export function acronymsOf(name: string): string[] {
  const out: string[] = [];
  const paren = name.match(/\(([^)]+)\)/)?.[1];
  if (paren) out.push(...paren.split(/[,/]/).map((x) => x.trim().toLowerCase()).filter(Boolean));
  const initials = normName(name).split(" ").map((w) => w[0]).join("");
  if (initials.length >= 2) out.push(initials);
  return out;
}

/** Does what someone typed match this school? */
export function schoolMatches(name: string, q: string): boolean {
  const t = q.trim().toLowerCase();
  if (!t) return true;
  const nq = normName(t), nn = normName(name);
  if (nn.includes(nq) || name.toLowerCase().includes(t)) return true;
  if (acronymsOf(name).some((a) => a === t.replace(/[^a-z0-9]/g, ""))) return true;
  // Every word typed appears in the name ("lokoja federal").
  const words = nq.split(" ").filter(Boolean);
  return words.length > 1 && words.every((w) => nn.includes(w));
}

/** The listed school someone most likely meant, if what they typed is really the same school. */
export function sameSchool(typed: string, names: string[]): string | undefined {
  const t = typed.trim().toLowerCase().replace(/[^a-z0-9]/g, ""), nt = normName(typed);
  return names.find((n) => normName(n) === nt) ?? names.find((n) => acronymsOf(n).includes(t));
}

/** "lagos" -> "Lagos": the listed spelling of a country or state, if it matches. */
export function canonical(typed: string, list: string[]): string | undefined {
  const t = typed.trim().toLowerCase().replace(/[^a-z]/g, "");
  return list.find((x) => x.toLowerCase().replace(/[^a-z]/g, "") === t);
}
