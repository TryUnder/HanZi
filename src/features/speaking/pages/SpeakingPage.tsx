import { useState } from "react";
import { ToneTrainer } from "../components/ToneTrainer";
import { ListeningExercise } from "../components/ListeningExercise";
import { SpeakingRecorder } from "../components/SpeakingRecorder";
import { characters } from "../../library/data/characters";
import styles from "./SpeakingPage.module.css";

export default function SpeakingPage() {
  const [selectedCharacterId, setSelectedCharacterId] = useState(
    characters[0]?.id ?? "",
  );

  const selectedCharacter = characters.find(
    (character) => character.id === selectedCharacterId,
  );

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <span className={styles.eyebrow}>PRONUNCIATION & TONES</span>
          <h1>Speaking</h1>
          <p>Learn Mandarin pronunciation and master the five tones.</p>
        </div>
      </header>

      <ToneTrainer />

      <ListeningExercise />

      {selectedCharacter && (
        <SpeakingRecorder
          key={selectedCharacter.id}
          characters={characters}
          character={selectedCharacter}
          onCharacterChange={setSelectedCharacterId}
        />
      )}
    </div>
  );
}
