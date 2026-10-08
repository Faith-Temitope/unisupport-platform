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
