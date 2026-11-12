import type { Course } from "../../domain/types/course";
import type { Lesson } from "../../domain/types/lesson";

export const hsk1Course = {
  id: "hsk-1",
  level: 1,
  title: "HSK 1",
  description: "Podstawy języka chińskiego – poziom początkujący.",
  lessonIds: ["hsk-1-lesson-01", "hsk-1-lesson-02", "hsk-1-lesson-03"],
} satisfies Course;

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
        id: "practice-writing-memory",
        type: "writing-memory",
        title: "Pisanie z pamięci",
        description: "Odtwórz znaki na podstawie Pinyin i znaczenia.",
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
        description: "Ton neutralny (轻声), zasady zapisu tonów i zwroty podziękowania.",
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
        id: "practice-writing-memory",
        type: "writing-memory",
        title: "Pisanie z pamięci",
        description: "Odtwórz znaki na podstawie Pinyin i znaczenia.",
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
        id: "neutral-tone",
        title: "Ton neutralny w języku chińskim (轻声 The Neutral Tone)",
        structure: "Sylaba z tonem + Sylaba lekka (bez znaku tonu)",
        explanation:
          "W języku chińskim, oprócz czterech głównych tonów, występuje tzw. ton lekki (neutralny). Sylaba w tonie neutralnym wymawiana jest bardzo krótko, cicho i bez akcentu. W zapisie Pinyin nie stawia się nad nią żadnego znaku tonu. Często pojawia się w podwojonych nazwach pokrewieństwa oraz w partykułach.",
        examples: [
          {
            chinese: "妈妈",
            pinyin: "māma",
            translation: "mama",
            explanation: "Druga sylaba wymawiana lekko i krótko.",
          },
          {
            chinese: "爸爸",
            pinyin: "bàba",
            translation: "tata",
            explanation: "Druga sylaba w tonie neutralnym.",
          },
          {
            chinese: "爷爷",
            pinyin: "yéye",
            translation: "dziadek",
            explanation: "Druga sylaba w tonie neutralnym.",
          },
          {
            chinese: "奶奶",
            pinyin: "nǎinai",
            translation: "babcia",
            explanation: "Druga sylaba w tonie neutralnym.",
          },
          {
            chinese: "你们",
            pinyin: "nǐmen",
            translation: "wy (liczba mnoga)",
            explanation: "Partykuła 们 (men) wymawiana jest w tonie neutralnym.",
          },
        ],
        notes: [
          "Wysokość tonu neutralnego nie jest stała — zależy od tonu poprzedzającej sylaby (np. po 1. tonie opada nisko, a po 3. tonie brzmi nieco wyżej).",
        ],
      },
      {
        id: "tone-marking-rules",
        title: "Zasady oznaczania tonów w Pinyin (标调法 Tone Marking)",
        structure: "Hierarchia samogłosek: a → o → e → i → u → ü (wyjątek: iu → na u)",
        explanation:
          "Znak tonu zawsze umieszcza się nad samogłoską. Jeśli sylaba zawiera więcej niż jedną samogłoskę, znak stawiamy nad tą, przy której usta otwierają się najszerzej: w kolejności a, o, e, i, u, ü. Jeśli obok siebie stoją litery 'i' oraz 'u' (zbitki iu/ui), znak tonu stawiamy zawsze na drugiej z nich.",
        examples: [
          {
            chinese: "学校",
            pinyin: "xuéxiào",
            translation: "szkoła",
            explanation: "W sylabie 'xiào' litera 'a' ma pierwszeństwo przed 'o'.",
          },
          {
            chinese: "手表",
            pinyin: "shǒubiǎo",
            translation: "zegarek na rękę",
            explanation: "W sylabie 'biǎo' ton stawiamy nad 'a'.",
          },
          {
            chinese: "休息",
            pinyin: "xiūxi",
            translation: "odpoczywać",
            explanation: "W zbitce 'iu' ton stawiamy na drugiej literze, czyli 'u'.",
          },
          {
            chinese: "口",
            pinyin: "kǒu",
            translation: "usta",
            explanation: "W sylabie 'kǒu' litera 'o' ma pierwszeństwo przed 'u'.",
          },
        ],
        notes: [
          "Łatwa reguła pamięciowa: Gdy widzisz 'a', zawsze postaw ton na 'a'. Jeśli nie ma 'a', szukaj 'o' lub 'e'. Gdy stoją razem 'i' oraz 'u', postaw ton na drugą z nich.",
        ],
      },
      {
        id: "gratitude-and-farewell",
        title: "Podziękowania, odpowiedzi i pożegnania (Zwroty grzecznościowe)",
        structure: "谢谢 (xièxie) ↔ 不客气 (bú kèqi) / 不谢 (bú xiè)",
        explanation:
          "W Lekcji 2 poznajemy podstawowe sposoby dziękowania i reagowania na podziękowania. Zwróć uwagę na wymowę słówka 不 (bù): gdy stoi przed sylabą w 4. tonie (jak 谢 xiè lub 客 kè), zmienia ono ton na 2. wznoszący (bú xiè, bú kèqi).",
        examples: [
          {
            chinese: "谢谢！ — 不谢！",
            pinyin: "Xièxie! — Bú xiè!",
            translation: "Dziękuję! — Nie ma za co!",
            explanation: "Krótka, potoczna wymiana zdań między znajomymi.",
          },
          {
            chinese: "谢谢你！ — 不客气！",
            pinyin: "Xièxie nǐ! — Bú kèqi!",
            translation: "Dziękuję ci! — Proszę bardzo / Nie ma za co!",
            explanation: "Standardowa, uprzejma forma podziękowania i odpowiedzi.",
          },
          {
            chinese: "再见！ — 再见！",
            pinyin: "Zàijiàn! — Zàijiàn!",
            translation: "Do widzenia! — Do widzenia!",
            explanation: "Dosłownie: 'zobaczyć się znowu' (再 znowu + 见 widzieć).",
          },
        ],
        notes: [
          "Reguła zmiany tonu słówka 不: bù + 4. ton → bú + 4. ton (np. bú xiè, bú kèqi, bú shì). Przed tonami 1, 2 i 3 słowo 不 zachowuje swój 4. ton (np. bù gāo, bù lái, bù hǎo).",
        ],
      },
    ],
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
        description: "Zaimek 什么, zdania z czasownikiem 是 oraz pytania z 吗.",
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
        id: "practice-writing-memory",
        type: "writing-memory",
        title: "Pisanie z pamięci",
        description: "Odtwórz znaki na podstawie Pinyin i znaczenia.",
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
        id: "interrogative-pronoun-shenme",
        title: "Zaimek pytający 什么 (shénme – 'co / jaki')",
        structure: "Podmiot + Czasownik + 什么 (+ Rzeczownik)?",
        explanation:
          "Zaimek pytający 什么 (shénme) służy do zadawania pytań o rzeczy, imiona, zawody itp. Może występować samodzielnie jako dopełnienie (np. 'Co to jest?') lub łączyć się z rzeczownikiem (np. 'Jakie imię?', 'Jaka książka?'). W języku chińskim szyk zdania pytającego pozostaje identyczny jak w zdaniu twierdzącym — zaimek pytający wstawia się dokładnie w miejsce pytanej informacji.",
        examples: [
          {
            chinese: "你叫什么名字？",
            pinyin: "Nǐ jiào shénme míngzi?",
            translation: "Jak masz na imię? (dosł. Jakie imię się nazywasz?)",
            explanation: "什么 + 名字 (jakie imię) pełni funkcję dopełnienia czasownika 叫.",
          },
          {
            chinese: "这是什么？",
            pinyin: "Zhè shì shénme?",
            translation: "Co to jest?",
            explanation: "什么 występuje samodzielnie jako orzecznik po czasowniku 是.",
          },
          {
            chinese: "这是什么书？",
            pinyin: "Zhè shì shénme shū?",
            translation: "Co to za książka? / Jaka to książka?",
            explanation: "什么 określa bezpośrednio rzeczownik 书 (książka).",
          },
        ],
        notes: [
          "W języku chińskim nie stosuje się inwersji przy pytaniach. Zdanie '你叫什么名字？' ma dokładnie taki sam szyk (Podmiot - Czasownik - Dopełnienie) co odpowiedź '我叫李月。'.",
        ],
      },
      {
        id: "shi-sentence-and-negation",
        title: "Zdania orzekające ze spójką 是 (shì – 'być') i przeczenie 不是",
        structure: "Podmiot + (不)是 + Rzeczownik / Orzecznik",
        explanation:
          "Czasownik 是 (shì) pełni funkcję spójki łączącej podmiot z orzecznikiem rzeczownikowym, wskazując tożsamość, zawód lub przynależność (odpowiednik polskiego 'być'). Przeczenie tworzy się przez dodanie przysłówka 不 (bù) bezpośrednio przed 是, co w mowie daje 'bú shì'.",
        examples: [
          {
            chinese: "李月是老师。",
            pinyin: "Lǐ Yuè shì lǎoshī.",
            translation: "Li Yue jest nauczycielką.",
            explanation: "Zdanie twierdzące określające zawód/funkcję.",
          },
          {
            chinese: "我是美国人。",
            pinyin: "Wǒ shì Měiguórén.",
            translation: "Jestem Amerykaninem.",
            explanation: "Określenie narodowości (Państwo + 人).",
          },
          {
            chinese: "我不是老师，我是学生。",
            pinyin: "Wǒ bú shì lǎoshī, wǒ shì xuésheng.",
            translation: "Nie jestem nauczycielem, jestem uczniem/studentem.",
            explanation: "Zdanie przeczące ze zwrotem 不是 (bú shì).",
          },
        ],
        notes: [
          "W języku chińskim czasownik 是 NIE łączy się bezpośrednio z przymiotnikami (nie mówi się *我是好, lecz 我很好). Czasownik 是 służy do łączenia z rzeczownikami i frazami rzeczownikowymi.",
        ],
      },
      {
        id: "ma-question-particle",
        title: "Pytania rozstrzygające z partykułą 吗 (ma – 'czy')",
        structure: "Zdanie twierdzące + 吗 (ma)?",
        explanation:
          "Partykuła pytająca 吗 (ma) służy do przekształcenia dowolnego zdania oznajmującego w pytanie rozstrzygające (odpowiednik polskiego 'Czy...?'). Partykułę 吗 stawia się zawsze na samym końcu zdania, nie zmieniając w nim ani jednego słowa. Wymawia się ją w tonie neutralnym.",
        examples: [
          {
            chinese: "你是老师吗？",
            pinyin: "Nǐ shì lǎoshī ma?",
            translation: "Czy jesteś nauczycielem?",
            explanation: "Zdanie twierdzące '你是老师' + partykuła 吗.",
          },
          {
            chinese: "你是中国人吗？",
            pinyin: "Nǐ shì Zhōngguórén ma?",
            translation: "Czy jesteś Chińczykiem?",
            explanation: "Odpowiedź twierdząca: 是 / 我是中国人; przecząca: 不是 / 我不是中国人.",
          },
          {
            chinese: "你是美国人吗？",
            pinyin: "Nǐ shì Měiguórén ma?",
            translation: "Czy jesteś Amerykaninem?",
            explanation: "Odpowiedź: 我不是美国人，我是中国人。",
          },
        ],
        notes: [
          "Nie wolno łączyć w jednym zdaniu partykuły 吗 z zaimkiem pytającym (np. 什么). Zdanie '你叫什么名字吗？' jest błędem gramatycznym!",
        ],
      },
    ],
  },
] satisfies readonly Lesson[];
