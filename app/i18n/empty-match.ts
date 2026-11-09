const copy: Record<string, [string, string]> = {
  en: ['No exact match found', 'We couldn’t identify a medicine matching these active ingredients, strengths and formulation. A pharmacist can help check local options.'],
  af: ['Geen presiese ooreenkoms gevind nie', 'Ons kon nie ’n medisyne met hierdie aktiewe bestanddele, sterktes en formulering identifiseer nie. ’n Apteker kan help om plaaslike opsies na te gaan.'],
  ar: ['لم نعثر على تطابق تام', 'لم نتمكن من تحديد دواء يطابق هذه المواد الفعالة وتركيزاتها وشكله الصيدلاني. يمكن للصيدلي المساعدة في التحقق من الخيارات المحلية.'],
  cs: ['Přesná shoda nenalezena', 'Nepodařilo se nám určit lék se stejnými účinnými látkami, silami a lékovou formou. Lékárník může pomoci ověřit místní možnosti.'],
  da: ['Intet præcist match fundet', 'Vi kunne ikke identificere et lægemiddel med disse aktive stoffer, styrker og lægemiddelform. En farmaceut kan hjælpe med at undersøge lokale muligheder.'],
  de: ['Keine genaue Übereinstimmung gefunden', 'Wir konnten kein Arzneimittel mit diesen Wirkstoffen, Wirkstärken und dieser Darreichungsform ermitteln. Eine Apotheke kann helfen, örtliche Möglichkeiten zu prüfen.'],
  el: ['Δεν βρέθηκε ακριβής αντιστοιχία', 'Δεν μπορέσαμε να εντοπίσουμε φάρμακο με τις ίδιες δραστικές ουσίες, περιεκτικότητες και φαρμακοτεχνική μορφή. Ένας φαρμακοποιός μπορεί να βοηθήσει στον έλεγχο των τοπικών επιλογών.'],
  es: ['No se encontró una coincidencia exacta', 'No pudimos identificar un medicamento con estos principios activos, concentraciones y forma farmacéutica. Un farmacéutico puede ayudar a comprobar las opciones locales.'],
  fi: ['Täsmällistä vastaavuutta ei löytynyt', 'Emme pystyneet tunnistamaan lääkettä, jossa on samat vaikuttavat aineet, vahvuudet ja lääkemuoto. Apteekki voi auttaa tarkistamaan paikalliset vaihtoehdot.'],
  fr: ['Aucune correspondance exacte trouvée', 'Nous n’avons pas pu identifier de médicament présentant les mêmes substances actives, dosages et forme pharmaceutique. Un pharmacien peut vous aider à vérifier les options locales.'],
  he: ['לא נמצאה התאמה מדויקת', 'לא הצלחנו לזהות תרופה עם אותם חומרים פעילים, חוזקים וצורת מתן. רוקח יכול לעזור לבדוק אפשרויות מקומיות.'],
  hi: ['सटीक मेल नहीं मिला', 'हम इन सक्रिय तत्वों, शक्तियों और औषधि रूप से मेल खाने वाली दवा की पहचान नहीं कर सके। फार्मासिस्ट स्थानीय विकल्पों की जाँच में मदद कर सकता है।'],
  hu: ['Nem találtunk pontos egyezést', 'Nem sikerült azonosítanunk azonos hatóanyagú, hatáserősségű és gyógyszerformájú készítményt. Egy gyógyszerész segíthet ellenőrizni a helyi lehetőségeket.'],
  it: ['Nessuna corrispondenza esatta trovata', 'Non siamo riusciti a identificare un medicinale con gli stessi principi attivi, dosaggi e forma farmaceutica. Un farmacista può aiutarti a verificare le opzioni locali.'],
  ja: ['完全に一致する医薬品は見つかりませんでした', '有効成分、含有量、剤形が一致する医薬品を特定できませんでした。現地の選択肢については薬剤師に確認できます。'],
  ko: ['정확히 일치하는 의약품을 찾지 못했습니다', '유효 성분, 함량 및 제형이 일치하는 의약품을 확인하지 못했습니다. 약사가 현지 선택지를 확인하는 데 도움을 줄 수 있습니다.'],
  nl: ['Geen exacte overeenkomst gevonden', 'We konden geen geneesmiddel identificeren met dezelfde werkzame stoffen, sterktes en farmaceutische vorm. Een apotheker kan helpen de lokale mogelijkheden te controleren.'],
  no: ['Fant ingen nøyaktig match', 'Vi kunne ikke identifisere et legemiddel med de samme virkestoffene, styrkene og legemiddelformen. En farmasøyt kan hjelpe med å undersøke lokale alternativer.'],
  pl: ['Nie znaleziono dokładnego odpowiednika', 'Nie udało nam się zidentyfikować leku o tych samych substancjach czynnych, mocach i postaci farmaceutycznej. Farmaceuta może pomóc sprawdzić lokalne możliwości.'],
  pt: ['Não foi encontrada uma correspondência exata', 'Não conseguimos identificar um medicamento com as mesmas substâncias ativas, dosagens e forma farmacêutica. Um farmacêutico pode ajudar a verificar as opções locais.'],
  ro: ['Nu s-a găsit o potrivire exactă', 'Nu am putut identifica un medicament cu aceleași substanțe active, concentrații și formă farmaceutică. Un farmacist poate ajuta la verificarea opțiunilor locale.'],
  ru: ['Точного совпадения не найдено', 'Нам не удалось определить препарат с такими же действующими веществами, дозировками и лекарственной формой. Фармацевт может помочь проверить местные варианты.'],
  sv: ['Ingen exakt matchning hittades', 'Vi kunde inte identifiera ett läkemedel med samma verksamma ämnen, styrkor och läkemedelsform. En farmaceut kan hjälpa till att kontrollera lokala alternativ.'],
  tr: ['Tam eşleşme bulunamadı', 'Aynı etkin maddelere, miktarlara ve farmasötik forma sahip bir ilaç belirleyemedik. Bir eczacı yerel seçenekleri kontrol etmenize yardımcı olabilir.'],
  zh: ['未找到完全匹配的药品', '我们未能确定具有相同活性成分、含量和剂型的药品。药师可以帮助核实当地的选择。'],
};

export function emptyMatchCopy(lang: string) {
  const [title, body] = copy[lang] || copy.en;
  return { title, body };
}
