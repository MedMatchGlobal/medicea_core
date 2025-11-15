export const conditionGroups = [
  { id: "Cardiology", label: "Cardiology", items: ["hypertension", "hyperlipidemia", "heart_failure", "coronary_artery_disease", "atrial_fibrillation", "peripheral_artery_disease", "venous_thromboembolism"] },
  { id: "Endocrinology", label: "Endocrinology", items: ["type_2_diabetes", "prediabetes", "obesity", "hypothyroidism", "hyperthyroidism", "polycystic_ovary_syndrome"] },
  { id: "Respiratory", label: "Respiratory", items: ["asthma", "copd", "pneumonia", "acute_bronchitis", "influenza", "covid_19", "allergic_rhinitis", "sinusitis", "otitis_media"] },
  { id: "Gastroenterology", label: "Gastroenterology", items: ["irritable_bowel_syndrome", "constipation", "diarrhea", "gallstones", "hepatitis_b", "hepatitis_c"] },
  { id: "Neurology", label: "Neurology", items: ["migraine", "tension_headache", "epilepsy", "stroke", "insomnia"] },
  { id: "Psychiatry", label: "Psychiatry", items: ["depression", "anxiety_disorder", "bipolar_disorder", "adhd"] },
  { id: "Dermatology", label: "Dermatology", items: ["acne", "eczema", "psoriasis", "cellulitis", "urticaria"] },
  { id: "Infectious Disease", label: "Infectious Disease", items: ["strep_throat"] },
  { id: "Rheumatology", label: "Rheumatology", items: ["osteoarthritis", "rheumatoid_arthritis", "gout", "fibromyalgia"] },
  { id: "Urology", label: "Urology", items: ["erectile_dysfunction", "kidney_stones"] },
  { id: "Gynecology", label: "Gynecology", items: ["bacterial_vaginosis", "endometriosis", "pregnancy_nausea"] },
  { id: "Ophthalmology", label: "Ophthalmology", items: ["conjunctivitis", "glaucoma"] },
  { id: "ENT", label: "ENT", items: ["otitis_media", "sinusitis", "pharyngitis", "tonsillitis"] },
  { id: "Hematology", label: "Hematology", items: ["anemia", "iron_deficiency"] },
  { id: "Allergy/Immunology", label: "Allergy/Immunology", items: ["allergic_rhinitis"] },
  { id: "General / Other", label: "General / Other", items: ["otitis_externa", "parkinson_disease", "multiple_sclerosis", "dementia", "neuropathic_pain", "low_back_pain", "sciatica", "neck_pain", "shoulder_pain", "tendinitis", "sprain_strain", "osteoporosis", "tinea_corporis", "tinea_pedis", "onychomycosis", "impetigo", "rosacea", "scabies", "lice", "contact_dermatitis", "sunburn", "minor_burn", "gastroesophageal_reflux", "dyspepsia", "ulcerative_colitis", "crohn_disease", "peptic_ulcer", "nausea_vomiting", "hemorrhoids", "fatty_liver", "urinary_tract_infection", "pyelonephritis", "benign_prostatic_hyperplasia", "menstrual_pain", "vaginal_yeast_infection", "pelvic_inflammatory_disease", "urinary_incontinence", "herpes_labialis", "herpes_zoster", "mononucleosis", "tb_latent", "tb_active", "malaria_uncomplicated", "giardiasis", "traveler_diarrhea", "hiv_chronic", "dry_eye", "allergic_conjunctivitis", "blepharitis", "tinnitus", "hearing_loss", "vertigo_bppv", "sinus_congestion", "teething_pain", "diaper_rash", "croup", "whooping_cough", "hand_foot_mouth", "chickenpox", "scarlet_fever", "vitamin_d_deficiency", "b12_deficiency", "electrolyte_imbalance", "goiter", "toothache", "mouth_ulcer", "wound_care", "sprain_first_aid", "burns_first_aid", "insect_bite", "animal_bite", "dehydration_mild"] },
] as const;

export const CONDITION_GROUPS = conditionGroups;
export default conditionGroups;
