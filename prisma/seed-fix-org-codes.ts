/**
 * Seed Script: Fix Organization Codes
 *
 * Updates organization codes and names to match actual African ANSP codes.
 * Creates any missing organizations.
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

interface OrganizationUpdate {
  searchPattern: string[];
  code: string;
  nameEn: string;
  nameFr: string;
  country: string;
}

// Mapping of organization names/patterns to correct codes
const organizationUpdates: OrganizationUpdate[] = [
  // Team 1: ASECNA & Southern Africa
  {
    searchPattern: ["ASECNA", "Agency for Aerial Navigation Safety"],
    code: "ASECNA",
    nameEn: "Agency for Aerial Navigation Safety in Africa and Madagascar",
    nameFr: "Agence pour la Securite de la Navigation Aerienne en Afrique et a Madagascar",
    country: "Senegal",
  },
  {
    searchPattern: ["ATNS", "Air Traffic and Navigation Services"],
    code: "ATNS",
    nameEn: "Air Traffic and Navigation Services",
    nameFr: "Services de la Circulation Aerienne et de la Navigation",
    country: "South Africa",
  },
  {
    searchPattern: ["CAAB", "Civil Aviation Authority of Botswana", "Botswana"],
    code: "CAAB",
    nameEn: "Civil Aviation Authority of Botswana",
    nameFr: "Autorite de l'Aviation Civile du Botswana",
    country: "Botswana",
  },
  {
    searchPattern: ["ESWACAA", "Eswatini", "Swaziland"],
    code: "ESWACAA",
    nameEn: "Eswatini Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile d'Eswatini",
    country: "Eswatini",
  },

  // Team 2: East African Community
  {
    searchPattern: ["KCAA", "Kenya Civil Aviation"],
    code: "KCAA",
    nameEn: "Kenya Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile du Kenya",
    country: "Kenya",
  },
  {
    searchPattern: ["TCAA", "Tanzania Civil Aviation"],
    code: "TCAA",
    nameEn: "Tanzania Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile de Tanzanie",
    country: "Tanzania",
  },
  {
    searchPattern: ["UCAA", "Uganda Civil Aviation"],
    code: "UCAA",
    nameEn: "Uganda Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile de l'Ouganda",
    country: "Uganda",
  },
  {
    searchPattern: ["RCAA", "Rwanda Civil Aviation"],
    code: "RCAA",
    nameEn: "Rwanda Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile du Rwanda",
    country: "Rwanda",
  },
  {
    searchPattern: ["BCAA", "Burundi Civil Aviation"],
    code: "BCAA",
    nameEn: "Burundi Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile du Burundi",
    country: "Burundi",
  },

  // Team 3: West African Anglophone
  {
    searchPattern: ["NAMA", "Nigerian Airspace Management"],
    code: "NAMA",
    nameEn: "Nigerian Airspace Management Agency",
    nameFr: "Agence Nigeriane de Gestion de l'Espace Aerien",
    country: "Nigeria",
  },
  {
    searchPattern: ["GCAA", "Ghana Civil Aviation"],
    code: "GCAA",
    nameEn: "Ghana Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile du Ghana",
    country: "Ghana",
  },
  {
    searchPattern: ["Roberts FIR", "RFIR", "Roberts Flight Information", "Liberia"],
    code: "RFIR",
    nameEn: "Roberts Flight Information Region",
    nameFr: "Region d'Information de Vol de Roberts",
    country: "Liberia",
  },

  // Team 4: Southern & Eastern Africa
  {
    searchPattern: ["ADM", "Aeroportos de Mocambique", "Mozambique"],
    code: "ADM",
    nameEn: "Aeroportos de Mocambique",
    nameFr: "Aeroports du Mozambique",
    country: "Mozambique",
  },
  {
    searchPattern: ["MCAA", "DCA-MW", "Malawi Civil Aviation", "Malawi"],
    code: "MCAA",
    nameEn: "Malawi Civil Aviation Authority",
    nameFr: "Autorite de l'Aviation Civile du Malawi",
    country: "Malawi",
  },
  {
    searchPattern: ["ACM", "ADEMA", "Aviation Civile de Madagascar", "Madagascar"],
    code: "ACM",
    nameEn: "Aviation Civile de Madagascar",
    nameFr: "Aviation Civile de Madagascar",
    country: "Madagascar",
  },
  {
    searchPattern: ["CAAZ", "Civil Aviation Authority of Zimbabwe", "Zimbabwe"],
    code: "CAAZ",
    nameEn: "Civil Aviation Authority of Zimbabwe",
    nameFr: "Autorite de l'Aviation Civile du Zimbabwe",
    country: "Zimbabwe",
  },
  {
    searchPattern: ["ZACL", "Zambia Airports", "Zambia"],
    code: "ZACL",
    nameEn: "Zambia Airports Corporation Limited",
    nameFr: "Societe des Aeroports de Zambie",
    country: "Zambia",
  },

  // Team 5: Northern Africa
  {
    searchPattern: ["DGAC", "ONDA", "Direction Generale", "Morocco", "Maroc"],
    code: "DGAC",
    nameEn: "Directorate General of Civil Aviation - Morocco",
    nameFr: "Direction Generale de l'Aviation Civile - Maroc",
    country: "Morocco",
  },
  {
    searchPattern: ["OACA", "Office de l'Aviation Civile", "Tunisia", "Tunisie"],
    code: "OACA",
    nameEn: "Civil Aviation and Airports Authority - Tunisia",
    nameFr: "Office de l'Aviation Civile et des Aeroports - Tunisie",
    country: "Tunisia",
  },
  {
    searchPattern: ["ANAC", "ENNA", "Agence Nationale", "Algeria", "Algerie"],
    code: "ANAC",
    nameEn: "National Civil Aviation Agency - Algeria",
    nameFr: "Agence Nationale de l'Aviation Civile - Algerie",
    country: "Algeria",
  },
];

function getRegion(country: string): "WACAF" | "ESAF" | "NORTHERN" {
  const esafCountries = [
    "South Africa",
    "Botswana",
    "Eswatini",
    "Kenya",
    "Tanzania",
    "Uganda",
    "Rwanda",
    "Burundi",
    "Mozambique",
    "Malawi",
    "Madagascar",
    "Zimbabwe",
    "Zambia",
  ];
  const northernCountries = ["Morocco", "Tunisia", "Algeria", "Egypt", "Libya"];

  if (esafCountries.includes(country)) {
    return "ESAF";
  } else if (northernCountries.includes(country)) {
    return "NORTHERN";
  }
  return "WACAF";
}

async function main() {
  console.log("\n🔧 Updating organization codes...\n");

  let updated = 0;
  let created = 0;

  for (const org of organizationUpdates) {
    // Try to find organization by any of the search patterns
    let organization = null;

    for (const pattern of org.searchPattern) {
      organization = await prisma.organization.findFirst({
        where: {
          OR: [
            { organizationCode: pattern },
            { nameEn: { contains: pattern, mode: "insensitive" } },
            { nameFr: { contains: pattern, mode: "insensitive" } },
            { country: { contains: pattern, mode: "insensitive" } },
          ],
        },
      });

      if (organization) break;
    }

    if (organization) {
      // Update the organization with correct code and names
      await prisma.organization.update({
        where: { id: organization.id },
        data: {
          organizationCode: org.code,
          nameEn: org.nameEn,
          nameFr: org.nameFr,
        },
      });

      console.log(`  ✅ Updated: ${org.code} - ${org.nameEn}`);
      updated++;
    } else {
      // Organization not found - create it
      console.log(`  ⚠️ Not found, creating: ${org.code} - ${org.nameEn}`);

      const region = getRegion(org.country);

      await prisma.organization.create({
        data: {
          organizationCode: org.code,
          nameEn: org.nameEn,
          nameFr: org.nameFr,
          country: org.country,
          region: region,
          membershipStatus: "ACTIVE",
          participationStatus: "ACTIVE",
        },
      });

      console.log(`  ✅ Created: ${org.code} - ${org.nameEn}`);
      created++;
    }
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("📊 ORGANIZATION CODE FIX SUMMARY");
  console.log("════════════════════════════════════════════════════════════");
  console.log(`  - Updated: ${updated} organizations`);
  console.log(`  - Created: ${created} organizations`);
  console.log(`  - Total: ${updated + created} organizations processed`);
  console.log("════════════════════════════════════════════════════════════\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
