import { Plus, Volume2 } from "lucide-react";

export function DailyChallenge() {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="section-kicker">A LITTLE EVERY DAY</span>
          <h2>Daily challenge</h2>
        </div>
      </div>

      <article className="challenge-card">
        <div className="challenge-top">
          <span className="challenge-label">CHARACTER OF THE DAY</span>
          <span className="challenge-badge">HSK 1</span>
        </div>

        <div className="character-display">好</div>
        <h3>hǎo</h3>
        <p className="character-meaning">good · well</p>

        <div className="character-divider" />

        <div className="character-details">
          <div>
            <span>PINYIN</span>
            <strong>hǎo</strong>
          </div>
          <div>
            <span>STROKES</span>
            <strong>6</strong>
          </div>
          <div>
            <span>RADICAL</span>
            <strong>女</strong>
          </div>
        </div>

        <button className="audio-button" type="button">
          <Volume2 size={17} />
          Listen to pronunciation
        </button>
      </article>

      <article className="quote-card">
        <div className="quote-icon">“</div>
        <p>千里之行，始于足下。</p>
        <span>A journey of a thousand miles begins with a single step.</span>
        <div className="quote-author">— Chinese proverb</div>
      </article>

      <button className="add-goal-button" type="button">
        <Plus size={17} />
        Customize your daily goal
      </button>
    </>
  );
}
