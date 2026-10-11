// Search suggestions, not a list of supported diagnoses. Free text is always allowed.
const additions: Record<string, [string, string, string, string]> = {
  en: ['Cancer', 'Prostate cancer', 'Haemochromatosis (hemochromatosis)', 'Suggestions are optional. If your condition is missing, type its name and search. For personal guidance, contact your care team.'],
  af: ['Kanker', 'Prostaatkanker', 'Hemochromatose', 'Voorstelle is opsioneel. As jou toestand ontbreek, tik die naam en soek. Kontak jou sorgspan vir persoonlike leiding.'],
  ar: ['السرطان', 'سرطان البروستاتا', 'داء ترسب الأصبغة الدموية', 'الاقتراحات اختيارية. إذا لم تجد حالتك، اكتب اسمها وابحث. للحصول على إرشاد شخصي، تواصل مع فريق رعايتك.'],
  cs: ['Rakovina', 'Rakovina prostaty', 'Hemochromatóza', 'Návrhy jsou volitelné. Pokud stav chybí, napište jeho název a vyhledejte jej. Pro individuální radu kontaktujte svůj zdravotnický tým.'],
  da: ['Kræft', 'Prostatakræft', 'Hæmokromatose', 'Forslag er valgfrie. Hvis din tilstand mangler, skriv navnet og søg. Kontakt dit behandlingsteam for personlig vejledning.'],
  de: ['Krebs', 'Prostatakrebs', 'Hämochromatose', 'Vorschläge sind optional. Fehlt Ihre Erkrankung, geben Sie den Namen ein und suchen Sie. Wenden Sie sich für persönliche Beratung an Ihr Behandlungsteam.'],
  el: ['Καρκίνος', 'Καρκίνος του προστάτη', 'Αιμοχρωμάτωση', 'Οι προτάσεις είναι προαιρετικές. Αν λείπει η πάθησή σας, πληκτρολογήστε το όνομά της και αναζητήστε. Για προσωπική καθοδήγηση, επικοινωνήστε με την ομάδα φροντίδας σας.'],
  es: ['Cáncer', 'Cáncer de próstata', 'Hemocromatosis', 'Las sugerencias son opcionales. Si falta su enfermedad, escriba su nombre y busque. Para orientación personal, contacte con su equipo médico.'],
  fi: ['Syöpä', 'Eturauhassyöpä', 'Hemokromatoosi', 'Ehdotukset ovat valinnaisia. Jos sairautesi puuttuu, kirjoita sen nimi ja hae. Ota yhteyttä hoitotiimiisi henkilökohtaista ohjausta varten.'],
  fr: ['Cancer', 'Cancer de la prostate', 'Hémochromatose', 'Les suggestions sont facultatives. Si votre maladie manque, saisissez son nom et recherchez. Pour un conseil personnel, contactez votre équipe soignante.'],
  he: ['סרטן', 'סרטן הערמונית', 'המוכרומטוזיס', 'ההצעות הן אופציונליות. אם המצב שלכם חסר, הקלידו את שמו וחפשו. לקבלת הדרכה אישית, פנו לצוות המטפל.'],
  hi: ['कैंसर', 'प्रोस्टेट कैंसर', 'हीमोक्रोमैटोसिस', 'सुझाव वैकल्पिक हैं। आपकी स्थिति सूची में नहीं है तो उसका नाम लिखकर खोजें। व्यक्तिगत मार्गदर्शन के लिए अपनी देखभाल टीम से संपर्क करें।'],
  hu: ['Rák', 'Prosztatarák', 'Hemokromatózis', 'A javaslatok választhatók. Ha betegsége hiányzik, írja be a nevét és keressen. Személyes tanácsért forduljon kezelőcsapatához.'],
  it: ['Cancro', 'Cancro alla prostata', 'Emocromatosi', 'I suggerimenti sono facoltativi. Se manca la tua condizione, scrivi il nome e cerca. Per indicazioni personali, contatta il tuo team di cura.'],
  ja: ['がん', '前立腺がん', 'ヘモクロマトーシス', '候補の選択は任意です。病名がない場合は、名前を入力して検索してください。個別の相談は担当の医療チームにお問い合わせください。'],
  ko: ['암', '전립선암', '혈색소침착증', '추천 항목 선택은 선택 사항입니다. 질환이 없으면 이름을 입력하여 검색하세요. 개인별 안내는 담당 의료진에게 문의하세요.'],
  nl: ['Kanker', 'Prostaatkanker', 'Hemochromatose', 'Suggesties zijn optioneel. Ontbreekt uw aandoening, typ dan de naam en zoek. Neem voor persoonlijk advies contact op met uw behandelteam.'],
  no: ['Kreft', 'Prostatakreft', 'Hemokromatose', 'Forslag er valgfrie. Hvis tilstanden din mangler, skriv navnet og søk. Kontakt behandlingsteamet ditt for personlig veiledning.'],
  pl: ['Rak', 'Rak prostaty', 'Hemochromatoza', 'Sugestie są opcjonalne. Jeśli brakuje choroby, wpisz jej nazwę i wyszukaj. Po indywidualną poradę zwróć się do swojego zespołu medycznego.'],
  pt: ['Cancro', 'Cancro da próstata', 'Hemocromatose', 'As sugestões são opcionais. Se a sua condição não estiver na lista, escreva o nome e pesquise. Para orientação pessoal, contacte a sua equipa de cuidados.'],
  ro: ['Cancer', 'Cancer de prostată', 'Hemocromatoză', 'Sugestiile sunt opționale. Dacă afecțiunea lipsește, introduceți numele și căutați. Pentru îndrumare personală, contactați echipa medicală.'],
  ru: ['Рак', 'Рак предстательной железы', 'Гемохроматоз', 'Выбор подсказки необязателен. Если заболевания нет в списке, введите его название и выполните поиск. За индивидуальной консультацией обратитесь к лечащей команде.'],
  sv: ['Cancer', 'Prostatacancer', 'Hemokromatos', 'Förslagen är valfria. Om ditt tillstånd saknas, skriv namnet och sök. Kontakta ditt vårdteam för personlig vägledning.'],
  tr: ['Kanser', 'Prostat kanseri', 'Hemokromatoz', 'Öneriler isteğe bağlıdır. Hastalığınız yoksa adını yazıp arayın. Kişisel rehberlik için bakım ekibinizle iletişime geçin.'],
  zh: ['癌症', '前列腺癌', '血色病', '建议选项并非必选。如果没有您的疾病，请输入名称并搜索。如需个人指导，请联系您的医疗团队。'],
};

export function conditionAdditions(lang: string) {
  const [cancer, prostate_cancer, haemochromatosis, hint] = additions[lang] || additions.en;
  return {labels: {cancer, prostate_cancer, haemochromatosis}, hint};
}
