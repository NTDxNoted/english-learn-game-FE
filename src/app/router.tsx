import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorPage } from '../pages/ErrorPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { TopicListPage } from '../features/topics/pages/TopicListPage';
import { GameSessionPage } from '../features/game/pages/GameSessionPage';
import { ProgressPage } from '../features/progress/pages/ProgressPage';
import { LeaderboardPage } from '../features/leaderboard/pages/LeaderboardPage';
import { AdminTopicListPage } from '../features/admin/pages/AdminTopicListPage';

export const router = createBrowserRouter([
  // Nhóm route có giao diện chung (AppLayout)
  {
    path: '/',
    element: <AppLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      // Learner routes
      {
        path: 'topics',
        element: <TopicListPage />,
      },
      {
        path: 'game/:sessionId',
        element: <GameSessionPage />,
      },
      {
        path: 'progress',
        element: <ProgressPage />,
      },
      {
        path: 'leaderboard',
        element: <LeaderboardPage />,
      },
      // Admin routes
      {
        path: 'admin',
        children: [
          {
            index: true,
            element: <AdminTopicListPage />,
          },
          {
            path: 'topics',
            element: <AdminTopicListPage />,
          },
          {
            path: 'users',
            element: <AdminTopicListPage />,
          },
          {
            path: 'vocabularies',
            element: <AdminTopicListPage />,
          },
          {
            path: 'game-configs',
            element: <AdminTopicListPage />,
          },
        ],
      },
    ],
  },
  // Nhóm route công khai xác thực (Authentication)
  {
    path: '/login',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/forgot-password',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/reset-password',
    element: <LoginPage />,
    errorElement: <ErrorPage />,
  },
  // 404 Fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
