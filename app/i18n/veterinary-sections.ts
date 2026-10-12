const labels: Record<string, [string, string, string]> = {
  en:['Not specified','Formulation','Animal species'],af:['Nie gespesifiseer nie','Formulering','Dierspesies'],
  ar:['غير محدد','الشكل الدوائي','أنواع الحيوانات'],cs:['Neuvedeno','Léková forma','Druhy zvířat'],
  da:['Ikke angivet','Lægemiddelform','Dyrearter'],de:['Nicht angegeben','Darreichungsform','Tierarten'],
  el:['Δεν προσδιορίζεται','Φαρμακοτεχνική μορφή','Είδη ζώων'],es:['No especificado','Forma farmacéutica','Especies animales'],
  fi:['Ei ilmoitettu','Lääkemuoto','Eläinlajit'],fr:['Non précisé','Forme pharmaceutique','Espèces animales'],
  he:['לא צוין','צורת התרופה','מיני בעלי חיים'],hi:['निर्दिष्ट नहीं','दवा का रूप','पशु प्रजातियाँ'],
  hu:['Nincs megadva','Gyógyszerforma','Állatfajok'],it:['Non specificato','Forma farmaceutica','Specie animali'],
  ja:['記載なし','剤形','動物種'],ko:['명시되지 않음','제형','동물 종'],
  nl:['Niet vermeld','Toedieningsvorm','Diersoorten'],no:['Ikke angitt','Legemiddelform','Dyrearter'],
  pl:['Nie określono','Postać leku','Gatunki zwierząt'],pt:['Não especificado','Forma farmacêutica','Espécies animais'],
  ro:['Nespecificat','Formă farmaceutică','Specii de animale'],ru:['Не указано','Лекарственная форма','Виды животных'],
  sv:['Ej angivet','Läkemedelsform','Djurarter'],tr:['Belirtilmemiş','Farmasötik şekil','Hayvan türleri'],zh:['未说明','剂型','动物种类'],
};
export function veterinarySectionLabels(lang: string) {
  const [unknown, formulation, species] = labels[lang] || labels.en;
  return {unknown, formulation, species};
}
