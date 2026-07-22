import { AlertCircle, CheckCircle2, ClipboardCheck, ShieldAlert } from 'lucide-react';
import { EmptyState, PageHeader, SectionCard, StatusBadge } from '../../components/common/AdminUI';

const reviewSteps = [
  { icon: <ClipboardCheck size={18} />, title: '脚本审核', desc: '合规词、夸大承诺和敏感表述。', tone: 'blue' as const },
  { icon: <ShieldAlert size={18} />, title: '素材审核', desc: '素材版权、品牌风险和违规元素。', tone: 'orange' as const },
  { icon: <CheckCircle2 size={18} />, title: '人工复核', desc: '对高风险内容做最后确认。', tone: 'green' as const },
];

const ReviewPage = () => {
  return (
    <div className="page-stack">
      <PageHeader title="内容审核" description="当前暂无专门审核任务接口，先提供结构化空态和流程说明。" />

      <div className="stat-grid">
        {reviewSteps.map((step) => (
          <div className="stat-card" key={step.title}>
            <div className="stat-icon">{step.icon}</div>
            <div>
              <p>{step.title}</p>
              <strong style={{ fontSize: 18 }}>{step.desc}</strong>
              <em>审核流程说明</em>
            </div>
          </div>
        ))}
      </div>

      <SectionCard title="审核队列" description="后端暂未提供列表接口，这里仅保留页面结构。" action={<StatusBadge tone="orange">空态</StatusBadge>}>
        <EmptyState
          title="暂无审核任务"
          description="当后端接入审核任务、审核记录或规则库后，可在此页面展示列表、审批和批量操作。"
          icon={<AlertCircle size={22} />}
        />
      </SectionCard>
    </div>
  );
};

export default ReviewPage;
