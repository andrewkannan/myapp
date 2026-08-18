import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL || 'file:./dev.db' });
const prisma = new PrismaClient({ adapter });

const staffData = [
  {
    "ID": "LST",
    "Staff": "Wendy Loh",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "wendyloh@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "WSL",
    "Staff": "Lau Wen Siew",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "wensiewlau@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "LSM",
    "Staff": "Sharon Liew",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "sharonliew@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "LBT",
    "Staff": "Lois Bagtas",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "lois_bagtas@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "IVY",
    "Staff": "Maria Ivy Hidalgo",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "ivy@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "YHS",
    "Staff": "Alice Yong Hei Shin",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "yongshenglim@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "CYL",
    "Staff": "Valerie Choy",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "valerinakoh@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "LJY",
    "Staff": "Lim Jiayu ",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "jiayulim@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "JTJ",
    "Staff": "Jullia Tejoso",
    "Role (Radio/Sono)": "Sonographer",
    "Email": "jullia_tejoso@asiamedic.com.sg",
    "Modality": "US"
  },
  {
    "ID": "LNG",
    "Staff": "Ng Lisa ",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "lisang@asiamedic.com.sg",
    "Modality": "Mammo, US, X-Ray"
  },
  {
    "ID": "BAB",
    "Staff": "Bianca Badlis",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "biancabadlis@asiamedic.com.sg",
    "Modality": "Mammo, US"
  },
  {
    "ID": "SWJ",
    "Staff": "Sim Wanjou ",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "wanjousim@asiamedic.com.sg",
    "Modality": "Mammo, US, X-Ray"
  },
  {
    "ID": "RDR",
    "Staff": "Rajasvery",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "rajasvery@asiamedic.com.sg",
    "Modality": "Mammo, US, X-Ray"
  },
  {
    "ID": "CCL",
    "Staff": "Chang Chia Ling ",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "yulinhuang@asiamedic.com.sg",
    "Modality": "Mammo, X-Ray"
  },
  {
    "ID": "JSP",
    "Staff": "Jasmine Phua",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "jasminephua@asiamedic.com.sg",
    "Modality": "Mammo, X-Ray"
  },
  {
    "ID": "MYG",
    "Staff": "Michelle  Yee G Lin",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "michelleyee@asiamedic.com.sg",
    "Modality": "Mammo, X-Ray"
  },
  {
    "ID": "ABBY",
    "Staff": "Abegail Tan Docdoc",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "abby@asiamedic.com.sg",
    "Modality": "Mammo, US, X-Ray, MRI"
  },
  {
    "ID": "XIAN",
    "Staff": "Chee Su Xian",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "suxianchee@asiamedic.com.sg",
    "Modality": ""
  },
  {
    "ID": "LON",
    "Staff": "Marlon B Bernadas",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "marlon@asiamedic.com.sg",
    "Modality": "PET/CT, X-Ray"
  },
  {
    "ID": "EJP",
    "Staff": "Ethan Jude Pereira",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "judepereira@asiamedic.com.sg"
  },
  {
    "ID": "CYK",
    "Staff": "Cindy Wira Kusuma",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "cindy_kusuma@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "ABE",
    "Staff": "Grace Aguazon Rivera Abegail",
    "Role (Radio/Sono)": "Nuclear Med Tech",
    "Email": "abegail_rivera@asiamedic.com.sg",
    "Modality": "PET/CT"
  },
  {
    "ID": "CSW",
    "Staff": "Dorleen Chang",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "dorleenchang@asiamedic.com.sg",
    "Modality": "CT, X-Ray"
  },
  {
    "ID": "CYR",
    "Staff": "Irene Chen",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "irenechen@asiamedic.com.sg",
    "Modality": "CT, X-Ray"
  },
  {
    "ID": "ERW",
    "Staff": "Erwhin Agustin",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "erwhin@asiamedic.com.sg",
    "Modality": "PET/CT, MRI, X-Ray"
  },
  {
    "ID": "GDY",
    "Staff": "Gabriel Denice Yumul",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "denice_gabriel@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "HBM",
    "Staff": "Husna Bte Mohd Anwar",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "husnaanwar@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "LCF",
    "Staff": "Low Chan Foong",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "chanfoonglow@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "LYS",
    "Staff": "Lim Yong Sheng",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "yongshenglim@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "MDC",
    "Staff": "Michael Dela Cruz",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "michaeldelacruz@asiamedic.com.sg",
    "Modality": "CT, X-Ray"
  },
  {
    "ID": "SAS",
    "Staff": "Supradjo Amat Sopingi",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "supradjo@asiamedic.com.sg",
    "Modality": "MRI"
  },
  {
    "ID": "TCW",
    "Staff": "Tan Chieh Wei",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "chiehweitan@asiamedic.com.sg",
    "Modality": "CT, X-Ray"
  },
  {
    "ID": "HAR",
    "Staff": "Haruna Elangova",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "haruna@asiamedic.com.sg",
    "Modality": "CT, X-Ray"
  },
  {
    "ID": "HYL",
    "Staff": "Huang Yu Lin",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "yulinhuang@asiamedic.com.sg"
  },
  {
    "ID": "WYT",
    "Staff": "Woo Yee Thing",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "yeethingwoo@asiamedic.com.sg"
  },
  {
    "ID": "WCF",
    "Staff": "Wai Chooi Fun",
    "Role (Radio/Sono)": "Radiographer",
    "Email": "chooifunwai@asiamedic.com.sg"
  }
];

export async function GET() {
  try {
    let updated = 0;
    let created = 0;
    for (const row of staffData) {
      const abbr = (row['ID'] || '').toString().trim().toUpperCase();
      if (!abbr) continue;
      const email = row['Email'] ? row['Email'].toString().trim() : null;
      const modality = row['Modality'] ? row['Modality'].toString().trim() : null;
      const fullName = row['Staff'] ? row['Staff'].toString().trim() : null;
      const role = row['Role (Radio/Sono)'] ? row['Role (Radio/Sono)'].toString().trim() : null;
      const existingUser = await prisma.user.findUnique({ where: { abbreviation: abbr } });
      if (existingUser) {
        await prisma.user.update({ where: { id: existingUser.id }, data: { email, modality, fullName: existingUser.fullName || fullName, role: existingUser.role || role } });
        updated++;
      } else {
        await prisma.user.create({ data: { abbreviation: abbr, fullName, role, email, modality, accessLevel: 'STAFF', password: 'password123' } });
        created++;
      }
    }
    return NextResponse.json({ success: true, updated, created });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
