import { BookOpen, ChevronRight, Layers, Play } from "lucide-react";
import { Link } from "react-router";

export function ContinueLearning() {
  return (
    <>
      <div className="section-heading">
        <div>
          <span className="section-kicker">PICK UP WHERE YOU LEFT OFF</span>
          <h2>Continue learning</h2>
        </div>

        <Link className="text-button" to="/library">
          View all <ChevronRight size={16} />
        </Link>
      </div>

      <article className="continue-card">
        <div className="continue-art">
          <span className="art-small">你好</span>
          <span className="art-character">学</span>
          <span className="art-caption">LEARN SOMETHING NEW</span>
        </div>

        <div className="continue-info">
          <div className="lesson-tag">YOUR FIRST LESSON</div>
          <h3>Getting started with Chinese</h3>
          <p>
            Learn the basics of Mandarin, discover Pinyin and meet your first
            Chinese characters.
          </p>

          <div className="lesson-meta">
            <span>
              <BookOpen size={15} /> 5 min
            </span>
            <span>
              <Layers size={15} /> Beginner
            </span>
          </div>

          <Link className="primary-button" to="/library">
            Start learning <Play size={15} fill="currentColor" />
          </Link>
        </div>
      </article>
    </>
  );
}
