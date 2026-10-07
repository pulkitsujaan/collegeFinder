import { lazy } from 'react';
import { Route, Routes } from 'react-router-dom';

import SiteLayout from './components/layout/SiteLayout.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const Colleges = lazy(() => import('./pages/Colleges.jsx'));
const CollegeDetail = lazy(() => import('./pages/CollegeDetail.jsx'));
const Compare = lazy(() => import('./pages/Compare.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const ExamDetail = lazy(() => import('./pages/ExamDetail.jsx'));
const Rankings = lazy(() => import('./pages/Rankings.jsx'));
const Login = lazy(() => import('./pages/Login.jsx'));
const NotFound = lazy(() => import('./pages/NotFound.jsx'));

/** Every route is code-split; SiteLayout holds the one Suspense boundary. */
export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<SiteLayout />}>
        <Route index element={<Home />} />
        <Route path="colleges" element={<Colleges />} />
        <Route path="college/:slug" element={<CollegeDetail />} />
        <Route path="compare" element={<Compare />} />
        <Route path="exams" element={<Exams />} />
        <Route path="exams/:slug" element={<ExamDetail />} />
        <Route path="rankings" element={<Rankings />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
