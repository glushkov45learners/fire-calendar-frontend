import { createBrowserRouter, Navigate } from 'react-router'
import { ExplorerPage } from '@/pages/explorer'

// One page, as in the design: sections are reached by scrolling, state lives in the query string.
export const router = createBrowserRouter([
  { path: '/', element: <ExplorerPage /> },
  { path: '*', element: <Navigate to="/" replace /> },
])
