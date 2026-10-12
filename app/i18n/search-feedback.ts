const copy: Record<string, [string, string]> = {
  en: ['Google Maps listings may include hospitals or unrelated services. Check the provider, specialty and contact details before travelling.', 'Pet medicine information only. Confirm suitability with a veterinarian.'],
  af: ['Google Maps kan hospitale of onverwante dienste wys. Kontroleer die verskaffer, spesialiteit en kontakbesonderhede voor jy reis.', 'Slegs inligting oor troeteldiermedisyne. Bevestig geskiktheid met ’n veearts.'],
  ar: ['قد تتضمن نتائج خرائط Google مستشفيات أو خدمات غير ذات صلة. تحقق من مقدم الخدمة والتخصص وبيانات الاتصال قبل الذهاب.', 'معلومات عن أدوية الحيوانات الأليفة فقط. تحقق من ملاءمتها مع طبيب بيطري.'],
  cs: ['Výsledky Map Google mohou zahrnovat nemocnice či nesouvisející služby. Před cestou ověřte poskytovatele, odbornost a kontaktní údaje.', 'Pouze informace o lécích pro zvířata. Vhodnost ověřte u veterináře.'],
  da: ['Google Maps kan vise hospitaler eller uvedkommende tjenester. Kontrollér udbyder, speciale og kontaktoplysninger før afrejse.', 'Kun information om medicin til kæledyr. Bekræft egnethed med en dyrlæge.'],
  de: ['Google Maps kann Krankenhäuser oder unpassende Dienste anzeigen. Prüfen Sie Anbieter, Fachgebiet und Kontaktdaten vor der Anreise.', 'Nur Informationen zu Tiermedikamenten. Klären Sie die Eignung mit einem Tierarzt.'],
  el: ['Οι καταχωρίσεις του Google Maps μπορεί να περιλαμβάνουν νοσοκομεία ή άσχετες υπηρεσίες. Ελέγξτε τον πάροχο, την ειδικότητα και τα στοιχεία επικοινωνίας πριν μετακινηθείτε.', 'Μόνο πληροφορίες για φάρμακα κατοικιδίων. Επιβεβαιώστε την καταλληλότητα με κτηνίατρο.'],
  es: ['Google Maps puede mostrar hospitales o servicios no relacionados. Compruebe el proveedor, la especialidad y los datos de contacto antes de desplazarse.', 'Solo información sobre medicamentos para mascotas. Confirme su idoneidad con un veterinario.'],
  fi: ['Google Maps voi näyttää sairaaloita tai muita palveluita. Tarkista palveluntarjoaja, erikoisala ja yhteystiedot ennen matkaa.', 'Vain tietoa lemmikkien lääkkeistä. Varmista soveltuvuus eläinlääkäriltä.'],
  fr: ['Google Maps peut afficher des hôpitaux ou des services sans rapport. Vérifiez le prestataire, la spécialité et les coordonnées avant de vous déplacer.', 'Informations sur les médicaments pour animaux uniquement. Vérifiez leur adéquation avec un vétérinaire.'],
  he: ['תוצאות Google Maps עשויות לכלול בתי חולים או שירותים לא קשורים. בדקו את הספק, ההתמחות ופרטי הקשר לפני הנסיעה.', 'מידע על תרופות לחיות מחמד בלבד. בדקו התאמה עם וטרינר.'],
  hi: ['Google Maps में अस्पताल या असंबंधित सेवाएँ भी दिख सकती हैं। जाने से पहले प्रदाता, विशेषज्ञता और संपर्क विवरण जाँचें।', 'केवल पालतू पशुओं की दवाओं की जानकारी। उपयुक्तता की पुष्टि पशु चिकित्सक से करें।'],
  hu: ['A Google Maps kórházakat vagy nem kapcsolódó szolgáltatásokat is mutathat. Utazás előtt ellenőrizze a szolgáltatót, szakterületet és elérhetőséget.', 'Csak állatgyógyszerekkel kapcsolatos tájékoztatás. Az alkalmasságot állatorvossal egyeztesse.'],
  it: ['Google Maps può mostrare ospedali o servizi non pertinenti. Verifica il professionista, la specialità e i recapiti prima di spostarti.', 'Solo informazioni sui farmaci per animali. Verifica l’idoneità con un veterinario.'],
  ja: ['Google Mapsには病院や無関係なサービスが表示されることがあります。移動前に医療機関、専門分野、連絡先を確認してください。', 'ペットの薬に関する情報のみです。適合性は獣医師に確認してください。'],
  ko: ['Google Maps에 병원이나 관련 없는 서비스가 표시될 수 있습니다. 방문 전에 의료기관, 전문 분야 및 연락처를 확인하세요.', '반려동물 약 정보만 제공합니다. 적합성은 수의사에게 확인하세요.'],
  nl: ['Google Maps kan ziekenhuizen of niet-gerelateerde diensten tonen. Controleer aanbieder, specialisme en contactgegevens voordat u vertrekt.', 'Alleen informatie over diergeneesmiddelen. Bevestig geschiktheid met een dierenarts.'],
  no: ['Google Maps kan vise sykehus eller uvedkommende tjenester. Kontroller tilbyder, spesialitet og kontaktinformasjon før du reiser.', 'Kun informasjon om legemidler til kjæledyr. Avklar egnethet med veterinær.'],
  pl: ['Google Maps może pokazywać szpitale lub niepowiązane usługi. Przed podróżą sprawdź placówkę, specjalizację i dane kontaktowe.', 'Tylko informacje o lekach dla zwierząt. Potwierdź ich odpowiedniość z weterynarzem.'],
  pt: ['O Google Maps pode mostrar hospitais ou serviços não relacionados. Verifique o prestador, a especialidade e os contactos antes de se deslocar.', 'Apenas informação sobre medicamentos para animais. Confirme a adequação com um veterinário.'],
  ro: ['Google Maps poate afișa spitale sau servicii fără legătură. Verificați furnizorul, specialitatea și datele de contact înainte de deplasare.', 'Doar informații despre medicamente pentru animale. Confirmați adecvarea cu un veterinar.'],
  ru: ['Google Maps может показывать больницы или неподходящие услуги. Перед поездкой проверьте учреждение, специализацию и контакты.', 'Только информация о лекарствах для животных. Уточните пригодность у ветеринара.'],
  sv: ['Google Maps kan visa sjukhus eller orelaterade tjänster. Kontrollera vårdgivare, specialitet och kontaktuppgifter innan du reser.', 'Endast information om läkemedel för husdjur. Bekräfta lämplighet med en veterinär.'],
  tr: ['Google Maps hastaneleri veya ilgisiz hizmetleri gösterebilir. Gitmeden önce sağlayıcıyı, uzmanlığı ve iletişim bilgilerini doğrulayın.', 'Yalnızca evcil hayvan ilaçları hakkında bilgi. Uygunluğu veterinerle doğrulayın.'],
  zh: ['Google Maps可能显示医院或无关服务。出行前请核实机构、专科和联系方式。', '仅提供宠物药物信息。请向兽医确认是否适用。'],
};

