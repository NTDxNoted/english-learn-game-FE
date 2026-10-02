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
          <p>
            © {CURRENT_YEAR} Signly — Học tiếng Anh bằng đôi tay. Tương tác cử chỉ MediaPipe &amp; AWS Cloud.
          </p>
          <div className="flex items-center gap-2">
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#322c82' }}>
              Signly V1.0 (Design System Active)
            </span>
          </div>
        </div>
      </footer>
      <ToastContainer />
    </div>
  );
};
