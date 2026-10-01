import React from 'react';
import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { ToastContainer } from '../common/Toast';

const CURRENT_YEAR = new Date().getFullYear();

export const AppLayout: React.FC = () => {
  return (
    <div className="app-shell">
      <Header />
      <main className="app-main-content">
        <div className="content-container">
          <Outlet />
        </div>
      </main>
      <footer className="app-footer">
        <div className="footer-container">
          <p className="footer-copyright">
            © {CURRENT_YEAR} English Learning Game. Lớp học tiếng Anh tương tác nhận diện
            cử chỉ tay &amp; chuột.
          </p>
          <div className="footer-meta">
            <span className="api-status-dot online" />
            <span className="api-status-text">Client V1.0.0</span>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
};
