import type { Course } from "../../domain/types/course";
import type { Lesson } from "../../domain/types/lesson";

export const hsk1Course = {
  id: "hsk-1",
  level: 1,
  title: "HSK 1",
  description: "Podstawy języka chińskiego – poziom początkujący.",
  lessonIds: ["hsk-1-lesson-01", "hsk-1-lesson-02", "hsk-1-lesson-03"],
} satisfies Course;

const defaultActivities = [
  {
    id: "learn-vocabulary",
    type: "vocabulary",
    title: "Poznaj słownictwo",
    description: "Znaczenie, Pinyin i przykłady użycia.",
  },
  {
    id: "practice-pronunciation",
    type: "pronunciation",
    title: "Ćwicz wymowę",
    description: "Słuchaj nagrań i ćwicz tony.",
  },
  {
    id: "practice-writing",
    type: "writing",
    title: "Ćwicz pisanie",
    description: "Poznaj kolejność kresek znaków.",
  },
  {
    id: "review-lesson",
    type: "review",
    title: "Powtórka",
    description: "Sprawdź, ile zapamiętałeś.",
  },
] as const;

export const hsk1Lessons = [
  {
    id: "hsk-1-lesson-01",
    courseId: hsk1Course.id,
    order: 1,
    title: "你好 (Hello)",
    description:
      "Podstawowe powitania i zwroty grzecznościowe w języku chińskim.",
    items: [
      // Nowe słówka z dialogów (生词 / New Words)
      { kind: "vocabulary", id: "vocab-4f60" }, // 你 (nǐ)
      { kind: "vocabulary", id: "vocab-597d" }, // 好 (hǎo)
      { kind: "vocabulary", id: "vocab-60a8" }, // 您 (nín)
      { kind: "vocabulary", id: "vocab-4f60-4eec" }, // 你们 (nǐmen)
      { kind: "vocabulary", id: "vocab-5bf9-4e0d-8d77" }, // 对不起 (duìbuqǐ)
      { kind: "vocabulary", id: "vocab-6ca1-5173-7cfb" }, // 没关系 (méi guānxi)
      // Znaki i liczebniki poznawane w tej lekcji (认识独体字)
      { kind: "vocabulary", id: "vocab-4e00" }, // 一 (yī)
      { kind: "vocabulary", id: "vocab-4e8c" }, // 二 (èr)
      { kind: "vocabulary", id: "vocab-4e09" }, // 三 (sān)
      { kind: "vocabulary", id: "vocab-5341" }, // 十 (shí)
      { kind: "vocabulary", id: "vocab-516b" }, // 八 (bā)
      { kind: "vocabulary", id: "vocab-516d" }, // 六 (liù)
    ],
    activities: [
      {
        id: "learn-vocabulary",
        type: "vocabulary",
        title: "Poznaj słownictwo",
        description: "Znaczenie, Pinyin i przykłady użycia.",
      },
      {
        id: "learn-grammar",
        type: "grammar",
        title: "Reguły i gramatyka",
        description: "Zmiana 3. tonu (Tone Sandhi) i formy powitań.",
      },
      {
        id: "practice-pronunciation",
        type: "pronunciation",
        title: "Ćwicz wymowę",
        description: "Słuchaj nagrań i ćwicz tony.",
      },
      {
        id: "practice-writing",
        type: "writing",
        title: "Ćwicz pisanie",
        description: "Poznaj kolejność kresek znaków.",
      },
      {
        id: "review-lesson",
        type: "review",
        title: "Powtórka",
        description: "Sprawdź, ile zapamiętałeś.",
      },
    ],
    grammar: [
      {
        id: "tone-sandhi-3-3",
        title: "Zmiana trzeciego tonu (Tone Sandhi: 3. ton + 3. ton)",
        structure: "3. ton + 3. ton → 2. ton + 3. ton (3 + 3 → 2 + 3)",
        explanation:
          "Gdy dwie sylaby w trzecim tonie (3rd tone) następują bezpośrednio po sobie, pierwsza sylaba w naturalnej mowie zmienia ton na drugi (2nd tone – wznoszący). Jednak w oficjalnym zapisie Pinyin zachowuje się oryginalne oznaczenie tonu bazowego.",
        examples: [
          {
            chinese: "你好",
            pinyin: "nǐ hǎo (wym. ní hǎo)",
            translation: "Cześć / Dzień dobry",
            explanation: "nǐ (3) + hǎo (3) wymawia się jak ní hǎo (2+3)",
          },
          {
            chinese: "可以",
            pinyin: "kěyǐ (wym. ké yǐ)",
            translation: "móc / można",
            explanation: "kě (3) + yǐ (3) wymawia się jak ké yǐ (2+3)",
          },
          {
            chinese: "辅导",
            pinyin: "fǔdǎo (wym. fú dǎo)",
            translation: "korepetycje / konsultacja",
            explanation: "fǔ (3) + dǎo (3) wymawia się jak fú dǎo (2+3)",
          },
          {
            chinese: "小姐",
            pinyin: "xiǎojie (wym. xiáo jie)",
            translation: "panna / pani",
            explanation: "xiǎo (3) + jiě (3) wymawia się jak xiáo jie (2+3)",
          },
          {
            chinese: "手表",
            pinyin: "shǒubiǎo (wym. shóu biǎo)",
            translation: "zegarek na rękę",
            explanation: "shǒu (3) + biǎo (3) wymawia się jak shóu biǎo (2+3)",
          },
        ],
        notes: [
          "W oficjalnym zapisie pinyin zawsze pozostawiamy oznaczenie oryginalnego tonu (np. nǐ hǎo, a nie ní hǎo). Zmiana zachodzi wyłącznie w żywej wymowie.",
        ],
      },
      {
        id: "greetings-and-politeness",
        title: "Formy powitań i grzeczności (Zaimki osobowe)",
        structure: "Zaimek osobowy + 好 (hǎo)",
        explanation:
          "Podstawowe powitanie w języku chińskim tworzy się łącząc zaimek określający rozmówcę ze słowem 好 (dobry). Wybór odpowiedniej formy zależy od wieku, relacji i liczby osób, z którymi rozmawiamy.",
        examples: [
          {
            chinese: "你好！",
            pinyin: "Nǐ hǎo!",
            translation: "Cześć! / Dzień dobry!",
            explanation:
              "Standardowe, uniwersalne powitanie do jednej osoby (relacja równorzędna).",
          },
          {
            chinese: "您好！",
            pinyin: "Nín hǎo!",
            translation: "Dzień dobry Panu / Pani!",
            explanation:
              "Uprzejma forma grzecznościowa z zaimkiem 您 (nín), do osób starszych, nauczycieli i klientów.",
          },
          {
            chinese: "你们好！",
            pinyin: "Nǐmen hǎo!",
            translation: "Dzień dobry wam! / Witajcie!",
            explanation:
              "Powitanie skierowane do grupy osób (liczba mnoga z partykułą 们 men).",
          },
          {
            chinese: "对不起！ — 没关系！",
            pinyin: "Duìbuqǐ! — Méi guānxi!",
            translation: "Przepraszam! — Nic nie szkodzi!",
            explanation:
              "Podstawowa para zwrotów grzecznościowych: przeprosiny i uspokajająca odpowiedź.",
          },
        ],
        notes: [
          "Zaimka grzecznościowego 您 (nín) nie łączy się z partykułą liczby mnogiej 们 (nie używa się formy *您们). Aby przywitać z szacunkiem grupę osób, mówi się np. 大家好 (Dàjiā hǎo).",
        ],
      },
    ],
  },
  {
    id: "hsk-1-lesson-02",
    courseId: hsk1Course.id,
    order: 2,
    title: "谢谢你 (Thank you)",
    description:
      "Podziękowania, pożegnania i zwroty grzecznościowe w języku chińskim.",
    items: [
      // Nowe słówka z dialogów (生词 / New Words)
      { kind: "vocabulary", id: "vocab-8c22-8c22" }, // 谢谢 (xièxie)
      { kind: "vocabulary", id: "vocab-4e0d" }, // 不 (bù)
      { kind: "vocabulary", id: "vocab-4e0d-5ba2-6c14" }, // 不客气 (bú kèqi)
      { kind: "vocabulary", id: "vocab-518d-89c1" }, // 再见 (zàijiàn)
      // Znaki poznawane w tej lekcji (认识独体字)
      { kind: "vocabulary", id: "vocab-53e3" }, // 口 (kǒu)
      { kind: "vocabulary", id: "vocab-89c1" }, // 见 (jiàn)
      { kind: "vocabulary", id: "vocab-5c71" }, // 山 (shān)
      { kind: "vocabulary", id: "vocab-5c0f" }, // 小 (xiǎo)
    ],
    activities: [...defaultActivities],
  },
  {
    id: "hsk-1-lesson-03",
    courseId: hsk1Course.id,
    order: 3,
    title: "你叫什么名字 (What's your name)",
    description:
      "Pytanie o imię, przedstawianie się oraz narodowości w języku chińskim.",
    items: [
      // Nowe słówka z dialogów (生词 / New Words)
      { kind: "vocabulary", id: "vocab-53eb" }, // 叫 (jiào)
      { kind: "vocabulary", id: "vocab-4ec0-4e48" }, // 什么 (shénme)
      { kind: "vocabulary", id: "vocab-540d-5b57" }, // 名字 (míngzi)
      { kind: "vocabulary", id: "vocab-6211" }, // 我 (wǒ)
      { kind: "vocabulary", id: "vocab-662f" }, // 是 (shì)
      { kind: "vocabulary", id: "vocab-8001-5e08" }, // 老师 (lǎoshī)
      { kind: "vocabulary", id: "vocab-5417" }, // 吗 (ma)
      { kind: "vocabulary", id: "vocab-5b66-751f" }, // 学生 (xuésheng)
      { kind: "vocabulary", id: "vocab-4eba" }, // 人 (rén)
      // Nazwy własne (专名 / Proper Nouns)
      { kind: "vocabulary", id: "vocab-4e2d-56fd" }, // 中国 (Zhōngguó)
      { kind: "vocabulary", id: "vocab-7f8e-56fd" }, // 美国 (Měiguó)
      { kind: "vocabulary", id: "vocab-4e2d-56fd-4eba" }, // 中国人 (Zhōngguórén)
      { kind: "vocabulary", id: "vocab-7f8e-56fd-4eba" }, // 美国人 (Měiguórén)
      // Znaki poznawane w tej lekcji (认识独体字)
      { kind: "vocabulary", id: "vocab-6708" }, // 月 (yuè)
      { kind: "vocabulary", id: "vocab-5fc3" }, // 心 (xīn)
      { kind: "vocabulary", id: "vocab-4e2d" }, // 中 (zhōng)
    ],
    activities: [...defaultActivities],
  },
] satisfies readonly Lesson[];
