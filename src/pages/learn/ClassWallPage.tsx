import { Link } from 'react-router-dom';

export function ClassWallPage() {
  return (
    <div>
      <div className="mb-10">
        <div className="eyebrow eyebrow-sunshine">Class wall</div>
        <h1 className="hero-display">
          See what your <span className="squiggle-word">friends</span> made.
        </h1>
        <p className="lead-text mt-4">
          Browse projects from your class. Vote with stars. Get inspired.
        </p>
      </div>

      <div className="card-base text-center">
        <span className="sticker-bubblegum">Coming soon</span>
        <h2 className="section-heading mt-6" style={{ fontSize: '24px' }}>
          The wall opens once your teacher launches a class
        </h2>
        <p className="lead-text mt-4 mx-auto" style={{ maxWidth: '500px' }}>
          When projects are shared with the class, they'll show up here for everyone
          enrolled to see, comment on, and remix.
        </p>
        <div className="mt-8 flex gap-3 justify-center flex-wrap">
          <Link to="/learn/missions" className="btn-pill-primary">Browse missions →</Link>
          <Link to="/learn/projects/new" className="btn-pill-secondary">Make something</Link>
        </div>
      </div>
    </div>
  );
}
