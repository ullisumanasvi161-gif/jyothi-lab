const fs = require('fs');
const path = require('path');
const db = require('./db');

async function initializeDatabase() {
  try {
    let exists = false;
    
    if (db.dialect === 'postgres') {
      const check = await db.get(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users');"
      );
      exists = check && check.exists;
    } else {
      const check = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users';"
      );
      exists = !!check;
    }
    
    if (exists) {
      console.log('Database already initialized (users table exists). Skipping schema setup.');
      await runMigrations();
      await seedNewTests();
      return;
    }
    
    console.log('Database not initialized. Reading schema file...');
    const schemaFile = db.dialect === 'postgres' ? 'schema_postgres.sql' : 'schema_sqlite.sql';
    const schemaPath = path.join(__dirname, '../../', schemaFile);
    
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found at: ${schemaPath}`);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    console.log(`Executing ${schemaFile} in the database...`);
    await db.exec(schemaSql);
    console.log('Database schema successfully initialized.');
    
    await runMigrations();
    await seedNewTests();
  } catch (err) {
    console.error('Database initialization failed:', err);
    process.exit(1);
  }
}

async function runMigrations() {
  console.log('Checking database migrations for Insurance & Cashless Billing...');
  
  // 1. Check/Add Patients Columns
  const patientCols = [
    { name: 'patient_type', type: "TEXT DEFAULT 'General'" },
    { name: 'insurance_company', type: 'TEXT' },
    { name: 'policy_number', type: 'TEXT' },
    { name: 'policy_holder_name', type: 'TEXT' },
    { name: 'insurance_id', type: 'TEXT' },
    { name: 'coverage_amount', type: 'REAL DEFAULT 0.0' },
    { name: 'corporate_company', type: 'TEXT' },
    { name: 'insurance_document_path', type: 'TEXT' }
  ];

  for (const col of patientCols) {
    try {
      if (db.dialect === 'postgres') {
        const typeStr = col.type.replace('TEXT', 'VARCHAR(100)').replace('REAL', 'DECIMAL(10,2)');
        await db.run(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS ${col.name} ${typeStr}`);
      } else {
        const info = await db.query(`PRAGMA table_info(patients)`);
        const exists = info.some(c => c.name === col.name);
        if (!exists) {
          console.log(`SQLite: Altering table patients, adding column: ${col.name}`);
          await db.run(`ALTER TABLE patients ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    } catch (err) {
      console.error(`Failed to add column ${col.name} to patients:`, err.message);
    }
  }

  // 2. Check/Add Bills Columns
  const billCols = [
    { name: 'is_cashless', type: 'INTEGER DEFAULT 0' },
    { name: 'claim_status', type: "TEXT DEFAULT 'None'" },
    { name: 'claim_amount', type: 'REAL DEFAULT 0.0' },
    { name: 'insurance_company', type: 'TEXT' },
    { name: 'policy_number', type: 'TEXT' },
    { name: 'insurance_id', type: 'TEXT' },
    { name: 'corporate_company', type: 'TEXT' }
  ];

  for (const col of billCols) {
    try {
      if (db.dialect === 'postgres') {
        const typeStr = col.type.replace('TEXT', 'VARCHAR(100)').replace('REAL', 'DECIMAL(10,2)').replace('INTEGER', 'INT');
        await db.run(`ALTER TABLE bills ADD COLUMN IF NOT EXISTS ${col.name} ${typeStr}`);
      } else {
        const info = await db.query(`PRAGMA table_info(bills)`);
        const exists = info.some(c => c.name === col.name);
        if (!exists) {
          console.log(`SQLite: Altering table bills, adding column: ${col.name}`);
          await db.run(`ALTER TABLE bills ADD COLUMN ${col.name} ${col.type}`);
        }
      }
    } catch (err) {
      console.error(`Failed to add column ${col.name} to bills:`, err.message);
    }
  }

  // 3. Check/Create Signatures Table
  try {
    if (db.dialect === 'postgres') {
      await db.run(`
        CREATE TABLE IF NOT EXISTS signatures (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL,
          name VARCHAR(255) NOT NULL,
          designation VARCHAR(255) NOT NULL,
          department VARCHAR(255),
          signature_path VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
      `);
    } else {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='signatures';"
      );
      if (!tableCheck) {
        console.log('SQLite: Creating signatures table...');
        await db.exec(`
          CREATE TABLE signatures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            designation TEXT NOT NULL,
            department TEXT,
            signature_path TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
          );
        `);
      }
    }
    console.log('Signatures table verified/created.');
  } catch (err) {
    console.error('Failed to migrate signatures table:', err.message);
  }
  
  // 4. WhatsApp Delivery Logs Table
  try {
    if (db.dialect === 'postgres') {
      await db.run(`
        CREATE TABLE IF NOT EXISTS whatsapp_logs (
          id SERIAL PRIMARY KEY,
          report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
          patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
          patient_name VARCHAR(255),
          patient_phone VARCHAR(30) NOT NULL,
          bill_number VARCHAR(100),
          test_name VARCHAR(255),
          template_id INTEGER,
          message_body TEXT,
          status VARCHAR(30) DEFAULT 'Pending',
          wa_message_id VARCHAR(255),
          error_message TEXT,
          retry_count INTEGER DEFAULT 0,
          sent_at TIMESTAMP,
          delivered_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='whatsapp_logs';"
      );
      if (!tableCheck) {
        console.log('SQLite: Creating whatsapp_logs table...');
        await db.exec(`
          CREATE TABLE whatsapp_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            report_id INTEGER REFERENCES reports(id) ON DELETE SET NULL,
            patient_id INTEGER REFERENCES patients(id) ON DELETE SET NULL,
            patient_name TEXT,
            patient_phone TEXT NOT NULL,
            bill_number TEXT,
            test_name TEXT,
            template_id INTEGER,
            message_body TEXT,
            status TEXT DEFAULT 'Pending',
            wa_message_id TEXT,
            error_message TEXT,
            retry_count INTEGER DEFAULT 0,
            sent_at TIMESTAMP,
            delivered_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    }
    console.log('whatsapp_logs table verified/created.');
  } catch (err) {
    console.error('Failed to migrate whatsapp_logs table:', err.message);
  }

  // 5. WhatsApp Templates Table
  try {
    if (db.dialect === 'postgres') {
      await db.run(`
        CREATE TABLE IF NOT EXISTS wa_templates (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          body TEXT NOT NULL,
          is_default INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
    } else {
      const tableCheck = await db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='wa_templates';"
      );
      if (!tableCheck) {
        console.log('SQLite: Creating wa_templates table...');
        await db.exec(`
          CREATE TABLE wa_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT,
            body TEXT NOT NULL,
            is_default INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    }
    console.log('wa_templates table verified/created.');
    await seedDefaultWhatsAppTemplates();
  } catch (err) {
    console.error('Failed to migrate wa_templates table:', err.message);
  }

  console.log('Database migrations completed.');
}

async function seedDefaultWhatsAppTemplates() {
  const defaultTemplates = [
    {
      name: 'Standard Report Ready',
      description: 'Default template for report delivery notification',
      body: `🔬 *{{lab_name}} — Report Ready*\n\nDear {{patient_name}},\n\nYour lab report for *{{test_name}}* is now ready and has been approved by our pathologist.\n\n📋 *Bill Number:* {{bill_number}}\n📅 *Report Date:* {{report_date}}\n\nPlease find your report attached to this message.\n\n_For queries, contact us at {{phone}}_\n\n*{{lab_name}}*\n{{address}}`,
      is_default: 1
    },
    {
      name: 'Short Notification',
      description: 'Brief report delivery message',
      body: `Hello {{patient_name}}, your *{{test_name}}* report (Bill: {{bill_number}}) from {{lab_name}} is ready. Report attached. 📄\n\nQueries: {{phone}}`,
      is_default: 0
    },
    {
      name: 'Hindi / Telugu Bilingual',
      description: 'Bilingual report notification for local patients',
      body: `🔬 *{{lab_name}} — రిపోర్ట్ సిద్ధంగా ఉంది*\n\nప్రియమైన {{patient_name}} గారు,\n\nమీ *{{test_name}}* పరీక్ష నివేదిక సిద్ధంగా ఉంది.\nబిల్ నంబర్: {{bill_number}}\n\nరిపోర్ట్ ఈ సందేశానికి జతచేయబడింది.\n\nSampark: {{phone}}\n*{{lab_name}}, {{address}}*`,
      is_default: 0
    }
  ];

  for (const tpl of defaultTemplates) {
    try {
      const existing = await db.get('SELECT id, body FROM wa_templates WHERE name = $1', [tpl.name]);
      if (!existing) {
        await db.run(
          'INSERT INTO wa_templates (name, description, body, is_default) VALUES ($1, $2, $3, $4)',
          [tpl.name, tpl.description, tpl.body, tpl.is_default]
        );
        console.log(`Seeded WhatsApp template: ${tpl.name}`);
      } else if (existing.body.includes('Jyothi') || existing.body.includes('9856628943')) {
        await db.run(
          'UPDATE wa_templates SET body = $1, description = $2 WHERE id = $3',
          [tpl.body, tpl.description, existing.id]
        );
        console.log(`Updated WhatsApp template to use dynamic placeholders: ${tpl.name}`);
      }
    } catch (err) {
      console.error(`Failed to seed/update template ${tpl.name}:`, err.message);
    }
  }
}

async function seedNewTests() {
  const newTests = [
    {
      code: 'DENGUE_IGM',
      name: 'Dengue Antibody, IgM ( Elisa Method) - Dengue IgM Elisa',
      department: 'Pathology',
      price: 800.00,
      normal_range: JSON.stringify([
        { parameter: 'Sample Type', min: '', max: '', unit: '' },
        { parameter: 'Result', min: '', max: '', unit: '' },
        { parameter: 'Method', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'dengue_template'
    },
    {
      code: 'HOMA_IR',
      name: 'HOMA IR : INSULIN RESISTANCE INDEX',
      department: 'Pathology',
      price: 1200.00,
      normal_range: JSON.stringify([
        { parameter: 'Glucose Fasting', min: 70, max: 100, unit: 'mg/dL' },
        { parameter: 'Insulin Fasting', min: 2.6, max: 24.9, unit: 'uIU/mL' },
        { parameter: 'HOMA-IR', min: 0.5, max: 1.9, unit: 'Ratio' }
      ]),
      unit: 'Profile',
      template: 'homair_template'
    },
    {
      code: 'PUS_CS',
      name: 'PUS CULTURE AND SENSITIVITY',
      department: 'Pathology',
      price: 500.00,
      normal_range: JSON.stringify([
        { parameter: 'Sample Type', min: '', max: '', unit: '' },
        { parameter: 'Growth', min: '', max: '', unit: '' },
        { parameter: 'Organism Isolated', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'pus_cs_template'
    },
    {
      code: 'URINE_PP',
      name: 'URINE PP ( BLOOD GLUCOSE LEVEL )',
      department: 'Pathology',
      price: 60.00,
      normal_range: JSON.stringify([
        { parameter: 'Urine Glucose Post Prandial', min: '', max: '', unit: '' }
      ]),
      unit: 'mg/dL',
      template: 'urine_pp_template'
    },
    {
      code: '17_OHP',
      name: '17-HYDROXYPROGESTERONE',
      department: 'Pathology',
      price: 1000.00,
      normal_range: JSON.stringify([
        { parameter: '17-Hydroxyprogesterone', min: 0.5, max: 2.5, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'ohp_template'
    },
    {
      code: '17_OHP_ALT',
      name: '17-HYDROXYPROGESTERONE (17-OHP)',
      department: 'Pathology',
      price: 1000.00,
      normal_range: JSON.stringify([
        { parameter: '17-Hydroxyprogesterone (17-OHP)', min: 0.5, max: 2.5, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'ohp_alt_template'
    },
    {
      code: '17_OH_PROG',
      name: '17-OH-PROGESTERON - 17-OH-PROGESTERON',
      department: 'Pathology',
      price: 1500.00,
      normal_range: JSON.stringify([
        { parameter: '17-OH-Progesterone', min: 0.5, max: 2.5, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'ohp_prog_template'
    },
    {
      code: '24H_ALB',
      name: '24 HRS URINARY ALBUMIN - 24 HRS URINARY ALBUMIN',
      department: 'Pathology',
      price: 600.00,
      normal_range: JSON.stringify([
        { parameter: 'Urinary Albumin', min: 0, max: 30, unit: 'mg/24 hrs' }
      ]),
      unit: 'mg/24 hrs',
      template: '24h_alb_template'
    },
    {
      code: '24H_CALCIUM',
      name: '24 HRS URINARY CALCIUM',
      department: 'Pathology',
      price: 200.00,
      normal_range: JSON.stringify([
        { parameter: 'Urinary Calcium', min: 100, max: 300, unit: 'mg/24 hrs' }
      ]),
      unit: 'mg/24 hrs',
      template: '24h_calcium_template'
    },
    {
      code: '24H_PHOSPHORUS',
      name: '24 HRS URINARY PHOSPHORUS',
      department: 'Pathology',
      price: 300.00,
      normal_range: JSON.stringify([
        { parameter: 'Urinary Phosphorus', min: 0.4, max: 1.3, unit: 'g/24 hrs' }
      ]),
      unit: 'g/24 hrs',
      template: 'phosphorus_template'
    },
    {
      code: '24H_PROTEIN',
      name: '24 HRS URINARY PROTEIN',
      department: 'Pathology',
      price: 250.00,
      normal_range: JSON.stringify([
        { parameter: 'Urinary Protein', min: 0, max: 150, unit: 'mg/24 hrs' }
      ]),
      unit: 'mg/24 hrs',
      template: 'protein_template'
    },
    {
      code: '24H_URIC_ACID',
      name: '24 HRS URINARY URIC ACID',
      department: 'Pathology',
      price: 300.00,
      normal_range: JSON.stringify([
        { parameter: 'Urinary Uric Acid', min: 250, max: 750, unit: 'mg/24 hrs' }
      ]),
      unit: 'mg/24 hrs',
      template: 'uric_acid_template'
    },
    {
      code: '24H_VMA',
      name: '24 HRS. URINARY VMA',
      department: 'Pathology',
      price: 3550.00,
      normal_range: JSON.stringify([
        { parameter: 'Vanillylmandelic Acid (VMA)', min: 1.0, max: 8.0, unit: 'mg/24 hrs' }
      ]),
      unit: 'mg/24 hrs',
      template: 'vma_template'
    },
    {
      code: '24H_METANEPHRINE',
      name: '24 Hrs. Urine Metanephrine',
      department: 'Pathology',
      price: 2900.00,
      normal_range: JSON.stringify([
        { parameter: 'Urine Metanephrine', min: 74, max: 297, unit: 'mcg/24 hrs' }
      ]),
      unit: 'mcg/24 hrs',
      template: 'metanephrine_template'
    },
    {
      code: 'VITAMIN_D',
      name: '25 (OH) VITAMIN-D, SERUM',
      department: 'Pathology',
      price: 100.00,
      normal_range: JSON.stringify([
        { parameter: '25-Hydroxy Vitamin D', min: 30.0, max: 100.0, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'vitd_template'
    },
    {
      code: 'AP_RESECTION',
      name: 'Abdominoperineal resection',
      department: 'Pathology',
      price: 5000.00,
      normal_range: JSON.stringify([
        { parameter: 'Specimen', min: '', max: '', unit: '' },
        { parameter: 'Gross Examination', min: '', max: '', unit: '' },
        { parameter: 'Microscopic Examination', min: '', max: '', unit: '' },
        { parameter: 'Diagnosis', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'ap_resection_template'
    },
    {
      code: 'AEC',
      name: 'ABSOLUTE EOSINOPHIL COUNT ( AEC ) - AEC',
      department: 'Pathology',
      price: 250.00,
      normal_range: JSON.stringify([
        { parameter: 'Absolute Eosinophil Count', min: 40, max: 440, unit: '/cumm' }
      ]),
      unit: '/cumm',
      template: 'aec_template'
    },
    {
      code: 'ACH_RECEPTOR_AB',
      name: 'ACETYLCHOLINE RECEPTOR AUTOANTIBODY',
      department: 'Pathology',
      price: 3500.00,
      normal_range: JSON.stringify([
        { parameter: 'AChR Binding Antibody', min: 0.0, max: 0.4, unit: 'nmol/L' }
      ]),
      unit: 'nmol/L',
      template: 'achr_ab_template'
    },
    {
      code: 'ACID_PHOSPHATASE',
      name: 'ACID PHOSPHATASE TOTAL',
      department: 'Pathology',
      price: 2000.00,
      normal_range: JSON.stringify([
        { parameter: 'Acid Phosphatase Total', min: 0.0, max: 6.5, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'acp_template'
    },
    {
      code: 'ADA_MTB',
      name: 'ADENOSINE DEAMINASE ACTIVITY - MTB ( ADA - MTB )',
      department: 'Pathology',
      price: 3000.00,
      normal_range: JSON.stringify([
        { parameter: 'ADA Activity', min: 0, max: 40, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'ada_mtb_template'
    },
    {
      code: 'CAPD_ADEQUACY',
      name: 'Adequacy test for CAPD fluid',
      department: 'Pathology',
      price: 3000.00,
      normal_range: JSON.stringify([
        { parameter: 'CAPD Fluid Volume', min: '', max: '', unit: '' },
        { parameter: 'Creatinine Clearance', min: '', max: '', unit: '' },
        { parameter: 'Urea Clearance (Kt/V)', min: 1.7, max: 10.0, unit: 'Ratio' }
      ]),
      unit: 'Profile',
      template: 'capd_template'
    },
    {
      code: 'ACTH',
      name: 'ADRENOCORTICOTROPIC HORMONE ( ACTH ) - ACTH',
      department: 'Pathology',
      price: 2500.00,
      normal_range: JSON.stringify([
        { parameter: 'ACTH (Morning)', min: 7.2, max: 63.3, unit: 'pg/mL' }
      ]),
      unit: 'pg/mL',
      template: 'acth_template'
    },
    {
      code: 'AFB_STAIN',
      name: 'AFB Staining',
      department: 'Pathology',
      price: 300.00,
      normal_range: JSON.stringify([
        { parameter: 'AFB Smear Result', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'afb_smear_template'
    },
    {
      code: 'AFB_CULTURE',
      name: 'AFB/TB Culture - Fluorescent method (Rapid -MGIT) - AFB/TB Culture',
      department: 'Pathology',
      price: 1500.00,
      normal_range: JSON.stringify([
        { parameter: 'Specimen Type', min: '', max: '', unit: '' },
        { parameter: 'Growth Result', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'afb_culture_template'
    },
    {
      code: 'ALBERTS_STAIN',
      name: 'ALBERTS STAIN REPORT',
      department: 'Pathology',
      price: 1150.00,
      normal_range: JSON.stringify([
        { parameter: 'Corynebacterium diphtheriae', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'alberts_template'
    },
    {
      code: 'ALBUMIN',
      name: 'Albumin - Albumin',
      department: 'Pathology',
      price: 200.00,
      normal_range: JSON.stringify([
        { parameter: 'Serum Albumin', min: 3.5, max: 5.2, unit: 'g/dL' }
      ]),
      unit: 'g/dL',
      template: 'albumin_template'
    },
    {
      code: 'AG_RATIO',
      name: 'Albumin/Globulin Ratio - A/G Ration',
      department: 'Pathology',
      price: 300.00,
      normal_range: JSON.stringify([
        { parameter: 'Serum Albumin', min: 3.5, max: 5.2, unit: 'g/dL' },
        { parameter: 'Serum Globulin', min: 2.0, max: 3.5, unit: 'g/dL' },
        { parameter: 'A/G Ratio', min: 1.1, max: 2.2, unit: 'Ratio' }
      ]),
      unit: 'Profile',
      template: 'ag_ratio_template'
    },
    {
      code: 'ALDOLASE',
      name: 'ALDOLASE ENZYMATIC',
      department: 'Pathology',
      price: 1100.00,
      normal_range: JSON.stringify([
        { parameter: 'Serum Aldolase', min: 1.5, max: 8.1, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'aldolase_template'
    },
    {
      code: 'ALDOSTERONE',
      name: 'ALDOSTERONE',
      department: 'Pathology',
      price: 1950.00,
      normal_range: JSON.stringify([
        { parameter: 'Aldosterone (Upright)', min: 4.0, max: 31.0, unit: 'ng/dL' },
        { parameter: 'Aldosterone (Supine)', min: 1.0, max: 16.0, unit: 'ng/dL' }
      ]),
      unit: 'ng/dL',
      template: 'aldosterone_template'
    },
    {
      code: 'ARR_RATIO',
      name: 'ALDOSTERONE/DIRECT RENIN RATIO',
      department: 'Pathology',
      price: 6000.00,
      normal_range: JSON.stringify([
        { parameter: 'Aldosterone', min: 1.0, max: 16.0, unit: 'ng/dL' },
        { parameter: 'Direct Renin', min: 4.4, max: 46.1, unit: 'uIU/mL' },
        { parameter: 'ARR Ratio', min: 0.0, max: 20.0, unit: 'Ratio' }
      ]),
      unit: 'Profile',
      template: 'arr_template'
    },
    {
      code: 'ALP_INF',
      name: 'ALKALINE PHOSPHATASE INF',
      department: 'Pathology',
      price: 200.00,
      normal_range: JSON.stringify([
        { parameter: 'Alkaline Phosphatase (Infant)', min: 110, max: 350, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'alp_inf_template'
    },
    {
      code: 'ALLERGY_CONTACT',
      name: 'allergy panel CONTACT',
      department: 'Pathology',
      price: 2500.00,
      normal_range: JSON.stringify([
        { parameter: 'Contact Allergens Screen', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'allergy_contact_template'
    },
    {
      code: 'ALLERGY_DRUGS',
      name: 'allergy panel DRUGS',
      department: 'Pathology',
      price: 2750.00,
      normal_range: JSON.stringify([
        { parameter: 'Drug Allergens Screen', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'allergy_drugs_template'
    },
    {
      code: 'ALLERGY_FOOD_NONVEG',
      name: 'allergy panel food nonveg',
      department: 'Pathology',
      price: 2000.00,
      normal_range: JSON.stringify([
        { parameter: 'Food Allergens (Non-Veg)', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'allergy_food_nonveg_template'
    },
    {
      code: 'ALLERGY_FOOD_VEG',
      name: 'allergy panel food VEG',
      department: 'Pathology',
      price: 3000.00,
      normal_range: JSON.stringify([
        { parameter: 'Food Allergens (Veg)', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'allergy_food_veg_template'
    },
    {
      code: 'ALLERGY_INHALANTS',
      name: 'Allergy Panel INHALANTS',
      department: 'Pathology',
      price: 3000.00,
      normal_range: JSON.stringify([
        { parameter: 'Inhalant Allergens Screen', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'allergy_inhalants_template'
    },
    {
      code: 'ALLERGY_PROFILE_5',
      name: 'Allergy Profile - 5',
      department: 'Pathology',
      price: 500.00,
      normal_range: JSON.stringify([
        { parameter: 'Total IgE', min: 0, max: 100, unit: 'kU/L' }
      ]),
      unit: 'kU/L',
      template: 'allergy_profile_5_template'
    },
    {
      code: 'AFP',
      name: 'ALPHA FETOPROTEIN ( AFP )',
      department: 'Pathology',
      price: 650.00,
      normal_range: JSON.stringify([
        { parameter: 'Alpha Fetoprotein (AFP)', min: 0.0, max: 8.5, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'afp_template'
    },
    {
      code: 'AMMONIA',
      name: 'AMMONIA',
      department: 'Pathology',
      price: 4000.00,
      normal_range: JSON.stringify([
        { parameter: 'Plasma Ammonia', min: 15, max: 45, unit: 'umol/L' }
      ]),
      unit: 'umol/L',
      template: 'ammonia_template'
    },
    {
      code: 'AMYLASE',
      name: 'AMYLASE',
      department: 'Pathology',
      price: 600.00,
      normal_range: JSON.stringify([
        { parameter: 'Serum Amylase', min: 28, max: 100, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'amylase_template'
    },
    {
      code: 'AMYLASE_FLUID',
      name: 'AMYLASE FLUID',
      department: 'Pathology',
      price: 4000.00,
      normal_range: JSON.stringify([
        { parameter: 'Fluid Amylase', min: 0, max: 50, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'amylase_fluid_template'
    },
    {
      code: 'ANA_BLOT',
      name: 'ANA BLOT',
      department: 'Pathology',
      price: 3300.00,
      normal_range: JSON.stringify([
        { parameter: 'ANA Blot Profile', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'ana_blot_template'
    },
    {
      code: 'ANA_IFA',
      name: 'ANA BY IFA - ANA IFA',
      department: 'Pathology',
      price: 1100.00,
      normal_range: JSON.stringify([
        { parameter: 'ANA IFA Screen', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'ana_ifa_template'
    },
    {
      code: 'ANA_IFA_TITRE',
      name: 'ANA BY IFA WITH TITRE - ANA IFA',
      department: 'Pathology',
      price: 1200.00,
      normal_range: JSON.stringify([
        { parameter: 'ANA IFA Titre', min: '', max: '', unit: '' },
        { parameter: 'Pattern', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'ana_ifa_titre_template'
    },
    {
      code: 'CANCA',
      name: 'ANCA (ANTI NEUTROPHIL CYTOPLASMIC ANTIBODIES) C - C ANCA',
      department: 'Pathology',
      price: 1500.00,
      normal_range: JSON.stringify([
        { parameter: 'C-ANCA Result', min: '', max: '', unit: '' }
      ]),
      unit: 'Qualitative',
      template: 'canca_template'
    },
    {
      code: 'ANCA_CP',
      name: 'ANCA (ANTI NEUTROPHIL CYTOPLASMIC ANTIBODIES) P & C - ANCA C & P',
      department: 'Pathology',
      price: 2800.00,
      normal_range: JSON.stringify([
        { parameter: 'C-ANCA Result', min: '', max: '', unit: '' },
        { parameter: 'P-ANCA Result', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'anca_cp_template'
    },
    {
      code: 'ANDROSTENEDIONE',
      name: 'ANDROSTEINDIONE LEVEL',
      department: 'Pathology',
      price: 2000.00,
      normal_range: JSON.stringify([
        { parameter: 'Androstenedione', min: 0.3, max: 3.3, unit: 'ng/mL' }
      ]),
      unit: 'ng/mL',
      template: 'androstenedione_template'
    },
    {
      code: 'ACE',
      name: 'ANGIOTENSIN CONVERTING ENZYME (ACE) - ACE',
      department: 'Pathology',
      price: 1400.00,
      normal_range: JSON.stringify([
        { parameter: 'Angiotensin Converting Enzyme (ACE)', min: 8, max: 52, unit: 'U/L' }
      ]),
      unit: 'U/L',
      template: 'ace_template'
    },
    {
      code: 'ANT_RESECTION',
      name: 'Anterior resection',
      department: 'Pathology',
      price: 400.00,
      normal_range: JSON.stringify([
        { parameter: 'Specimen', min: '', max: '', unit: '' },
        { parameter: 'Gross Description', min: '', max: '', unit: '' },
        { parameter: 'Microscopic Findings', min: '', max: '', unit: '' },
        { parameter: 'Diagnosis', min: '', max: '', unit: '' }
      ]),
      unit: 'Profile',
      template: 'ant_resection_template'
    }
  ];

  for (const t of newTests) {
    try {
      const check = await db.get('SELECT id FROM tests WHERE code = $1', [t.code]);
      if (!check) {
        console.log(`Seeding test: ${t.name}`);
        await db.run(
          'INSERT INTO tests (code, name, department, price, normal_range, unit, template) VALUES ($1, $2, $3, $4, $5, $6, $7)',
          [t.code, t.name, t.department, t.price, t.normal_range, t.unit, t.template]
        );
      }
    } catch (err) {
      console.error(`Failed to seed test ${t.code}:`, err);
    }
  }
}

module.exports = initializeDatabase;
