interface PlaceholderPageProps {
  title: string;
}

export function PlaceholderPage({ title }: PlaceholderPageProps) {
  return (
    <div className="dashboard">
      <section className="welcome-section">
        <div>
          <div className="eyebrow">HANZI LEARNING STUDIO</div>
          <h1>{title}</h1>
          <p className="welcome-description">
            This module is not available yet. Its implementation will come next.
          </p>
        </div>
      </section>
    </div>
  );
}
