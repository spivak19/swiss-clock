import { Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navigation } from './components/Navigation';
import { AttendancePage } from './pages/AttendancePage';
import { HistoryPage } from './pages/HistoryPage';
import { StatisticsPage } from './pages/StatisticsPage';

export function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <Navigation />

        {/* Main content: offset by sidebar on desktop, add bottom padding for mobile nav */}
        <main className="md:ml-56 pb-20 md:pb-8 px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto">
            <Routes>
              <Route path="/" element={<AttendancePage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/statistics" element={<StatisticsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </ThemeProvider>
  );
}