export function searchFeedback(lang: string) {
  const [careNotice, petNotice] = copy[lang] || copy.en;
  return {careNotice, petNotice};
}

const urgent: Record<string, string> = {
  en: 'UK: call NHS 111 for urgent medical help; call 999 for a life-threatening emergency. Elsewhere, use your local urgent-care service or emergency number.',
  af: 'VK: bel NHS 111 vir dringende mediese hulp; bel 999 vir ’n lewensbedreigende noodgeval. Elders, gebruik jou plaaslike dringende sorgdiens of noodnommer.',
  ar: 'المملكة المتحدة: اتصل بـ NHS 111 للمساعدة الطبية العاجلة وبـ 999 للطوارئ المهددة للحياة. في غيرها، استخدم خدمة الرعاية العاجلة أو رقم الطوارئ المحلي.',
  cs: 'Ve Spojeném království volejte NHS 111 pro naléhavou pomoc a 999 při ohrožení života. Jinde využijte místní akutní péči nebo tísňovou linku.',
  da: 'Storbritannien: ring NHS 111 for akut lægehjælp og 999 ved livstruende nødsituationer. Andre steder bruges lokal akut hjælp eller alarmnummer.',
  de: 'UK: NHS 111 für dringende medizinische Hilfe, 999 bei Lebensgefahr. Anderswo nutzen Sie den örtlichen Bereitschaftsdienst oder die Notrufnummer.',
  el: 'Ηνωμένο Βασίλειο: καλέστε NHS 111 για επείγουσα ιατρική βοήθεια και 999 για απειλή για τη ζωή. Αλλού, χρησιμοποιήστε την τοπική υπηρεσία επείγουσας φροντίδας ή τον αριθμό έκτακτης ανάγκης.',
  es: 'Reino Unido: llame al NHS 111 para ayuda médica urgente y al 999 ante una emergencia vital. En otros países, use el servicio de atención urgente o número de emergencias local.',
  fi: 'Britanniassa soita NHS 111 kiireellistä apua varten ja 999 hengenvaarassa. Muualla käytä paikallista päivystystä tai hätänumeroa.',
  fr: 'Royaume-Uni : appelez NHS 111 pour une aide médicale urgente et le 999 en cas de danger vital. Ailleurs, utilisez le service de soins urgents ou le numéro d’urgence local.',
  he: 'בבריטניה: התקשרו ל־NHS 111 לעזרה רפואית דחופה ול־999 במקרה של סכנת חיים. במקומות אחרים השתמשו בשירות הטיפול הדחוף או במספר החירום המקומי.',
  hi: 'यूके: तत्काल चिकित्सा सहायता के लिए NHS 111 और जानलेवा आपात स्थिति में 999 पर कॉल करें। अन्य स्थानों पर स्थानीय तत्काल देखभाल सेवा या आपात नंबर का उपयोग करें।',
  hu: 'Egyesült Királyság: sürgős segítségért NHS 111, életveszélyben 999. Máshol a helyi sürgősségi ellátást vagy segélyhívót használja.',
  it: 'Regno Unito: chiama NHS 111 per assistenza medica urgente e 999 per emergenze con pericolo di vita. Altrove, usa il servizio di cure urgenti o il numero di emergenza locale.',
  ja: '英国では、緊急の医療相談はNHS 111、生命に関わる緊急事態は999に電話してください。他の国では現地の救急医療サービスや緊急番号をご利用ください。',
  ko: '영국: 긴급 의료 도움이 필요하면 NHS 111, 생명이 위급하면 999로 전화하세요. 다른 지역에서는 현지 긴급 진료 서비스나 긴급 전화번호를 이용하세요.',
  nl: 'VK: bel NHS 111 voor dringende medische hulp en 999 bij levensgevaar. Gebruik elders de lokale spoedzorg of het alarmnummer.',
  no: 'Storbritannia: ring NHS 111 for akutt medisinsk hjelp og 999 ved livstruende nød. Andre steder brukes lokal legevakt eller nødnummer.',
  pl: 'Wielka Brytania: NHS 111 w sprawie pilnej pomocy, 999 przy zagrożeniu życia. Gdzie indziej korzystaj z lokalnej pilnej opieki lub numeru alarmowego.',
  pt: 'Reino Unido: ligue NHS 111 para ajuda médica urgente e 999 em emergência com risco de vida. Noutros países, use o serviço urgente ou número de emergência local.',
  ro: 'Regatul Unit: sunați NHS 111 pentru ajutor medical urgent și 999 în urgențe care pun viața în pericol. În alte țări, folosiți serviciul urgent sau numărul local de urgență.',
  ru: 'В Великобритании: NHS 111 для срочной медицинской помощи, 999 при угрозе жизни. В других странах обращайтесь в местную службу неотложной помощи или по местному экстренному номеру.',
  sv: 'Storbritannien: ring NHS 111 för brådskande medicinsk hjälp och 999 vid livsfara. På andra platser används lokal akutvård eller larmnummer.',
  tr: 'Birleşik Krallık: acil tıbbi yardım için NHS 111, hayati tehlike için 999. Diğer yerlerde yerel acil bakım hizmetini veya acil numarayı kullanın.',
  zh: '英国：需要紧急医疗帮助请拨打NHS 111；危及生命的紧急情况请拨打999。在其他地区，请使用当地急诊服务或紧急电话号码。',
};
const england: Record<string, [string, string]> = {
  en: ['UK:', 'England:'], af: ['VK:', 'Engeland:'], ar: ['المملكة المتحدة:', 'إنجلترا:'],
  cs: ['Ve Spojeném království', 'V Anglii'], da: ['Storbritannien:', 'England:'],
  de: ['UK:', 'England:'], el: ['Ηνωμένο Βασίλειο:', 'Αγγλία:'], es: ['Reino Unido:', 'Inglaterra:'],
  fi: ['Britanniassa', 'Englannissa'], fr: ['Royaume-Uni', 'Angleterre'], he: ['בבריטניה:', 'באנגליה:'],
  hi: ['यूके:', 'इंग्लैंड:'], hu: ['Egyesült Királyság:', 'Anglia:'], it: ['Regno Unito:', 'Inghilterra:'],
  ja: ['英国では', 'イングランドでは'], ko: ['영국:', '잉글랜드:'], nl: ['VK:', 'Engeland:'],
  no: ['Storbritannia:', 'England:'], pl: ['Wielka Brytania:', 'Anglia:'], pt: ['Reino Unido:', 'Inglaterra:'],
  ro: ['Regatul Unit:', 'Anglia:'], ru: ['В Великобритании:', 'В Англии:'], sv: ['Storbritannien:', 'England:'],
  tr: ['Birleşik Krallık:', 'İngiltere:'], zh: ['英国：', '英格兰：'],
};
export function urgentCareNotice(lang: string) {
  const code = lang in urgent ? lang : 'en';
  const [from, to] = england[code];
  return urgent[code].replace(from, to);
}
