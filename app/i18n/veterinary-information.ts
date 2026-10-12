const copy: Record<string, [string, string, string, string]> = {
  en:['View medicine information','Hide medicine information','AI-generated veterinary information, not an official leaflet. Verify the exact product and animal species with a veterinarian.','Find official leaflet'],
  af:['Bekyk medisyne-inligting','Versteek medisyne-inligting','KI-gegenereerde veeartsenykundige inligting, nie ’n amptelike pamflet nie. Bevestig die presiese produk en diersoort met ’n veearts.','Vind amptelike pamflet'],
  ar:['عرض معلومات الدواء','إخفاء معلومات الدواء','معلومات بيطرية مولدة بالذكاء الاصطناعي وليست نشرة رسمية. تحقق من المنتج ونوع الحيوان مع طبيب بيطري.','البحث عن النشرة الرسمية'],
  cs:['Zobrazit informace o léku','Skrýt informace o léku','Veterinární informace vytvořené AI, nikoli oficiální příbalový leták. Přesný přípravek a druh zvířete ověřte s veterinářem.','Najít oficiální příbalový leták'],
  da:['Vis lægemiddelinformation','Skjul lægemiddelinformation','AI-genereret veterinærinformation, ikke en officiel indlægsseddel. Kontrollér præparat og dyreart med en dyrlæge.','Find officiel indlægsseddel'],
  de:['Arzneimittelinformation anzeigen','Arzneimittelinformation ausblenden','KI-generierte tiermedizinische Informationen, keine offizielle Packungsbeilage. Präparat und Tierart mit einem Tierarzt prüfen.','Offizielle Packungsbeilage suchen'],
  el:['Προβολή πληροφοριών φαρμάκου','Απόκρυψη πληροφοριών φαρμάκου','Κτηνιατρικές πληροφορίες από AI, όχι επίσημο φύλλο οδηγιών. Επιβεβαιώστε το προϊόν και το είδος ζώου με κτηνίατρο.','Βρείτε επίσημο φύλλο οδηγιών'],
  es:['Ver información del medicamento','Ocultar información del medicamento','Información veterinaria generada por IA, no un prospecto oficial. Confirme el producto y la especie con un veterinario.','Buscar prospecto oficial'],
  fi:['Näytä lääketiedot','Piilota lääketiedot','Tekoälyn tuottamaa eläinlääketietoa, ei virallinen pakkausseloste. Varmista valmiste ja eläinlaji eläinlääkäriltä.','Etsi virallinen pakkausseloste'],
  fr:['Voir les informations du médicament','Masquer les informations du médicament','Informations vétérinaires générées par IA, pas une notice officielle. Vérifiez le produit et l’espèce avec un vétérinaire.','Trouver la notice officielle'],
  he:['הצגת מידע על התרופה','הסתרת מידע על התרופה','מידע וטרינרי שנוצר בבינה מלאכותית, לא עלון רשמי. ודאו את המוצר ומין בעל החיים עם וטרינר.','מציאת העלון הרשמי'],
  hi:['दवा की जानकारी देखें','दवा की जानकारी छिपाएँ','AI से बनी पशु चिकित्सा जानकारी, आधिकारिक पत्रक नहीं। उत्पाद और पशु की प्रजाति की पुष्टि पशु चिकित्सक से करें।','आधिकारिक पत्रक खोजें'],
  hu:['Gyógyszerinformáció megtekintése','Gyógyszerinformáció elrejtése','AI által készített állatgyógyászati információ, nem hivatalos betegtájékoztató. A készítményt és állatfajt állatorvossal ellenőrizze.','Hivatalos tájékoztató keresése'],
  it:['Visualizza informazioni sul farmaco','Nascondi informazioni sul farmaco','Informazioni veterinarie generate da IA, non un foglietto ufficiale. Verifica il prodotto e la specie animale con un veterinario.','Trova il foglietto ufficiale'],
  ja:['医薬品情報を表示','医薬品情報を非表示','AI生成の獣医薬情報であり、公式添付文書ではありません。製品と動物種を獣医師に確認してください。','公式添付文書を探す'],
  ko:['의약품 정보 보기','의약품 정보 숨기기','AI가 생성한 동물 의약품 정보이며 공식 설명서가 아닙니다. 정확한 제품과 동물 종을 수의사에게 확인하세요.','공식 설명서 찾기'],
  nl:['Geneesmiddelinformatie bekijken','Geneesmiddelinformatie verbergen','Door AI gegenereerde diergeneeskundige informatie, geen officiële bijsluiter. Controleer product en diersoort met een dierenarts.','Officiële bijsluiter zoeken'],
  no:['Vis legemiddelinformasjon','Skjul legemiddelinformasjon','KI-generert veterinærinformasjon, ikke et offisielt pakningsvedlegg. Bekreft preparat og dyreart med en veterinær.','Finn offisielt pakningsvedlegg'],
  pl:['Pokaż informacje o leku','Ukryj informacje o leku','Informacje weterynaryjne wygenerowane przez AI, nie oficjalna ulotka. Potwierdź produkt i gatunek zwierzęcia z weterynarzem.','Znajdź oficjalną ulotkę'],
  pt:['Ver informações do medicamento','Ocultar informações do medicamento','Informações veterinárias geradas por IA, não um folheto oficial. Confirme o produto e a espécie com um veterinário.','Encontrar folheto oficial'],
  ro:['Vezi informațiile medicamentului','Ascunde informațiile medicamentului','Informații veterinare generate de AI, nu un prospect oficial. Verifică produsul și specia cu un veterinar.','Găsește prospectul oficial'],
  ru:['Показать информацию о препарате','Скрыть информацию о препарате','Ветеринарная информация создана ИИ и не является официальной инструкцией. Уточните препарат и вид животного у ветеринара.','Найти официальную инструкцию'],
  sv:['Visa läkemedelsinformation','Dölj läkemedelsinformation','AI-genererad veterinärinformation, inte en officiell bipacksedel. Bekräfta preparat och djurart med en veterinär.','Hitta officiell bipacksedel'],
  tr:['İlaç bilgilerini göster','İlaç bilgilerini gizle','Yapay zekâ tarafından üretilen veteriner ilaç bilgisi, resmî prospektüs değildir. Ürünü ve hayvan türünü veterinerle doğrulayın.','Resmî prospektüsü bul'],
  zh:['查看药品信息','隐藏药品信息','AI生成的兽药信息，并非官方说明书。请与兽医核实具体产品和动物种类。','查找官方说明书'],
};
export function veterinaryInformationCopy(lang: string) {
  const [view, hide, notice, official] = copy[lang] || copy.en;
  return {view, hide, notice, official};
}
