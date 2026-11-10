import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { ErrorPage } from '../pages/ErrorPage';
import { LoginPage } from '../features/auth/pages/LoginPage';
import { RegisterPage } from '../features/auth/pages/RegisterPage';
import { VerifyRegisterPage } from '../features/auth/pages/VerifyRegisterPage';
import { ForgotPasswordPage } from '../features/auth/pages/ForgotPasswordPage';
import { ResetPasswordPage } from '../features/auth/pages/ResetPasswordPage';
import { ProtectedRoute } from '../features/auth/components/ProtectedRoute';
import { TopicListPage } from '../features/topics/pages/TopicListPage';
import { TopicLearningPage } from '../features/topics/pages/TopicLearningPage';
import { GameSessionPage } from '../features/game/pages/GameSessionPage';
import { ProgressPage } from '../features/progress/pages/ProgressPage';
import { LeaderboardPage } from '../features/leaderboard/pages/LeaderboardPage';
import { AdminGuard } from '../features/admin/components/AdminGuard';
import { AdminLayout } from '../features/admin/components/AdminLayout';
import { TopicList } from '../features/admin/pages/TopicList';
import { VocabularyList } from '../features/admin/pages/VocabularyList';
import { ConfigPage } from '../features/admin/pages/ConfigPage';
import { UserList } from '../features/admin/pages/UserList';
import { AuditList } from '../features/admin/pages/AuditList';

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
      // Learner routes (Được bảo vệ bởi ProtectedRoute)
      {
        path: 'topics',
        element: (
          <ProtectedRoute>
            <TopicListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'topics/:topicId/learn',
        element: (
          <ProtectedRoute>
            <TopicLearningPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'game/:sessionId',
        element: (
          <ProtectedRoute>
            <GameSessionPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'progress',
        element: (
          <ProtectedRoute>
            <ProgressPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'leaderboard',
        element: (
          <ProtectedRoute>
            <LeaderboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: <AdminGuard><AdminLayout /></AdminGuard>,
        children: [
          { index: true, element: <Navigate to="topics" replace /> },
          { path: 'topics', element: <TopicList /> },
          { path: 'topics/:topicId/vocabularies', element: <VocabularyList /> },
          { path: 'topics/:topicId/game-configs', element: <ConfigPage /> },
          { path: 'users', element: <UserList /> },
          { path: 'vocabularies', element: <Navigate to="/admin/topics" replace /> },
          { path: 'game-configs', element: <Navigate to="/admin/game-configs/global" replace /> },
          { path: 'game-configs/global', element: <ConfigPage /> },
          { path: 'game-configs/audits', element: <AuditList /> },
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
