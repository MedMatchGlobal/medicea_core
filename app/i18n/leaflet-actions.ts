const labels: Record<string, [string, string, string]> = {
  en:['View medicéa leaflet','Hide medicéa leaflet','Find official leaflet'],
  af:['Bekyk medicéa-pamflet','Versteek medicéa-pamflet','Vind amptelike pamflet'],
  ar:['عرض نشرة medicéa','إخفاء نشرة medicéa','البحث عن النشرة الرسمية'],
  cs:['Zobrazit leták medicéa','Skrýt leták medicéa','Najít oficiální příbalový leták'],
  da:['Vis medicéa-indlægsseddel','Skjul medicéa-indlægsseddel','Find officiel indlægsseddel'],
  de:['medicéa-Beipackzettel anzeigen','medicéa-Beipackzettel ausblenden','Offizielle Packungsbeilage suchen'],
  el:['Προβολή φύλλου medicéa','Απόκρυψη φύλλου medicéa','Βρείτε επίσημο φύλλο οδηγιών'],
  es:['Ver prospecto medicéa','Ocultar prospecto medicéa','Buscar prospecto oficial'],
  fi:['Näytä medicéa-seloste','Piilota medicéa-seloste','Etsi virallinen pakkausseloste'],
  fr:['Voir la notice medicéa','Masquer la notice medicéa','Trouver la notice officielle'],
  he:['הצגת עלון medicéa','הסתרת עלון medicéa','מציאת העלון הרשמי'],
  hi:['medicéa पत्रक देखें','medicéa पत्रक छिपाएँ','आधिकारिक पत्रक खोजें'],
  hu:['medicéa-tájékoztató megtekintése','medicéa-tájékoztató elrejtése','Hivatalos tájékoztató keresése'],
  it:['Visualizza foglietto medicéa','Nascondi foglietto medicéa','Trova il foglietto ufficiale'],
  ja:['medicéaの説明書を表示','medicéaの説明書を非表示','公式添付文書を探す'],
  ko:['medicéa 설명서 보기','medicéa 설명서 숨기기','공식 설명서 찾기'],
  nl:['medicéa-bijsluiter bekijken','medicéa-bijsluiter verbergen','Officiële bijsluiter zoeken'],
  no:['Vis medicéa-pakningsvedlegg','Skjul medicéa-pakningsvedlegg','Finn offisielt pakningsvedlegg'],
  pl:['Pokaż ulotkę medicéa','Ukryj ulotkę medicéa','Znajdź oficjalną ulotkę'],
  pt:['Ver folheto medicéa','Ocultar folheto medicéa','Encontrar folheto oficial'],
  ro:['Vezi prospectul medicéa','Ascunde prospectul medicéa','Găsește prospectul oficial'],
  ru:['Показать инструкцию medicéa','Скрыть инструкцию medicéa','Найти официальную инструкцию'],
  sv:['Visa medicéa-bipacksedel','Dölj medicéa-bipacksedel','Hitta officiell bipacksedel'],
  tr:['medicéa prospektüsünü göster','medicéa prospektüsünü gizle','Resmî prospektüsü bul'],
  zh:['查看medicéa说明书','隐藏medicéa说明书','查找官方说明书'],
};
export function leafletActions(lang: string) {
  const [view, hide, official] = labels[lang] || labels.en;
  return {view, hide, official};
}
