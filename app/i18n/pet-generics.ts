const labels: Record<string, string> = {
  en:'Pet medicine generics', af:'Generiese troeteldiermedisyne', ar:'الأدوية البيطرية الجنيسة',
  cs:'Generické léky pro zvířata', da:'Generiske lægemidler til kæledyr', de:'Generische Tiermedikamente',
  el:'Γενόσημα φάρμακα κατοικιδίων', es:'Medicamentos genéricos para mascotas', fi:'Lemmikkien rinnakkaislääkkeet',
  fr:'Médicaments génériques pour animaux', he:'תרופות גנריות לחיות מחמד', hi:'पालतू पशुओं की जेनेरिक दवाएँ',
  hu:'Generikus állatgyógyszerek', it:'Farmaci generici per animali', ja:'ペット用ジェネリック医薬品',
  ko:'반려동물 제네릭 의약품', nl:'Generieke diergeneesmiddelen', no:'Generiske legemidler til kjæledyr',
  pl:'Generyczne leki dla zwierząt', pt:'Medicamentos genéricos para animais', ro:'Medicamente generice pentru animale',
  ru:'Дженерики для домашних животных', sv:'Generiska läkemedel för husdjur', tr:'Evcil hayvanlar için jenerik ilaçlar', zh:'宠物仿制药',
};
export function petGenericsLabel(lang: string) { return labels[lang] || labels.en; }
