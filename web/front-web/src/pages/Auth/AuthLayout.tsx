import { CheckCircleFilled, VideoCameraAddOutlined } from '@ant-design/icons';
import type { ReactNode } from 'react';

interface AuthLayoutProps {
  children: ReactNode;
}

const AuthLayout = ({ children }: AuthLayoutProps) => (
  <main className="auth-app-shell">
    <section className="auth-brand-panel" aria-label="AI Script 产品介绍">
      <div className="auth-brand-content">
        <div className="auth-brand-lockup">
          <span className="auth-logo-mark"><VideoCameraAddOutlined /></span>
          <div>
            <strong>AI Script</strong>
            <small>商业短视频创作平台</small>
          </div>
        </div>
        <div className="auth-brand-message">
          <p>AI SCRIPT WORKBENCH</p>
          <h1>让每一个好产品<br />都有好内容表达</h1>
          <span>从产品 Brief 到脚本、分镜与成片，把商业短视频创作装进一个工作台。</span>
        </div>
        <ul>
          <li><CheckCircleFilled /><span>智能提炼产品卖点，快速建立内容策略</span></li>
          <li><CheckCircleFilled /><span>脚本、分镜、素材和版本统一沉淀</span></li>
          <li><CheckCircleFilled /><span>会员权益与项目数据安全跟随账号</span></li>
        </ul>
      </div>
      <p className="auth-brand-foot">AI 驱动 · 专业创作 · 高效协同</p>
    </section>
    <section className="auth-form-panel">
      {children}
      <p className="auth-copyright">© 2026 AI Script. All Rights Reserved.</p>
    </section>
  </main>
);

export default AuthLayout;
