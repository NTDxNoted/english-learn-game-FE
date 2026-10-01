import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorPage } from '../pages/ErrorPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyRegisterPage } from '../features/auth/pages/VerifyRegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { TopicListPage } from '../features/topics/pages/TopicListPage';
import { GameSessionPage } from '../features/game/pages/GameSessionPage';
import { ProgressPage } from '../features/progress/pages/ProgressPage';
import { LeaderboardPage } from '../features/leaderboard/pages/LeaderboardPage';
import { AdminTopicListPage } from '../features/admin/pages/AdminTopicListPage';

export const router = createBrowserRouter([
  // Nhóm route có giao diện chính (AppLayout)
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
  // Nhóm route công khai xác thực (AWS Cognito flow)
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
    path: '/verify-register',
    element: <VerifyRegisterPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPasswordPage />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
    errorElement: <ErrorPage />,
  },
  // 404 Fallback
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
