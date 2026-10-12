const titles: Record<string, [string, string]> = {
  en: ['Find veterinary care', 'Find vets and veterinary clinics together by town, postcode or address.'],
  af: ['Vind veeartsenykundige sorg', 'Vind veeartse en veeartsenyklinieke saam volgens dorp, poskode of adres.'],
  ar: ['ابحث عن رعاية بيطرية', 'ابحث عن الأطباء والعيادات البيطرية معًا حسب المدينة أو الرمز البريدي أو العنوان.'],
  cs: ['Najít veterinární péči', 'Hledejte veterináře a veterinární kliniky společně podle města, PSČ nebo adresy.'],
  da: ['Find dyrlægehjælp', 'Find dyrlæger og dyreklinikker samlet efter by, postnummer eller adresse.'],
  de: ['Tierärztliche Versorgung finden', 'Finden Sie Tierärzte und Tierkliniken gemeinsam nach Ort, Postleitzahl oder Adresse.'],
  el: ['Βρείτε κτηνιατρική φροντίδα', 'Βρείτε κτηνιάτρους και κτηνιατρικές κλινικές μαζί με πόλη, ταχυδρομικό κώδικα ή διεύθυνση.'],
  es: ['Encontrar atención veterinaria', 'Busque veterinarios y clínicas veterinarias juntos por ciudad, código postal o dirección.'],
  fi: ['Etsi eläinlääkäripalveluja', 'Etsi eläinlääkäreitä ja eläinklinikoita yhdessä kaupungin, postinumeron tai osoitteen avulla.'],
  fr: ['Trouver des soins vétérinaires', 'Recherchez vétérinaires et cliniques vétérinaires ensemble par ville, code postal ou adresse.'],
  he: ['מציאת טיפול וטרינרי', 'חפשו וטרינרים ומרפאות וטרינריות יחד לפי עיר, מיקוד או כתובת.'],
  hi: ['पशु चिकित्सा सेवा खोजें', 'शहर, पोस्टकोड या पते से पशु चिकित्सकों और पशु चिकित्सा क्लिनिकों को एक साथ खोजें।'],
  hu: ['Állatorvosi ellátás keresése', 'Keressen állatorvosokat és állatorvosi rendelőket együtt település, irányítószám vagy cím alapján.'],
  it: ['Trova assistenza veterinaria', 'Cerca veterinari e cliniche veterinarie insieme per città, codice postale o indirizzo.'],
  ja: ['獣医療を探す', '市区町村、郵便番号、住所から獣医師と動物病院をまとめて検索します。'],
  ko: ['동물 진료 찾기', '도시, 우편번호 또는 주소로 수의사와 동물병원을 함께 검색하세요.'],
  nl: ['Vind diergeneeskundige zorg', 'Zoek dierenartsen en dierenklinieken samen op plaats, postcode of adres.'],
  no: ['Finn veterinærhjelp', 'Finn veterinærer og dyreklinikker samlet etter sted, postnummer eller adresse.'],
  pl: ['Znajdź opiekę weterynaryjną', 'Szukaj weterynarzy i klinik weterynaryjnych razem według miasta, kodu pocztowego lub adresu.'],
  pt: ['Encontrar cuidados veterinários', 'Procure veterinários e clínicas veterinárias juntos por cidade, código postal ou endereço.'],
  ro: ['Găsește îngrijire veterinară', 'Caută veterinari și clinici veterinare împreună după localitate, cod poștal sau adresă.'],
  ru: ['Найти ветеринарную помощь', 'Ищите ветеринаров и ветеринарные клиники вместе по городу, почтовому индексу или адресу.'],
  sv: ['Hitta veterinärvård', 'Sök veterinärer och djurkliniker tillsammans efter ort, postnummer eller adress.'],
  tr: ['Veteriner bakımı bul', 'Şehir, posta kodu veya adres ile veterinerleri ve veteriner kliniklerini birlikte arayın.'],
  zh: ['查找兽医服务', '按城镇、邮政编码或地址一起查找兽医和兽医诊所。'],
};
export function veterinaryCareCopy(lang: string) {
  const [title, description] = titles[lang] || titles.en;
  return {title, description};
}
