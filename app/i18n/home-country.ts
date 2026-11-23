const copy: Record<string, [string,string,string]> = {
  en: ['Home country','Sets prices for new purchases and the default source country for searches.','Save home country'],
  af: ['Tuisland','Bepaal pryse vir nuwe aankope en die verstekbronland vir soektogte.','Stoor tuisland'],
  ar: ['بلد الإقامة','يحدد أسعار المشتريات الجديدة وبلد المنشأ الافتراضي لعمليات البحث.','حفظ بلد الإقامة'],
  cs: ['Domovská země','Určuje ceny nových nákupů a výchozí zemi původu při vyhledávání.','Uložit domovskou zemi'],
  da: ['Hjemland','Bestemmer priser for nye køb og standardoprindelseslandet ved søgninger.','Gem hjemland'],
  de: ['Heimatland','Bestimmt die Preise für neue Käufe und das Standardherkunftsland bei Suchen.','Heimatland speichern'],
  el: ['Χώρα κατοικίας','Ορίζει τις τιμές νέων αγορών και την προεπιλεγμένη χώρα προέλευσης στις αναζητήσεις.','Αποθήκευση χώρας'],
  es: ['País de residencia','Determina los precios de nuevas compras y el país de origen predeterminado de las búsquedas.','Guardar país'],
  fi: ['Kotimaa','Määrittää uusien ostosten hinnat ja hakujen oletuslähtömaan.','Tallenna kotimaa'],
  fr: ['Pays de résidence','Détermine les prix des nouveaux achats et le pays d’origine par défaut des recherches.','Enregistrer le pays'],
  he: ['ארץ מגורים','קובעת מחירים לרכישות חדשות ואת ארץ המקור המוגדרת מראש לחיפושים.','שמירת ארץ מגורים'],
  hi: ['निवास देश','नई खरीदारी की कीमतें और खोज के लिए डिफ़ॉल्ट मूल देश तय करता है।','निवास देश सहेजें'],
  hu: ['Lakóhely szerinti ország','Meghatározza az új vásárlások árait és a keresések alapértelmezett származási országát.','Ország mentése'],
  it: ['Paese di residenza','Determina i prezzi dei nuovi acquisti e il paese di origine predefinito nelle ricerche.','Salva paese'],
  ja: ['居住国','新規購入の価格と検索時の既定の原産国を設定します。','居住国を保存'],
  ko: ['거주 국가','새 구매 가격과 검색의 기본 원산지 국가를 설정합니다.','거주 국가 저장'],
  nl: ['Thuisland','Bepaalt prijzen voor nieuwe aankopen en het standaardland van herkomst bij zoekopdrachten.','Thuisland opslaan'],
  no: ['Hjemland','Bestemmer priser for nye kjøp og standard opprinnelsesland ved søk.','Lagre hjemland'],
  pl: ['Kraj zamieszkania','Określa ceny nowych zakupów i domyślny kraj pochodzenia przy wyszukiwaniu.','Zapisz kraj'],
  pt: ['País de residência','Define os preços de novas compras e o país de origem predefinido nas pesquisas.','Guardar país'],
  ro: ['Țara de reședință','Stabilește prețurile pentru achiziții noi și țara de origine implicită pentru căutări.','Salvează țara'],
  ru: ['Страна проживания','Определяет цены новых покупок и страну происхождения по умолчанию для поиска.','Сохранить страну'],
  sv: ['Hemland','Bestämmer priser för nya köp och standardursprungsland vid sökningar.','Spara hemland'],
  tr: ['Yaşadığınız ülke','Yeni satın alma fiyatlarını ve aramalar için varsayılan kaynak ülkeyi belirler.','Ülkeyi kaydet'],
  zh: ['居住国家','设置新购买的价格和搜索时默认的药品来源国家。','保存国家'],
};
export function homeCountryCopy(lang: string) {
  const [label,hint,save] = copy[lang] || copy.en;
  return {label,hint,save};
}
