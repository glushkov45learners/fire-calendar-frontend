import { createBrowserRouter } from 'react-router'
import { AboutPage } from '@/pages/about'
import { ExplorerPage } from '@/pages/explorer'
import { HomePage } from '@/pages/home'
import { Layout } from './layout'

export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/explorer', element: <ExplorerPage /> },
      { path: '/about', element: <AboutPage /> },
    ],
  },
])
