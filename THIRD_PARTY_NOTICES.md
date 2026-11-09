# Third-party assets

## Mandarin pronunciation audio

### Word and syllable recordings

- Source: https://github.com/hugolpz/audio-cmn
- Files used: `64k/hsk/cmn-*.mp3` (word and character recordings) and
  `64k/syllabs/cmn-*.mp3` (single-syllable recordings)
- Speakers:
  - Syllables (`cmn-{pinyin}.mp3`): Chen Wang
  - Words and characters (`cmn-{hanzi}.mp3`): Yue Tan, via
    [Shtooka](http://packs.shtooka.net/cmn-caen-tan/readme.txt)
- Curation, recording and distribution: Hugo Lopez (PLIDAM, INALCO)
- License: [CC BY-SA](https://creativecommons.org/licenses/by-sa/4.0/)
- Notes:
  - The upstream repository no longer ships neutral-tone syllable files
    (`cmn-*5.mp3`); they were removed as duplicates of the first-tone files.
    HanZi therefore falls back to speech synthesis for those syllables.
  - The upstream repository has a single misspelled syllable file (`cmn-jv4.mp3`)
    which is mapped to `ju4`.

Audio files are **not** stored in this repository. They are downloaded into
`public/audio/` with:

```bash
npm run audio:sync
```

Because the recordings are licensed CC BY-SA, redistribution must keep the
attribution above and the share-alike terms.

### Tone demonstrations

- Files: `public/audio/mandarin/ma1.mp3` … `ma4.mp3`
- Source: https://github.com/hugolpz/audio-cmn (`64k/syllabs/`)
- Recording: Chen Wang
- License: CC BY-SA

## Hanzi stroke data

- Library: [hanzi-writer](https://github.com/chanind/hanzi-writer)
- Stroke data is loaded at runtime from `cdn.jsdelivr.net`
- License: MIT (library), Arphic Public License (character data)
