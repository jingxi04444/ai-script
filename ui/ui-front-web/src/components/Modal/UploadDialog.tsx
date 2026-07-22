interface UploadDialogProps {
  onClose: () => void;
}

const UploadDialog = ({ onClose }: UploadDialogProps) => {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="upload-title">
      <section className="modal-card upload-modal">
        <header className="modal-head">
          <div><span>File Upload</span><h2 id="upload-title">导入卖点表格</h2></div>
          <button aria-label="关闭" onClick={onClose}>✕</button>
        </header>
        <p className="modal-copy">选择包含产品型号、价格、产品 slogan、特色卖点、主卖点、辅助卖点、目标人群、目标场景的 xlsx/csv 文件。</p>
        <div className="template-callout">
          <div><strong>卖点导入模板</strong><span>产品型号相同会新增版本，不存在则新建 Brief v1.0。</span></div>
          <button>下载模板</button>
        </div>
        <label className="file-drop">
          <input type="file" />
          <strong>点击选择文件</strong>
          <span>支持格式：.xlsx, .xls, .csv</span>
        </label>
        <footer className="modal-actions">
          <button onClick={onClose}>取消</button>
          <button className="primary" onClick={onClose}>确认导入</button>
        </footer>
      </section>
    </div>
  );
};

export default UploadDialog;
