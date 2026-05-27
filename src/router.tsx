import { createBrowserRouter, Navigate } from 'react-router-dom'
import RootLayout from '@/layouts/RootLayout'
import AppLayout from '@/layouts/AppLayout'
import { AuthGuard } from '@/components/AuthGuard'
import LoginPage from '@/pages/LoginPage'
import RegisterPage from '@/pages/RegisterPage'
import ResetPasswordPage from '@/pages/ResetPasswordPage'
import BookshelfPage from '@/pages/BookshelfPage'
import BookDetailPage from '@/pages/BookDetailPage'
import AddBookPage from '@/pages/AddBookPage'
import SettingsPage from '@/pages/SettingsPage'
import AuthorManagePage from '@/pages/AuthorManagePage'
import AuthorDetailPage from '@/pages/AuthorDetailPage'

const appChildren = [
  { path: '/', element: <Navigate to="/books" replace /> },
  { path: '/books', element: <BookshelfPage /> },
  { path: '/books/:id', element: <BookDetailPage /> },
  { path: '/books/add', element: <AddBookPage /> },
  { path: '/settings', element: <SettingsPage /> },
  { path: '/settings/authors', element: <AuthorManagePage /> },
  { path: '/settings/authors/:id', element: <AuthorDetailPage /> },
]

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/reset-password', element: <ResetPasswordPage /> },
    ],
  },
  {
    element: (
      <AuthGuard>
        <AppLayout />
      </AuthGuard>
    ),
    children: appChildren,
  },
])
