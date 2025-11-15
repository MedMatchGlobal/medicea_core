// app/data/countries.ts

const countriesByRegion: { [region: string]: string[] } = {
  Europe: [
    "Albania", "Andorra", "Austria", "Belarus", "Belgium", "Bosnia and Herzegovina", "Bulgaria",
    "Croatia", "Cyprus", "Czechia", "Denmark", "Estonia", "Finland", "France", "Germany", "Greece",
    "Holy See (Vatican City State)", "Hungary", "Iceland", "Ireland", "Italy", "Latvia",
    "Liechtenstein", "Lithuania", "Luxembourg", "Malta", "Moldova", "Monaco", "Montenegro",
    "Netherlands", "North Macedonia", "Norway", "Poland", "Portugal", "Romania", "Russia",
    "San Marino", "Serbia", "Slovakia", "Slovenia", "Spain", "Sweden", "Switzerland", "Ukraine",
    "United Kingdom"
  ],
  Asia: [
    "Afghanistan", "Armenia", "Azerbaijan", "Bahrain", "Bangladesh", "Bhutan", "Brunei",
    "Cambodia", "China", "Georgia", "India", "Indonesia", "Iran", "Iraq", "Israel", "Japan",
    "Jordan", "Kazakhstan", "North Korea", "South Korea", "Kuwait", "Kyrgyzstan", "Laos", "Lebanon",
    "Malaysia", "Maldives", "Mongolia", "Myanmar", "Nepal", "Oman", "Pakistan", "Palestine",
    "Philippines", "Qatar", "Saudi Arabia", "Singapore", "Sri Lanka", "Syria", "Taiwan", "Tajikistan",
    "Thailand", "Timor-Leste", "Turkey", "Turkmenistan", "United Arab Emirates", "Uzbekistan",
    "Vietnam", "Yemen"
  ],
  Africa: [
    "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
    "Central African Republic", "Chad", "Comoros", "Congo", "Congo (DR)", "Côte d'Ivoire", "Djibouti",
    "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana",
    "Guinea", "Guinea-Bissau", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi",
    "Mali", "Mauritania", "Mauritius", "Mayotte", "Morocco", "Mozambique", "Namibia", "Niger",
    "Nigeria", "Réunion", "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone",
    "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
    "Western Sahara", "Zambia", "Zimbabwe"
  ],
  Americas: [
    "Antigua and Barbuda", "Argentina", "Bahamas", "Barbados", "Belize", "Bolivia", "Brazil",
    "Canada", "Chile", "Colombia", "Costa Rica", "Cuba", "Dominica", "Dominican Republic", "Ecuador",
    "El Salvador", "Grenada", "Guatemala", "Guyana", "Haiti", "Honduras", "Jamaica", "Mexico",
    "Nicaragua", "Panama", "Paraguay", "Peru", "Saint Kitts and Nevis", "Saint Lucia",
    "Saint Vincent and the Grenadines", "Suriname", "Trinidad and Tobago", "United States",
    "Uruguay", "Venezuela"
  ],
  Oceania: [
    "American Samoa", "Australia", "Cook Islands", "Fiji", "French Polynesia", "Guam", "Kiribati",
    "Marshall Islands", "Micronesia", "Nauru", "New Caledonia", "New Zealand", "Niue",
    "Norfolk Island", "Northern Mariana Islands", "Palau", "Papua New Guinea", "Samoa",
    "Solomon Islands", "Tokelau", "Tonga", "Tuvalu", "Vanuatu", "Wallis and Futuna"
  ],
  Other: [
    "Anguilla", "Antarctica", "Aruba", "Bermuda", "Bouvet Island", "Cayman Islands",
    "Christmas Island", "Cocos (Keeling) Islands", "Curaçao", "Falkland Islands", "Faroe Islands",
    "Gibraltar", "Greenland", "Guadeloupe", "Guernsey", "Isle of Man", "Jersey", "Macao",
    "Martinique", "Montserrat", "Pitcairn", "Puerto Rico", "Saint Barthélemy",
    "Saint Helena", "Saint Martin", "Saint Pierre and Miquelon", "Sint Maarten",
    "South Georgia and the South Sandwich Islands", "Svalbard", "Turks and Caicos Islands",
    "U.S. Virgin Islands", "British Virgin Islands"
  ]
};

export default countriesByRegion;

