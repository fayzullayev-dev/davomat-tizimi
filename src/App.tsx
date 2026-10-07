import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from './context/AuthContext';
import type { Permission } from './utils/permissions';
import { AppLayout } from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TeacherAttendancePage from './pages/TeacherAttendancePage';
import StudentAttendancePage from './pages/StudentAttendancePage';
import TeachersPage from './pages/TeachersPage';
import StudentsPage from './pages/StudentsPage';
import TeacherFormPage from './pages/TeacherFormPage';
import StudentFormPage from './pages/StudentFormPage';
import ProfilePage from './pages/ProfilePage';
import StructurePage from './pages/StructurePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { ForbiddenPage, NotFoundPage } from './pages/StatusPages';

function RequirePerm({ perm, children }: { perm: Permission; children: ReactNode }) {
  const { can } = useAuth();
  return can(perm) ? <>{children}</> : <ForbiddenPage />;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/kirish" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="oqituvchilar-davomati" element={<TeacherAttendancePage />} />
        <Route path="talabalar-davomati" element={<StudentAttendancePage />} />
        <Route path="oqituvchilar" element={<TeachersPage />} />
        <Route path="oqituvchilar/qoshish" element={<RequirePerm perm="manage"><TeacherFormPage /></RequirePerm>} />
        <Route path="oqituvchilar/:id/tahrirlash" element={<RequirePerm perm="manage"><TeacherFormPage /></RequirePerm>} />
        <Route path="oqituvchilar/:id" element={<ProfilePage type="teacher" />} />
        <Route path="talabalar" element={<StudentsPage />} />
        <Route path="talabalar/qoshish" element={<RequirePerm perm="manage"><StudentFormPage /></RequirePerm>} />
        <Route path="talabalar/:id/tahrirlash" element={<RequirePerm perm="manage"><StudentFormPage /></RequirePerm>} />
        <Route path="talabalar/:id" element={<ProfilePage type="student" />} />
        <Route path="tuzilma" element={<StructurePage />} />
        <Route path="hisobotlar" element={<ReportsPage />} />
        <Route path="sozlamalar" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
