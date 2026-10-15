import React from 'react';
import { CircleCheck } from 'lucide-react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ToastContainer } from '../common/Toast';

const CURRENT_YEAR = new Date().getFullYear();

export const AppLayout: React.FC = () => {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      <main id="main-content" className="app-main-content" tabIndex={-1}>
        <div className="content-container">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">
        <div className="footer-container">
          <p>
            © {CURRENT_YEAR} Signly — Học tiếng Anh bằng đôi tay. Tương tác cử chỉ MediaPipe &amp; AWS Cloud.
          </p>
          <div className="ui-footer-status"><CircleCheck size={16} aria-hidden="true" /><span>Signly · Học từ vựng qua tương tác</span>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
};
