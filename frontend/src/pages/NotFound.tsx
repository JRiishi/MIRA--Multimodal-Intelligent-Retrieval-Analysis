import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { navigation } from '../components/layout/navigation';

export default function NotFound() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="panel w-full max-w-md p-8 text-center">
        <div className="w-10 h-10 border border-line rounded-[var(--radius-control)] flex items-center justify-center mx-auto mb-4">
          <Compass className="w-4 h-4 text-ink-3" aria-hidden="true" />
        </div>
        <p className="value text-[11px] text-ink-3">error 404</p>
        <h1 className="text-[19px] font-semibold text-ink mt-1.5">No such view</h1>
        <p className="text-[13px] text-ink-2 mt-2 leading-relaxed">
          The address does not match any screen in MIRA. It may have been renamed, or the link that
          brought you here is out of date.
        </p>

        <nav aria-label="Available views" className="mt-6">
          <ul className="grid grid-cols-2 gap-1.5">
            {navigation.map((item) => (
              <li key={item.to}>
                <Link
                  to={item.to}
                  className="flex items-center gap-2 px-2.5 py-2 text-[12.5px] text-ink-2 border border-line rounded-[var(--radius-control)] hover:border-brand-300 hover:text-brand-700 transition-colors"
                >
                  <item.icon className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link to="/dashboard" className="btn btn-primary mt-5">
          Back to overview
        </Link>
      </div>
    </div>
  );
}
