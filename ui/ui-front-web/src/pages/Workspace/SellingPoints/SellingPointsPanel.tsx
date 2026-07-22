interface SellingPointsPanelProps {
  onBrief: () => void;
  onUpload: () => void;
}

const SellingPointsPanel = ({ onBrief, onUpload }: SellingPointsPanelProps) => {
  return (
    <div className="brief-page creation-brief-page">
      <section className="brief-info-card">
        <div className="brief-small-fields">
          <Field label="产品价格" placeholder="产品的大致价格" />
          <Field label="产品slogan" placeholder="一句话描述产品的定位" />
        </div>
        <label className="audience-field">
          <span>目标人群</span>
          <textarea placeholder="可以按照1，2，3，4分点去写目标人群。写的越准确，创作的越精准" maxLength={500} />
          <em>0/500</em>
        </label>
      </section>

      <section className="selling-paste-card">
        <div className="selling-grid">
          <SellingTextarea title="产品特色卖点" placeholder="请粘贴产品与竞品有区别的点，必提的特色点" />
          <SellingTextarea title="产品主要卖点" placeholder="请粘贴产品的主要卖点，按照1.2.3.4等分点去写" />
          <SellingTextarea title="产品次要卖点" placeholder="请粘贴产品的次要卖点，按照1.2.3.4等分点去写" />
        </div>
        <button className="brief-check-button" onClick={onUpload}><span>▣</span>Brief 检测</button>
      </section>
    </div>
  );
};

function Field({ label, placeholder }: { label: string; placeholder?: string }) {
  return <label className="field-box"><span>{label}</span><input placeholder={placeholder} /></label>;
}

function SellingTextarea({ title, placeholder }: { title: string; placeholder: string }) {
  return (
    <label className="selling-textarea">
      <span>{title}</span>
      <textarea placeholder={placeholder} maxLength={10000} />
      <em>0/10000</em>
    </label>
  );
}

export default SellingPointsPanel;
