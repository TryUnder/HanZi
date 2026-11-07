import { useState } from "react";
import { characters } from "../../library/data/characters";
import { WritingHistory } from "../components/WritingHistory";
import { WritingWorkspace } from "../components/WritingWorkspace";
import { useWritingHistory } from "../hooks/useWritingHistory";
import styles from "./WritingPage.module.css";

export function WritingPage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState("ni");

  const { history, error, addSession } = useWritingHistory(characters);

  const selectedCharacter =
    characters.find((character) => character.id === selectedCharacterId) ??
    characters[0];

  if (!selectedCharacter) {
    throw new Error("The character library is empty.");
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <span className={styles.eyebrow}>LEARN CHINESE WRITING</span>
        <h1>Character practice</h1>
        <p>Learn how Chinese characters are written, stroke by stroke.</p>
      </header>

      <section className={styles.workspace}>
        <div className={styles.characterSelector}>
          <label htmlFor="character-select">Choose a character</label>

          <select
            id="character-select"
            value={selectedCharacterId}
            onChange={(event) => setSelectedCharacterId(event.target.value)}
          >
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.simplified} — {character.pinyin} ({character.meaning}
                )
              </option>
            ))}
          </select>

          <div className={styles.characterInfo}>
            <span>{selectedCharacter.simplified}</span>
            <strong>{selectedCharacter.pinyin}</strong>
            <p>{selectedCharacter.meaning}</p>
            <small>
              {selectedCharacter.strokes} strokes · HSK{" "}
              {selectedCharacter.hskLevel}
            </small>
          </div>
        </div>

        <WritingWorkspace
          key={selectedCharacter.id}
          character={selectedCharacter}
          historyError={error}
          addSession={addSession}
        />
      </section>

      <WritingHistory history={history} characters={characters} />
    </div>
  );
}
