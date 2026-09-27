import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppLayout from './components/layout/AppLayout';
import BootGate from './components/BootGate';
import { useProjects } from './hooks/projects';
import { useMediaLibrary } from './hooks/media';

import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import MediaLibrary from './pages/MediaLibrary';
import Search from './pages/Search';
import NeedsReview from './pages/NeedsReview';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      // BootGate holds the first paint until the two blocking queries settle,
      // so there is no point caching them beyond the session defaults.
      staleTime: 2_000,
    },
  },
});

function Shell() {
  // Both of these are needed by the navigation rail and the status strip, so
  // gating the boot on them guarantees no reflow once the shell appears.
  const projects = useProjects();
  const media = useMediaLibrary();
  const ready = !projects.isLoading && !media.isLoading;

  return (
    <BootGate ready={ready}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:projectId" element={<ProjectDetail />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/search" element={<Search />} />
          <Route path="/review" element={<NeedsReview />} />
          <Route path="/reports" element={<Reports />} />
          {/* Unknown paths get a real 404 view rather than a silent redirect,
              which previously hid broken links and mistyped URLs. */}
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BootGate>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
