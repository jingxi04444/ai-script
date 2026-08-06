import { CalendarOutlined, RocketOutlined } from '@ant-design/icons';
import './development-panel.css';

interface DevelopmentPanelProps {
  featureName: string;
}

const DevelopmentPanel = ({ featureName }: DevelopmentPanelProps) => (
  <section className="development-panel" aria-labelledby="development-panel-title">
    <div className="development-panel-glow" aria-hidden="true" />
    <div className="development-panel-content">
      <span className="development-panel-icon" aria-hidden="true">
        <RocketOutlined />
      </span>
      <span className="development-panel-badge">敬请期待</span>
      <h2 id="development-panel-title">正在开发中</h2>
      <p>{featureName}功能正在加速建设，完成后将在这里开放使用。</p>
      <div className="development-panel-date">
        <CalendarOutlined />
        <span>预计 9 月中旬上线</span>
      </div>
    </div>
  </section>
);

export default DevelopmentPanel;
