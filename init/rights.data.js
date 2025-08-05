const sampleRights = [
  // Right to Equality (Articles 14-18)
  {
    name: "Equality before Law",
    articleNumber: "14",
    description:
      "The State shall not deny to any person equality before the law or the equal protection of the laws within the territory of India. This ensures that all citizens are treated equally under the law regardless of their status, religion, race, caste, sex, or place of birth.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2014",
    category: "Right to Equality",
  },
  {
    name: "Prohibition of discrimination",
    articleNumber: "15",
    description:
      "The State shall not discriminate against any citizen on grounds only of religion, race, caste, sex, place of birth or any of them. This article ensures equal access to public places, shops, restaurants, hotels, and places of public entertainment.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2015",
    category: "Right to Equality",
  },
  {
    name: "Equality of opportunity in public employment",
    articleNumber: "16",
    description:
      "There shall be equality of opportunity for all citizens in matters relating to employment or appointment to any office under the State. No citizen shall be discriminated against in employment on grounds of religion, race, caste, sex, descent, place of birth, or residence.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2016",
    category: "Right to Equality",
  },
  {
    name: "Abolition of untouchability",
    articleNumber: "17",
    description:
      "Untouchability is abolished and its practice in any form is forbidden. The enforcement of any disability arising out of untouchability shall be an offence punishable in accordance with law.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2017",
    category: "Right to Equality",
  },
  {
    name: "Abolition of titles",
    articleNumber: "18",
    description:
      "No title, not being a military or academic distinction, shall be conferred by the State. No citizen of India shall accept any title from any foreign State. This ensures equality by preventing the creation of privileged classes.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2018",
    category: "Right to Equality",
  },

  // Right to Freedom (Articles 19-22)
  {
    name: "Protection of certain rights regarding freedom of speech",
    articleNumber: "19",
    description:
      "All citizens shall have the right to freedom of speech and expression, to assemble peacefully and without arms, to form associations or unions, to move freely throughout India, to reside and settle in any part of India, and to practice any profession or carry on any occupation, trade or business.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2019",
    category: "Right to Freedom",
  },
  {
    name: "Protection in respect of conviction for offences",
    articleNumber: "20",
    description:
      "No person shall be convicted of any offence except for violation of a law in force at the time of the commission of the act. No person shall be prosecuted and punished for the same offence more than once. No person accused of any offence shall be compelled to be a witness against himself.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2020",
    category: "Right to Freedom",
  },
  {
    name: "Protection of life and personal liberty",
    articleNumber: "21",
    description:
      "No person shall be deprived of his life or personal liberty except according to procedure established by law. This is one of the most important fundamental rights and has been interpreted to include the right to live with human dignity, right to livelihood, right to health, right to pollution-free environment, and many others.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2021",
    category: "Right to Freedom",
  },
  {
    name: "Right to education",
    articleNumber: "21A",
    description:
      "The State shall provide free and compulsory education to all children of the age of six to fourteen years in such manner as the State may, by law, determine. This right was added by the 86th Constitutional Amendment Act, 2002.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2021A",
    category: "Right to Freedom",
  },

  // Right against Exploitation (Articles 23-24)
  {
    name: "Prohibition of traffic in human beings and forced labour",
    articleNumber: "23",
    description:
      "Traffic in human beings and begar and other similar forms of forced labour are prohibited and any contravention of this provision shall be an offence punishable in accordance with law. This article prohibits all forms of human trafficking, slavery, and forced labor.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2023",
    category: "Right Against Exploitation",
  },
  {
    name: "Prohibition of employment of children in factories",
    articleNumber: "24",
    description:
      "No child below the age of fourteen years shall be employed to work in any factory or mine or engaged in any other hazardous employment. This article aims to protect children from exploitation and ensures their right to childhood and education.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2024",
    category: "Right Against Exploitation",
  },

  // Right to Freedom of Religion (Articles 25-28)
  {
    name: "Freedom of conscience and free profession, practice and propagation of religion",
    articleNumber: "25",
    description:
      "Subject to public order, morality and health, all persons are equally entitled to freedom of conscience and the right freely to profess, practice and propagate religion. This ensures religious freedom while maintaining secular values.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2025",
    category: "Right to Freedom of Religion",
  },
  {
    name: "Freedom to manage religious affairs",
    articleNumber: "26",
    description:
      "Subject to public order, morality and health, every religious denomination or any section thereof shall have the right to establish and maintain institutions for religious and charitable purposes, to manage its own affairs in matters of religion, and to own and acquire movable and immovable property.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2026",
    category: "Right to Freedom of Religion",
  },
  {
    name: "Freedom as to payment of taxes for promotion of any particular religion",
    articleNumber: "27",
    description:
      "No person shall be compelled to pay any taxes, the proceeds of which are specifically appropriated in payment of expenses for the promotion or maintenance of any particular religion or religious denomination.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2027",
    category: "Right to Freedom of Religion",
  },
  {
    name: "Freedom as to attendance at religious instruction or religious worship",
    articleNumber: "28",
    description:
      "No religious instruction shall be provided in any educational institution wholly maintained out of State funds. No person attending any educational institution shall be required to take part in any religious instruction or to attend any religious worship in that institution.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2028",
    category: "Right to Freedom of Religion",
  },

  // Cultural and Educational Rights (Articles 29-30)
  {
    name: "Protection of interests of minorities",
    articleNumber: "29",
    description:
      "Any section of the citizens residing in any part of India having a distinct language, script or culture of its own shall have the right to conserve the same. No citizen shall be denied admission into any educational institution maintained by the State or receiving aid out of State funds on grounds only of religion, race, caste, language or any of them.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2029",
    category: "Cultural and Educational Rights",
  },
  {
    name: "Right of minorities to establish and administer educational institutions",
    articleNumber: "30",
    description:
      "All minorities, whether based on religion or language, shall have the right to establish and administer educational institutions of their choice. The State shall not, in granting aid to educational institutions, discriminate against any educational institution on the ground that it is under the management of a minority.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2030",
    category: "Cultural and Educational Rights",
  },

  // Right to Constitutional Remedies (Article 32)
  {
    name: "Right to Constitutional Remedies",
    articleNumber: "32",
    description:
      "The right to move the Supreme Court by appropriate proceedings for the enforcement of fundamental rights is guaranteed. The Supreme Court shall have power to issue writs, including writs in the nature of habeas corpus, mandamus, prohibition, certiorari and quo-warranto, whichever may be appropriate, for the enforcement of any of the fundamental rights. Dr. B.R. Ambedkar called this the 'heart and soul' of the Constitution.",
    sourceLink: "https://www.constitutionofindia.net/constitution_of_india/fundamental_rights/articles/Article%2032",
    category: "Right to Constitutional Remedies",
  }
];

module.exports = { data: sampleRights };