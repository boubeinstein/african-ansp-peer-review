/**
 * African Countries List
 *
 * Complete list of 54 African countries with ISO codes
 * and names in English and French.
 */

export interface AfricanCountry {
  code: string;
  nameEn: string;
  nameFr: string;
}

export const AFRICAN_COUNTRIES: AfricanCountry[] = [
  { code: "DZ", nameEn: "Algeria", nameFr: "Algérie" },
  { code: "AO", nameEn: "Angola", nameFr: "Angola" },
  { code: "BJ", nameEn: "Benin", nameFr: "Bénin" },
  { code: "BW", nameEn: "Botswana", nameFr: "Botswana" },
  { code: "BF", nameEn: "Burkina Faso", nameFr: "Burkina Faso" },
  { code: "BI", nameEn: "Burundi", nameFr: "Burundi" },
  { code: "CV", nameEn: "Cabo Verde", nameFr: "Cap-Vert" },
  { code: "CM", nameEn: "Cameroon", nameFr: "Cameroun" },
  { code: "CF", nameEn: "Central African Republic", nameFr: "République centrafricaine" },
  { code: "TD", nameEn: "Chad", nameFr: "Tchad" },
  { code: "KM", nameEn: "Comoros", nameFr: "Comores" },
  { code: "CG", nameEn: "Congo", nameFr: "Congo" },
  { code: "CD", nameEn: "Democratic Republic of the Congo", nameFr: "République démocratique du Congo" },
  { code: "CI", nameEn: "Côte d'Ivoire", nameFr: "Côte d'Ivoire" },
  { code: "DJ", nameEn: "Djibouti", nameFr: "Djibouti" },
  { code: "EG", nameEn: "Egypt", nameFr: "Égypte" },
  { code: "GQ", nameEn: "Equatorial Guinea", nameFr: "Guinée équatoriale" },
  { code: "ER", nameEn: "Eritrea", nameFr: "Érythrée" },
  { code: "SZ", nameEn: "Eswatini", nameFr: "Eswatini" },
  { code: "ET", nameEn: "Ethiopia", nameFr: "Éthiopie" },
  { code: "GA", nameEn: "Gabon", nameFr: "Gabon" },
  { code: "GM", nameEn: "Gambia", nameFr: "Gambie" },
  { code: "GH", nameEn: "Ghana", nameFr: "Ghana" },
  { code: "GN", nameEn: "Guinea", nameFr: "Guinée" },
  { code: "GW", nameEn: "Guinea-Bissau", nameFr: "Guinée-Bissau" },
  { code: "KE", nameEn: "Kenya", nameFr: "Kenya" },
  { code: "LS", nameEn: "Lesotho", nameFr: "Lesotho" },
  { code: "LR", nameEn: "Liberia", nameFr: "Libéria" },
  { code: "LY", nameEn: "Libya", nameFr: "Libye" },
  { code: "MG", nameEn: "Madagascar", nameFr: "Madagascar" },
  { code: "MW", nameEn: "Malawi", nameFr: "Malawi" },
  { code: "ML", nameEn: "Mali", nameFr: "Mali" },
  { code: "MR", nameEn: "Mauritania", nameFr: "Mauritanie" },
  { code: "MU", nameEn: "Mauritius", nameFr: "Maurice" },
  { code: "MA", nameEn: "Morocco", nameFr: "Maroc" },
  { code: "MZ", nameEn: "Mozambique", nameFr: "Mozambique" },
  { code: "NA", nameEn: "Namibia", nameFr: "Namibie" },
  { code: "NE", nameEn: "Niger", nameFr: "Niger" },
  { code: "NG", nameEn: "Nigeria", nameFr: "Nigéria" },
  { code: "RW", nameEn: "Rwanda", nameFr: "Rwanda" },
  { code: "ST", nameEn: "São Tomé and Príncipe", nameFr: "Sao Tomé-et-Príncipe" },
  { code: "SN", nameEn: "Senegal", nameFr: "Sénégal" },
  { code: "SC", nameEn: "Seychelles", nameFr: "Seychelles" },
  { code: "SL", nameEn: "Sierra Leone", nameFr: "Sierra Leone" },
  { code: "SO", nameEn: "Somalia", nameFr: "Somalie" },
  { code: "ZA", nameEn: "South Africa", nameFr: "Afrique du Sud" },
  { code: "SS", nameEn: "South Sudan", nameFr: "Soudan du Sud" },
  { code: "SD", nameEn: "Sudan", nameFr: "Soudan" },
  { code: "TZ", nameEn: "Tanzania", nameFr: "Tanzanie" },
  { code: "TG", nameEn: "Togo", nameFr: "Togo" },
  { code: "TN", nameEn: "Tunisia", nameFr: "Tunisie" },
  { code: "UG", nameEn: "Uganda", nameFr: "Ouganda" },
  { code: "ZM", nameEn: "Zambia", nameFr: "Zambie" },
  { code: "ZW", nameEn: "Zimbabwe", nameFr: "Zimbabwe" },
];

/**
 * Get country name by code in the specified locale
 */
export function getCountryName(code: string, locale: "en" | "fr"): string {
  const country = AFRICAN_COUNTRIES.find((c) => c.code === code);
  if (!country) return code;
  return locale === "fr" ? country.nameFr : country.nameEn;
}

/**
 * Get sorted countries for the specified locale
 */
export function getSortedCountries(locale: "en" | "fr"): AfricanCountry[] {
  return [...AFRICAN_COUNTRIES].sort((a, b) => {
    const nameA = locale === "fr" ? a.nameFr : a.nameEn;
    const nameB = locale === "fr" ? b.nameFr : b.nameEn;
    return nameA.localeCompare(nameB, locale);
  });
}
