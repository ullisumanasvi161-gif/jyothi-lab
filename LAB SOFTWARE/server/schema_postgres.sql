-- PostgreSQL Database Schema for Jyothi Lab

-- Drop tables if they exist
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS reports CASCADE;
DROP TABLE IF EXISTS bill_items CASCADE;
DROP TABLE IF EXISTS bills CASCADE;
DROP TABLE IF EXISTS tests CASCADE;
DROP TABLE IF EXISTS patients CASCADE;
DROP TABLE IF EXISTS doctors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL, -- Admin, Receptionist, Pathologist, Lab Technician, Staff, Doctor
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Doctors Table
CREATE TABLE doctors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  specialization VARCHAR(100),
  commission_percentage DECIMAL(5, 2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Patients Table
CREATE TABLE patients (
  id SERIAL PRIMARY KEY,
  uhid VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age INT NOT NULL,
  age_unit VARCHAR(10) DEFAULT 'Years', -- Years, Months, Days
  phone VARCHAR(15) NOT NULL,
  email VARCHAR(100),
  address TEXT,
  referral_doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL,
  patient_type VARCHAR(20) DEFAULT 'General',
  insurance_company VARCHAR(100),
  policy_number VARCHAR(50),
  policy_holder_name VARCHAR(100),
  insurance_id VARCHAR(50),
  coverage_amount DECIMAL(10, 2) DEFAULT 0.0,
  corporate_company VARCHAR(100),
  insurance_document_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tests Table
CREATE TABLE tests (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  department VARCHAR(50) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  normal_range TEXT, -- JSON representation of reference values
  unit VARCHAR(20),
  template TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bills Table
CREATE TABLE bills (
  id SERIAL PRIMARY KEY,
  bill_number VARCHAR(20) UNIQUE NOT NULL,
  patient_id INT REFERENCES patients(id) ON DELETE RESTRICT,
  referral_doctor_id INT REFERENCES doctors(id) ON DELETE SET NULL,
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0.0,
  gst_amount DECIMAL(10, 2) DEFAULT 0.0,
  net_amount DECIMAL(10, 2) NOT NULL,
  paid_amount DECIMAL(10, 2) DEFAULT 0.0,
  due_amount DECIMAL(10, 2) NOT NULL,
  payment_status VARCHAR(20) DEFAULT 'Due', -- Paid, Due, Partial
  is_cashless INT DEFAULT 0,
  claim_status VARCHAR(50) DEFAULT 'None',
  claim_amount DECIMAL(10, 2) DEFAULT 0.0,
  insurance_company VARCHAR(100),
  policy_number VARCHAR(50),
  insurance_id VARCHAR(50),
  corporate_company VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bill Items Table
CREATE TABLE bill_items (
  id SERIAL PRIMARY KEY,
  bill_id INT REFERENCES bills(id) ON DELETE CASCADE,
  test_id INT REFERENCES tests(id) ON DELETE RESTRICT,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reports Table
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  bill_id INT REFERENCES bills(id) ON DELETE CASCADE,
  patient_id INT REFERENCES patients(id) ON DELETE RESTRICT,
  test_id INT REFERENCES tests(id) ON DELETE RESTRICT,
  result_values JSONB, -- JSON representation of patient result values
  status VARCHAR(20) DEFAULT 'Pending', -- Pending, Waiting, Approved
  approved_by INT REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments Table
CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  bill_id INT REFERENCES bills(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  payment_method VARCHAR(30) NOT NULL, -- Cash, Card, UPI, Net Banking
  transaction_id VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings Table
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(50) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Initial Admin User (password: admin123)
-- bcrypt hash for 'admin123' is '$2a$10$1OnqZd8CVu.tUPMGVX.9.eKa40hu4cKgvcsOiH8ro7iwOcNe/.LqC'
INSERT INTO users (name, phone, email, password, role, is_active)
VALUES ('System Admin', '9876543210', 'admin@jyothilab.com', '$2a$10$1OnqZd8CVu.tUPMGVX.9.eKa40hu4cKgvcsOiH8ro7iwOcNe/.LqC', 'Admin', true);

-- Seed Default Settings
INSERT INTO settings (key, value) VALUES
('receipt_header', '{"labName":"Jyothi Lab","tagline":"Precision Diagnostics, Care & Trust","address":"12-34 Main Road, Opp Metro, Hyderabad","phone":"+91 98765 43210","email":"info@jyothilab.com","gstin":"36AAAAA1111A1Z1"}'),
('report_settings', '{"footer":"This is an electronically verified report. Signature is uploaded by the Pathologist.","emailEnabled":true,"whatsappEnabled":true}'),
('email_settings', '{"host":"smtp.mailtrap.io","port":2525,"user":"","pass":"","from":"no-reply@jyothilab.com"}'),
('whatsapp_settings', '{"apiUrl":"https://api.mockwhatsapp.com/v1/send","token":"mock-token-12345"}');

-- Seed Sample Tests
INSERT INTO tests (code, name, department, price, normal_range, unit, template) VALUES
('CBC', 'Complete Blood Count', 'Hematology', 350.00, '[{"parameter":"Hemoglobin","min":12.0,"max":16.0,"unit":"g/dL"},{"parameter":"WBC Count","min":4000,"max":11000,"unit":"/cumm"},{"parameter":"Platelet Count","min":150000,"max":450000,"unit":"/cumm"}]', 'Profile', 'cbc_template'),
('LFT', 'Liver Function Test', 'Biochemistry', 750.00, '[{"parameter":"Bilirubin Total","min":0.2,"max":1.2,"unit":"mg/dL"},{"parameter":"SGOT (AST)","min":5,"max":40,"unit":"U/L"},{"parameter":"SGPT (ALT)","min":5,"max":40,"unit":"U/L"}]', 'Profile', 'lft_template'),
('FBS', 'Fasting Blood Sugar', 'Biochemistry', 100.00, '[{"parameter":"Glucose Fasting","min":70,"max":100,"unit":"mg/dL"}]', 'mg/dL', 'sugar_template'),
('DENGUE_IGM', 'Dengue Antibody, IgM ( Elisa Method) - Dengue IgM Elisa', 'Pathology', 800.00, '[{"parameter":"Sample Type","min":"","max":"","unit":""},{"parameter":"Result","min":"","max":"","unit":""},{"parameter":"Method","min":"","max":"","unit":""}]', 'Profile', 'dengue_template'),
('HOMA_IR', 'HOMA IR : INSULIN RESISTANCE INDEX', 'Pathology', 1200.00, '[{"parameter":"Glucose Fasting","min":70,"max":100,"unit":"mg/dL"},{"parameter":"Insulin Fasting","min":2.6,"max":24.9,"unit":"uIU/mL"},{"parameter":"HOMA-IR","min":0.5,"max":1.9,"unit":"Ratio"}]', 'Profile', 'homair_template'),
('PUS_CS', 'PUS CULTURE AND SENSITIVITY', 'Pathology', 500.00, '[{"parameter":"Sample Type","min":"","max":"","unit":""},{"parameter":"Growth","min":"","max":"","unit":""},{"parameter":"Organism Isolated","min":"","max":"","unit":""}]', 'Profile', 'pus_cs_template'),
('URINE_PP', 'URINE PP ( BLOOD GLUCOSE LEVEL )', 'Pathology', 60.00, '[{"parameter":"Urine Glucose Post Prandial","min":"","max":"","unit":""}]', 'mg/dL', 'urine_pp_template'),
('17_OHP', '17-HYDROXYPROGESTERONE', 'Pathology', 1000.00, '[{"parameter":"17-Hydroxyprogesterone","min":0.5,"max":2.5,"unit":"ng/mL"}]', 'ng/mL', 'ohp_template'),
('17_OHP_ALT', '17-HYDROXYPROGESTERONE (17-OHP)', 'Pathology', 1000.00, '[{"parameter":"17-Hydroxyprogesterone (17-OHP)","min":0.5,"max":2.5,"unit":"ng/mL"}]', 'ng/mL', 'ohp_alt_template'),
('17_OH_PROG', '17-OH-PROGESTERON - 17-OH-PROGESTERON', 'Pathology', 1500.00, '[{"parameter":"17-OH-Progesterone","min":0.5,"max":2.5,"unit":"ng/mL"}]', 'ng/mL', 'ohp_prog_template'),
('24H_ALB', '24 HRS URINARY ALBUMIN - 24 HRS URINARY ALBUMIN', 'Pathology', 600.00, '[{"parameter":"Urinary Albumin","min":0,"max":30,"unit":"mg/24 hrs"}]', 'mg/24 hrs', '24h_alb_template'),
('24H_CALCIUM', '24 HRS URINARY CALCIUM', 'Pathology', 200.00, '[{"parameter":"Urinary Calcium","min":100,"max":300,"unit":"mg/24 hrs"}]', 'mg/24 hrs', '24h_calcium_template'),
('24H_PHOSPHORUS', '24 HRS URINARY PHOSPHORUS', 'Pathology', 300.00, '[{"parameter":"Urinary Phosphorus","min":0.4,"max":1.3,"unit":"g/24 hrs"}]', 'g/24 hrs', 'phosphorus_template'),
('24H_PROTEIN', '24 HRS URINARY PROTEIN', 'Pathology', 250.00, '[{"parameter":"Urinary Protein","min":0,"max":150,"unit":"mg/24 hrs"}]', 'mg/24 hrs', 'protein_template'),
('24H_URIC_ACID', '24 HRS URINARY URIC ACID', 'Pathology', 300.00, '[{"parameter":"Urinary Uric Acid","min":250,"max":750,"unit":"mg/24 hrs"}]', 'mg/24 hrs', 'uric_acid_template'),
('24H_VMA', '24 HRS. URINARY VMA', 'Pathology', 3550.00, '[{"parameter":"Vanillylmandelic Acid (VMA)","min":1.0,"max":8.0,"unit":"mg/24 hrs"}]', 'mg/24 hrs', 'vma_template'),
('24H_METANEPHRINE', '24 Hrs. Urine Metanephrine', 'Pathology', 2900.00, '[{"parameter":"Urine Metanephrine","min":74,"max":297,"unit":"mcg/24 hrs"}]', 'mcg/24 hrs', 'metanephrine_template'),
('VITAMIN_D', '25 (OH) VITAMIN-D, SERUM', 'Pathology', 100.00, '[{"parameter":"25-Hydroxy Vitamin D","min":30.0,"max":100.0,"unit":"ng/mL"}]', 'ng/mL', 'vitd_template'),
('AP_RESECTION', 'Abdominoperineal resection', 'Pathology', 5000.00, '[{"parameter":"Specimen","min":"","max":"","unit":""},{"parameter":"Gross Examination","min":"","max":"","unit":""},{"parameter":"Microscopic Examination","min":"","max":"","unit":""},{"parameter":"Diagnosis","min":"","max":"","unit":""}]', 'Profile', 'ap_resection_template'),
('AEC', 'ABSOLUTE EOSINOPHIL COUNT ( AEC ) - AEC', 'Pathology', 250.00, '[{"parameter":"Absolute Eosinophil Count","min":40,"max":440,"unit":"/cumm"}]', '/cumm', 'aec_template'),
('ACH_RECEPTOR_AB', 'ACETYLCHOLINE RECEPTOR AUTOANTIBODY', 'Pathology', 3500.00, '[{"parameter":"AChR Binding Antibody","min":0.0,"max":0.4,"unit":"nmol/L"}]', 'nmol/L', 'achr_ab_template'),
('ACID_PHOSPHATASE', 'ACID PHOSPHATASE TOTAL', 'Pathology', 2000.00, '[{"parameter":"Acid Phosphatase Total","min":0.0,"max":6.5,"unit":"U/L"}]', 'U/L', 'acp_template'),
('ADA_MTB', 'ADENOSINE DEAMINASE ACTIVITY - MTB ( ADA - MTB )', 'Pathology', 3000.00, '[{"parameter":"ADA Activity","min":0,"max":40,"unit":"U/L"}]', 'U/L', 'ada_mtb_template'),
('CAPD_ADEQUACY', 'Adequacy test for CAPD fluid', 'Pathology', 3000.00, '[{"parameter":"CAPD Fluid Volume","min":"","max":"","unit":""},{"parameter":"Creatinine Clearance","min":"","max":"","unit":""},{"parameter":"Urea Clearance (Kt/V)","min":1.7,"max":10.0,"unit":"Ratio"}]', 'Profile', 'capd_template'),
('ACTH', 'ADRENOCORTICOTROPIC HORMONE ( ACTH ) - ACTH', 'Pathology', 2500.00, '[{"parameter":"ACTH (Morning)","min":7.2,"max":63.3,"unit":"pg/mL"}]', 'pg/mL', 'acth_template'),
('AFB_STAIN', 'AFB Staining', 'Pathology', 300.00, '[{"parameter":"AFB Smear Result","min":"","max":"","unit":""}]', 'Qualitative', 'afb_smear_template'),
('AFB_CULTURE', 'AFB/TB Culture - Fluorescent method (Rapid -MGIT) - AFB/TB Culture', 'Pathology', 1500.00, '[{"parameter":"Specimen Type","min":"","max":"","unit":""},{"parameter":"Growth Result","min":"","max":"","unit":""}]', 'Profile', 'afb_culture_template'),
('ALBERTS_STAIN', 'ALBERTS STAIN REPORT', 'Pathology', 1150.00, '[{"parameter":"Corynebacterium diphtheriae","min":"","max":"","unit":""}]', 'Qualitative', 'alberts_template'),
('ALBUMIN', 'Albumin - Albumin', 'Pathology', 200.00, '[{"parameter":"Serum Albumin","min":3.5,"max":5.2,"unit":"g/dL"}]', 'g/dL', 'albumin_template'),
('AG_RATIO', 'Albumin/Globulin Ratio - A/G Ration', 'Pathology', 300.00, '[{"parameter":"Serum Albumin","min":3.5,"max":5.2,"unit":"g/dL"},{"parameter":"Serum Globulin","min":2.0,"max":3.5,"unit":"g/dL"},{"parameter":"A/G Ratio","min":1.1,"max":2.2,"unit":"Ratio"}]', 'Profile', 'ag_ratio_template'),
('ALDOLASE', 'ALDOLASE ENZYMATIC', 'Pathology', 1100.00, '[{"parameter":"Serum Aldolase","min":1.5,"max":8.1,"unit":"U/L"}]', 'U/L', 'aldolase_template'),
('ALDOSTERONE', 'ALDOSTERONE', 'Pathology', 1950.00, '[{"parameter":"Aldosterone (Upright)","min":4.0,"max":31.0,"unit":"ng/dL"},{"parameter":"Aldosterone (Supine)","min":1.0,"max":16.0,"unit":"ng/dL"}]', 'ng/dL', 'aldosterone_template'),
('ARR_RATIO', 'ALDOSTERONE/DIRECT RENIN RATIO', 'Pathology', 6000.00, '[{"parameter":"Aldosterone","min":1.0,"max":16.0,"unit":"ng/dL"},{"parameter":"Direct Renin","min":4.4,"max":46.1,"unit":"uIU/mL"},{"parameter":"ARR Ratio","min":0.0,"max":20.0,"unit":"Ratio"}]', 'Profile', 'arr_template'),
('ALP_INF', 'ALKALINE PHOSPHATASE INF', 'Pathology', 200.00, '[{"parameter":"Alkaline Phosphatase (Infant)","min":110,"max":350,"unit":"U/L"}]', 'U/L', 'alp_inf_template'),
('ALLERGY_CONTACT', 'allergy panel CONTACT', 'Pathology', 2500.00, '[{"parameter":"Contact Allergens Screen","min":"","max":"","unit":""}]', 'Qualitative', 'allergy_contact_template'),
('ALLERGY_DRUGS', 'allergy panel DRUGS', 'Pathology', 2750.00, '[{"parameter":"Drug Allergens Screen","min":"","max":"","unit":""}]', 'Qualitative', 'allergy_drugs_template'),
('ALLERGY_FOOD_NONVEG', 'allergy panel food nonveg', 'Pathology', 2000.00, '[{"parameter":"Food Allergens (Non-Veg)","min":"","max":"","unit":""}]', 'Qualitative', 'allergy_food_nonveg_template'),
('ALLERGY_FOOD_VEG', 'allergy panel food VEG', 'Pathology', 3000.00, '[{"parameter":"Food Allergens (Veg)","min":"","max":"","unit":""}]', 'Qualitative', 'allergy_food_veg_template'),
('ALLERGY_INHALANTS', 'Allergy Panel INHALANTS', 'Pathology', 3000.00, '[{"parameter":"Inhalant Allergens Screen","min":"","max":"","unit":""}]', 'Qualitative', 'allergy_inhalants_template'),
('ALLERGY_PROFILE_5', 'Allergy Profile - 5', 'Pathology', 500.00, '[{"parameter":"Total IgE","min":0,"max":100,"unit":"kU/L"}]', 'kU/L', 'allergy_profile_5_template'),
('AFP', 'ALPHA FETOPROTEIN ( AFP )', 'Pathology', 650.00, '[{"parameter":"Alpha Fetoprotein (AFP)","min":0.0,"max":8.5,"unit":"ng/mL"}]', 'ng/mL', 'afp_template'),
('AMMONIA', 'AMMONIA', 'Pathology', 4000.00, '[{"parameter":"Plasma Ammonia","min":15,"max":45,"unit":"umol/L"}]', 'umol/L', 'ammonia_template'),
('AMYLASE', 'AMYLASE', 'Pathology', 600.00, '[{"parameter":"Serum Amylase","min":28,"max":100,"unit":"U/L"}]', 'U/L', 'amylase_template'),
('AMYLASE_FLUID', 'AMYLASE FLUID', 'Pathology', 4000.00, '[{"parameter":"Fluid Amylase","min":0,"max":50,"unit":"U/L"}]', 'U/L', 'amylase_fluid_template'),
('ANA_BLOT', 'ANA BLOT', 'Pathology', 3300.00, '[{"parameter":"ANA Blot Profile","min":"","max":"","unit":""}]', 'Qualitative', 'ana_blot_template'),
('ANA_IFA', 'ANA BY IFA - ANA IFA', 'Pathology', 1100.00, '[{"parameter":"ANA IFA Screen","min":"","max":"","unit":""}]', 'Qualitative', 'ana_ifa_template'),
('ANA_IFA_TITRE', 'ANA BY IFA WITH TITRE - ANA IFA', 'Pathology', 1200.00, '[{"parameter":"ANA IFA Titre","min":"","max":"","unit":""},{"parameter":"Pattern","min":"","max":"","unit":""}]', 'Profile', 'ana_ifa_titre_template'),
('CANCA', 'ANCA (ANTI NEUTROPHIL CYTOPLASMIC ANTIBODIES) C - C ANCA', 'Pathology', 1500.00, '[{"parameter":"C-ANCA Result","min":"","max":"","unit":""}]', 'Qualitative', 'canca_template'),
('ANCA_CP', 'ANCA (ANTI NEUTROPHIL CYTOPLASMIC ANTIBODIES) P & C - ANCA C & P', 'Pathology', 2800.00, '[{"parameter":"C-ANCA Result","min":"","max":"","unit":""},{"parameter":"P-ANCA Result","min":"","max":"","unit":""}]', 'Profile', 'anca_cp_template'),
('ANDROSTENEDIONE', 'ANDROSTEINDIONE LEVEL', 'Pathology', 2000.00, '[{"parameter":"Androstenedione","min":0.3,"max":3.3,"unit":"ng/mL"}]', 'ng/mL', 'androstenedione_template'),
('ACE', 'ANGIOTENSIN CONVERTING ENZYME (ACE) - ACE', 'Pathology', 1400.00, '[{"parameter":"Angiotensin Converting Enzyme (ACE)","min":8,"max":52,"unit":"U/L"}]', 'U/L', 'ace_template'),
('ANT_RESECTION', 'Anterior resection', 'Pathology', 400.00, '[{"parameter":"Specimen","min":"","max":"","unit":""},{"parameter":"Gross Description","min":"","max":"","unit":""},{"parameter":"Microscopic Findings","min":"","max":"","unit":""},{"parameter":"Diagnosis","min":"","max":"","unit":""}]', 'Profile', 'ant_resection_template');


-- Seed Sample Doctor
INSERT INTO doctors (name, phone, email, specialization, commission_percentage) VALUES
('Dr. Ramesh Kumar', '9848022338', 'ramesh@gmail.com', 'General Physician', 15.00),
('Dr. Anita Rao', '9848055667', 'anita@gmail.com', 'Cardiologist', 20.00);

-- Signatures Table
CREATE TABLE signatures (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  designation VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  signature_path VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
