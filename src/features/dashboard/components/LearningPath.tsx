import { ChevronRight, Layers, PenLine, Volume2 } from "lucide-react";
import { Link } from "react-router";
import shared from "./DashboardShared.module.css";
import styles from "./LearningPath.module.css";

const learningModules = [
  {
    title: "Writing",
    description: "Practice Chinese characters",
    path: "/writing",
    icon: PenLine,
    iconClass: styles.writingIcon,
  },
  {
    title: "Speaking",
    description: "Train pronunciation and tones",
    path: "/speaking",
    icon: Volume2,
    iconClass: styles.speakingIcon,
  },
  {
    title: "Flashcards",
    description: "Remember words for longer",
    path: "/flashcards",
    icon: Layers,
    iconClass: styles.flashcardIcon,
  },
];

export function LearningPath() {
  return (
    <>
      <div className={`${shared.sectionHeading} ${shared.activityHeading}`}>
        <div>
          <span className={shared.sectionKicker}>BUILD YOUR ROUTINE</span>
          <h2>Your learning path</h2>
        </div>
      </div>

      <div className={styles.learningPath}>
        {learningModules.map(
          ({ title, description, path, icon: Icon, iconClass }) => (
            <Link className={styles.pathCard} key={path} to={path}>
              <div className={`${styles.pathIcon} ${iconClass}`}>
                <Icon size={21} />
              </div>

              <div className={styles.pathCopy}>
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
