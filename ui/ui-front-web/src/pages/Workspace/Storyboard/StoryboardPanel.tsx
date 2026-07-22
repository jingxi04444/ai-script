import { useState } from 'react';
import { SearchOutlined, ReloadOutlined, FileTextOutlined, ClockCircleOutlined, EyeOutlined, EditOutlined, CopyOutlined, MoreOutlined, PlusOutlined, UnorderedListOutlined, AppstoreOutlined } from '@ant-design/icons';
import { Select } from 'antd';

const scriptCategories = ['我的脚本', '以产品维度的脚本', '爆款复刻脚本', '平台模板库脚本', 'AI 原创脚本'];
const scriptLibraryItems = [
  { id: 'script-1', name: '爆款复刻脚本_2026-05-30', type: '爆款复刻脚本', typeTone: 'viral', updatedAt: '2026-05-30 23:51:10', status: '已完成', statusTone: 'done' },
  { id: 'script-2', name: '模板脚本_2026-05-30 23:47:37', type: '平台模板脚本', typeTone: 'template', updatedAt: '2026-05-30 22:47:37', status: '待润色', statusTone: 'pending' },
  { id: 'script-3', name: 'AI原创脚本_2026-05-30 23:47:37', type: 'AI原创脚本', typeTone: 'original', updatedAt: '2026-05-30 22:47:37', status: '草稿', statusTone: 'draft' },
];

const StoryboardPanel = () => {
  const [activeCategory, setActiveCategory] = useState(scriptCategories[0]);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');

  return (
    <section className="storyboard-polish-page">
      <nav className="storyboard-script-tabs" aria-label="脚本分类">
        {scriptCategories.map((item) => (
          <button key={item} className={item === activeCategory ? 'active' : ''} onClick={() => setActiveCategory(item)}>{item}</button>
        ))}
      </nav>

      <section className="storyboard-library-summary">
        <div><h2>{activeCategory}</h2><p>{activeCategory}共 3 篇，按更新时间倒序展示。</p></div>
        <div className="storyboard-summary-actions">
          <span>3 篇脚本</span>
          <div className="storyboard-view-toggle">
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')}><UnorderedListOutlined />列表</button>
            <button className={viewMode === 'card' ? 'active' : ''} onClick={() => setViewMode('card')}><AppstoreOutlined />卡片</button>
          </div>
        </div>
      </section>

      <section className="storyboard-filter-panel">
        <label className="storyboard-search"><SearchOutlined /><input placeholder="搜索脚本名称" /></label>
        <label className="storyboard-select"><span>脚本类型</span><Select defaultValue="all" suffixIcon={<span style={{fontSize:10}}>▼</span>} options={[{ value: 'all', label: '全部类型' }, { value: 'viral', label: '爆款复刻脚本' }, { value: 'template', label: '平台模板脚本' }, { value: 'original', label: 'AI原创脚本' }]} /></label>
        <label className="storyboard-select"><span>状态</span><Select defaultValue="all" suffixIcon={<span style={{fontSize:10}}>▼</span>} options={[{ value: 'all', label: '全部状态' }, { value: 'done', label: '已完成' }, { value: 'pending', label: '待润色' }, { value: 'draft', label: '草稿' }]} /></label>
        <button className="storyboard-reset-button"><ReloadOutlined />重置</button>
      </section>

      <section className="storyboard-library-panel">
        <div className="storyboard-table-view">
          <div className="storyboard-table-head">
            <span>脚本名称</span><span>脚本类型</span><span>更新时间</span><span>状态</span><span>操作</span>
          </div>
          {scriptLibraryItems.map((item) => (
            <article className="storyboard-table-row" key={item.id}>
              <strong><FileTextOutlined />{item.name}</strong>
              <em className={`script-type ${item.typeTone}`}>{item.type}</em>
              <time>{item.updatedAt}</time>
              <i className={`script-status ${item.statusTone}`}>{item.status}</i>
              <div className="storyboard-row-actions">
                <button><EyeOutlined />预览</button>
                <button><EditOutlined />继续润色</button>
                <button><CopyOutlined />复制</button>
                <button><MoreOutlined />更多</button>
              </div>
            </article>
          ))}
        </div>
        <footer className="storyboard-pagination">
          <span>共 3 条</span>
          <div>
            <button>‹</button>
            <button className="active">1</button>
            <button>›</button>
          </div>
        </footer>
      </section>

      <p className="storyboard-tip">小贴士：完善脚本内容并润色，可获得更高质量的分镜和视频效果</p>
    </section>
  );
};

export default StoryboardPanel;
