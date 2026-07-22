import { useState } from 'react';

interface BriefDialogProps {
  onClose: () => void;
}

const briefs = [
  { id: 'b1', name: 'JRFH-2026', updatedAt: '2026-05-29 19:46', versions: [{ id: 'v3', label: 'v1.2', updatedAt: '2026-05-29 19:52' }, { id: 'v2', label: 'v1.1', updatedAt: '2026-05-29 19:48' }, { id: 'v1', label: 'v1.0', updatedAt: '2026-05-29 19:46' }] },
  { id: 'b2', name: 'A60MAX', updatedAt: '2026-05-29 16:42', versions: [{ id: 'v4', label: 'v1.0', updatedAt: '2026-05-29 16:42' }] },
  { id: 'b3', name: '分层便当盒', updatedAt: '2026-05-28 21:12', versions: [{ id: 'v5', label: 'v1.0', updatedAt: '2026-05-28 21:12' }] },
];

const BriefDialog = ({ onClose }: BriefDialogProps) => {
  const [selectedBrief, setSelectedBrief] = useState(briefs[0].id);
  const [selectedVersion, setSelectedVersion] = useState('v3');
  const currentBrief = briefs.find((item) => item.id === selectedBrief) || briefs[0];

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="brief-title">
      <section className="modal-card brief-modal">
        <header className="modal-head">
          <div><span>Brief 管理</span><h2 id="brief-title">Brief / 版本</h2></div>
          <button aria-label="关闭" onClick={onClose}>✕</button>
        </header>
        <div className="brief-manager-grid">
          <div className="manager-panel">
            <div className="panel-title"><strong>产品 Brief 列表</strong><small>产品型号维度</small></div>
            <label className="search-box"><span>搜索 Brief</span><input placeholder="输入产品型号或名称" /></label>
            <div className="brief-list">
              {briefs.map((brief) => (
                <button key={brief.id} className={brief.id === selectedBrief ? 'brief-row active' : 'brief-row'} onClick={() => { setSelectedBrief(brief.id); setSelectedVersion(brief.versions[0].id); }}>
                  <strong>{brief.name}</strong>
                  <span>{brief.versions.length} 个版本 · {brief.updatedAt}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="manager-panel">
            <div className="panel-title"><strong>Brief 版本列表</strong><small>当前：{currentBrief.name}</small></div>
            <button className="secondary-action">新增版本</button>
            <div className="version-list">
              {currentBrief.versions.map((version) => (
                <button key={version.id} className={version.id === selectedVersion ? 'version-row active' : 'version-row'} onClick={() => setSelectedVersion(version.id)}>
                  <strong>{version.label}</strong>
                  <span>{version.updatedAt}</span>
                </button>
              ))}
            </div>
            <footer className="modal-actions">
              <button onClick={onClose}>取消</button>
              <button className="primary" onClick={onClose}>确定</button>
            </footer>
          </div>
        </div>
      </section>
    </div>
  );
};

export default BriefDialog;
