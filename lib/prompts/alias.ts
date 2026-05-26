import { shuffleArray } from '@/lib/utils';

export interface WordCategory {
  id: string;
  label: string;
  words: string[];
}

export const ALIAS_CATEGORIES: WordCategory[] = [
  {
    id: 'svakodnevica',
    label: 'Svakodnevica',
    words: [
      'tabak papira', 'usisivač', 'kišobran', 'četkica za zube', 'peglanje',
      'ključ', 'novčanik', 'stepenice', 'ruksak', 'pegla',
      'frižider', 'šerpa', 'jastuče', 'daljinski upravljač', 'šrafciger',
      'sušilica', 'zavjesa', 'kanta za smeće', 'šolja za kafu', 'budilnik',
    ],
  },
  {
    id: 'priroda',
    label: 'Priroda i životinje',
    words: [
      'šimpanza', 'medvjed', 'lavina', 'koralni greben', 'delfin',
      'vulkan', 'orao', 'vodopadi', 'kameleon', 'munja',
      'hobotnica', 'pčelinja košnica', 'aurora', 'gepard', 'sekvoja',
      'morska zvijezda', 'tornado', 'pingvin', 'pustinja', 'leptir',
    ],
  },
  {
    id: 'zanimanja',
    label: 'Zanimanja i sport',
    words: [
      'vatrogasac', 'krotitelj zmija', 'astronaut', 'sudija', 'plivanje',
      'dirigent', 'boks', 'hirurg', 'skijanje', 'detektiv',
      'dimnjačar', 'balet', 'pilot', 'streličarstvo', 'veterinar',
      'ronjenje', 'kaskader', 'šahista', 'arheolog', 'ragbi',
    ],
  },
  {
    id: 'hrana',
    label: 'Hrana i piće',
    words: [
      'palačinke', 'espreso', 'ćevapi', 'limunada', 'baklava',
      'sladoled', 'burek', 'smoothie', 'tartufi', 'pršut',
      'lazanje', 'koktel', 'ajvar', 'kroasan', 'čokolada',
      'sarma', 'kapučino', 'gulaš', 'pavlaka', 'maslinovo ulje',
    ],
  },
  {
    id: 'geografija',
    label: 'Gradovi i geografija',
    words: [
      'Venecija', 'piramida', 'Amazonija', 'fjord', 'Sahara',
      'Tokio', 'Antarktik', 'Nil', 'Himalaji', 'Havaji',
      'Beograd', 'Gibraltar', 'Nijagarini vodopadi', 'Bermudski trougao', 'Kilimandžaro',
      'Dubrovnik', 'Sibirija', 'Marijanski rov', 'Koloseum', 'Panamski kanal',
    ],
  },
  {
    id: 'nauka',
    label: 'Nauka i tehnologija',
    words: [
      'kompjuter', 'nanosekunda', 'robotika', 'teleskop', 'gravitacija',
      'satelit', 'mikroskop', 'algoritam', 'hologram', 'DNK',
      'zavarivanje', 'baterija', 'laser', 'vještačka inteligencija', 'termometar',
      'barometar', 'rentgen', 'stetoskop', 'internet', 'elektromagnet',
    ],
  },
  {
    id: 'kultura',
    label: 'Kultura i umjetnost',
    words: [
      'opera', 'grafiti', 'skulptura', 'kinematografija', 'simfonija',
      'freska', 'pantomima', 'kaligrafija', 'mozaik', 'roman',
      'orkestar', 'komedija', 'portret', 'origami', 'scenografija',
      'koreografija', 'akvarel', 'dokumentarac', 'sonet', 'improvizacija',
    ],
  },
  {
    id: 'pridjevi',
    label: 'Pridjevi i osobine',
    words: [
      'vijugav', 'zrikav', 'pravovremen', 'osećajan', 'lukav',
      'škrt', 'oštar', 'svestran', 'tvrdoglav', 'nježan',
      'pronicljiv', 'smušen', 'neustrašiv', 'razdragran', 'skroman',
      'zloćudan', 'naivan', 'goropadan', 'marljiv', 'čudnovat',
    ],
  },
  {
    id: 'glagoli',
    label: 'Glagoli i radnje',
    words: [
      'zgnječiti', 'drhtati', 'razmenjivati', 'tkati', 'šaputati',
      'surfovati', 'žonglirati', 'pregovarati', 'trčkarati', 'zavirivati',
      'meditirati', 'eksperimentisati', 'improvizovati', 'navigirati', 'skandirati',
      'maskirati', 'kalkulisati', 'galopisati', 'provocirati', 'balansirati',
    ],
  },
  {
    id: 'mjesovito',
    label: 'Mješovito',
    words: [
      'ispupčenje', 'kriminal', 'značka', 'krzneni kaput', 'kabina',
      'oglašivač', 'fioka', 'korida', 'putnik', 'trajekt',
      'bubuljica', 'vatrogasni kamion', 'engleski', 'žed', 'lista',
      'brada', 'visoko', 'naočare', 'karneval', 'lavirint',
    ],
  },
];

const ALL_WORDS: string[] = ALIAS_CATEGORIES.flatMap((c) => c.words);

export function getRandomWords(count: number): string[] {
  const result: string[] = [];
  while (result.length < count) {
    result.push(...shuffleArray(ALL_WORDS));
  }
  return result.slice(0, count);
}
