import { G2pM, PhonemizerZh } from "charsiu-js";
import { loadG2pmAssets, loadPhoneVocabZh } from "charsiu-js/assets-node";

const [assets, vocab] = await Promise.all([
  loadG2pmAssets(),
  loadPhoneVocabZh(),
]);

const g2p = new G2pM(assets);
const phonemizer = new PhonemizerZh(g2p, vocab);

const examples = [
  "你好",
  "谢谢",
  "老师",
  "学生",
  "一会儿",
  "不是",
  "银行",
  "行",
  "长大",
];

for (const text of examples) {
  console.log(`\n========== ${text} ==========`);
  console.log("G2P:", g2p.convert(text));
  console.log(
    "PHONEMES:",
    JSON.stringify(phonemizer.getPhonesAndWords(text), null, 2),
  );
}
