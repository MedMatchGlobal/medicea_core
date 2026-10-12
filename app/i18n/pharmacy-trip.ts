const labels: Record<string, [string,string]> = {
  en:['Medicines you’re looking for','Back to medicine results'],af:['Medisyne waarna jy soek','Terug na medisyneresultate'],
  ar:['الأدوية التي تبحث عنها','العودة إلى نتائج الأدوية'],cs:['Léky, které hledáte','Zpět na výsledky léků'],
  da:['Lægemidler, du søger','Tilbage til lægemiddelresultater'],de:['Gesuchte Medikamente','Zurück zu den Arzneimittelergebnissen'],
  el:['Φάρμακα που αναζητάτε','Επιστροφή στα αποτελέσματα φαρμάκων'],es:['Medicamentos que busca','Volver a los resultados de medicamentos'],
  fi:['Etsimäsi lääkkeet','Takaisin lääketuloksiin'],fr:['Médicaments recherchés','Retour aux résultats des médicaments'],
  he:['התרופות שאתם מחפשים','חזרה לתוצאות התרופות'],hi:['आप जिन दवाओं को खोज रहे हैं','दवा के परिणामों पर वापस जाएँ'],
  hu:['Keresett gyógyszerek','Vissza a gyógyszertalálatokhoz'],it:['Farmaci che stai cercando','Torna ai risultati dei farmaci'],
  ja:['お探しの医薬品','医薬品の検索結果に戻る'],ko:['찾고 있는 의약품','의약품 검색 결과로 돌아가기'],
  nl:['Geneesmiddelen die u zoekt','Terug naar geneesmiddelresultaten'],no:['Legemidler du leter etter','Tilbake til legemiddelresultatene'],
  pl:['Leki, których szukasz','Wróć do wyników leków'],pt:['Medicamentos que procura','Voltar aos resultados dos medicamentos'],
  ro:['Medicamentele pe care le cauți','Înapoi la rezultatele medicamentelor'],ru:['Лекарства, которые вы ищете','Вернуться к результатам поиска лекарств'],
  sv:['Läkemedel du söker','Tillbaka till läkemedelsresultaten'],tr:['Aradığınız ilaçlar','İlaç sonuçlarına dön'],zh:['您正在寻找的药品','返回药品搜索结果'],
};
export function pharmacyTripCopy(lang: string) {
  const [reminder, back] = labels[lang] || labels.en;
  return {reminder, back};
}
