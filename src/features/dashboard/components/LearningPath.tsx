import { ChevronRight, Layers, PenLine, Volume2 } from "lucide-react";
import { Link } from "react-router";

const learningModules = [
  {
    title: "Writing",
    description: "Practice Chinese characters",
    path: "/writing",
    icon: PenLine,
    iconClass: "writing-icon",
  },
  {
    title: "Speaking",
    description: "Train pronunciation and tones",
    path: "/speaking",
    icon: Volume2,
    iconClass: "speaking-icon",
  },
  {
    title: "Flashcards",
    description: "Remember words for longer",
    path: "/flashcards",
    icon: Layers,
    iconClass: "flashcard-icon",
  },
];

export function LearningPath() {
  return (
    <>
      <div className="section-heading activity-heading">
        <div>
          <span className="section-kicker">BUILD YOUR ROUTINE</span>
          <h2>Your learning path</h2>
        </div>
      </div>

      <div className="learning-path">
        {learningModules.map(
          ({ title, description, path, icon: Icon, iconClass }) => (
            <Link className="path-card" key={path} to={path}>
              <div className={`path-icon ${iconClass}`}>
                <Icon size={21} />
              </div>

              <div className="path-copy">
                <strong>{title}</strong>
                <span>{description}</span>
              </div>

              <ChevronRight size={18} />
            </Link>
          ),
        )}
      </div>
    </>
  );
}
