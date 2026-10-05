import { Link, Outlet } from '@tanstack/react-router';
import { SHOWCASE_COMPONENTS } from '../showcase.data';
import './showcase-layout.css';

export function ShowcaseLayout() {
  return (
    <div className="showcase-layout">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__logo">◆</span>
          LumenUI
        </div>
        <nav className="sidebar__nav">
          <p className="sidebar__heading">Components</p>
          {SHOWCASE_COMPONENTS.map((c) => (
            <Link
              key={c.path}
              to={`/${c.path}`}
              className="sidebar__link"
              activeProps={{ className: 'sidebar__link--active' }}
            >
              {c.name}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
