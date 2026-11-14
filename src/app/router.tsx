import { createBrowserRouter, Navigate } from 'react-router'
import { HomePage } from '@/pages/home'
import { RouteError } from './error-boundary'

// One page, as in the design. The old /explorer and /about, and anything else, lead back to it.
export const router = createBrowserRouter([
  { path: '/', element: <HomePage />, errorElement: <RouteError /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
