import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardCheck, UploadCloud } from 'lucide-react';
import { PageHeader } from '../../components/common/AdminUI';
import ImportTemplatesPage from '../Materials/ImportTemplatesPage';
import PromptTemplatesPage from '../Materials/PromptTemplatesPage';
import './brief-management-page.css';

type BriefManagementTab = 'detection' | 'import';

const briefTabs = [
  {
    key: 'detection' as const,
    label: 'Brief 检测提示词',
    description: '维护检测使用的提示词和返回结构',
    icon: ClipboardCheck,
  },
  {
    key: 'import' as const,
    label: '卖点 Brief 导入模板',
    description: '维护批量导入时下载的模板文件',
    icon: UploadCloud,
  },
];

const BriefManagementPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get('tab');
  const initialTab: BriefManagementTab = requestedTab === 'import' ? 'import' : 'detection';
  const [activeTab, setActiveTab] = useState<BriefManagementTab>(initialTab);

  return (
    <div className="page-stack brief-management-page">
      <PageHeader
        title="卖点 Brief 管理"
        description="集中维护 Brief 检测提示词和卖点 Brief 批量导入模板。"
      />

      <div className="brief-management-tabs" role="tablist" aria-label="卖点 Brief 管理分类">
        {briefTabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              className={`brief-management-tab${activeTab === tab.key ? ' active' : ''}`}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearchParams(tab.key === 'detection' ? {} : { tab: tab.key }, { replace: true });
              }}
            >
              <Icon size={19} />
              <span>
                <strong>{tab.label}</strong>
                <small>{tab.description}</small>
              </span>
            </button>
          );
        })}
      </div>

      <section className="brief-management-content">
        {activeTab === 'detection'
          ? <PromptTemplatesPage briefMode embedded />
          : <ImportTemplatesPage briefMode embedded />}
      </section>
    </div>
  );
};

export default BriefManagementPage;
