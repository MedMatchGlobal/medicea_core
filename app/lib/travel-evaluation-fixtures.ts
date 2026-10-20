// Public examples only. These checks measure discovery, not clinical equivalence.
export const TRAVEL_EVALUATION_CASES=[
 {id:'it30-gb',label:'Co-Efferalgan 500 + 30, Italy → UK',input:{drugName:'Co Efferalgan',drugDosage:'500 + 30',originCountry:'Italy',targetCountry:'United Kingdom'},form:'film-coated',anchor:'Zapain / Co-Codamol 30/500',source:'https://www.medicines.org.uk/emc/product/100530/smpc',note:'Known UK entry to look for, not an exhaustive reference set or substitution recommendation.'},
 {id:'uk8-it',label:'Co-codamol 8/500 tablets, UK → Italy',input:{drugName:'Co-codamol 8/500 tablets',drugDosage:'8 + 500',originCountry:'United Kingdom',targetCountry:'Italy'},form:'tablet',anchor:'Co-Efferalgan 500/30 must not match 500/8',source:'https://www.medicines.org.uk/emc/product/5958/smpc',note:'Negative strength control. A larger list is not a better result if strengths differ.'},
] as const;
export type TravelEvaluationCaseId=typeof TRAVEL_EVALUATION_CASES[number]['id'];
export type TravelEvaluationArm='production'|'experimental';
