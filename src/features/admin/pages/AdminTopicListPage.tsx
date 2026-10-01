import React from 'react';
import { ShieldCheck, Plus, Sparkles } from 'lucide-react';

export const AdminTopicListPage: React.FC = () => {
  return (
    <div className="page-wrapper">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="page-title-row">
            <ShieldCheck className="text-purple-400" size={28} />
            <h1 className="page-title">Quản trị Topic (ADMIN-02)</h1>
          </div>
          <p className="page-subtitle">Thêm, sửa, xóa mềm các chủ đề học</p>
        </div>
        <button type="button" className="btn btn-primary btn-sm">
          <Plus size={16} />
          <span>Thêm Topic mới</span>
        </button>
      </div>

      <div className="table-card">
        <div className="p-8 text-center text-muted">
          Bảng dữ liệu quản trị chủ đề. Sẵn sàng tích hợp API CRUD Admin trong issue ADMIN-02.
        </div>
      </div>

      <div className="alert alert-info mt-6">
        <Sparkles size={18} />
        <span>Layout Admin và phân nhóm Route Admin đã sẵn sàng.</span>
      </div>
    </div>
  );
};
