import { Sparkles, X, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';

export default function SellingPoints() {
  const [productName, setProductName] = useState('宠鲜鲜智能加热饭盒');
  const [points, setPoints] = useState([
    '20 分钟快速加热，办公室也能吃上热饭',
    '分层防串味设计，主食配菜口感更完整',
    '便携小体积，通勤包也能轻松放下',
  ]);
  const [mainPoint, setMainPoint] = useState('20 分钟快速加热，办公室也能吃上热饭');
  const [subPoints, setSubPoints] = useState<string[]>(['分层防串味设计，主食配菜口感更完整']);
  const [targetGroups, setTargetGroups] = useState(['25-35岁女性', '职场白领']);
  const [otherRequirements, setOtherRequirements] = useState('品牌调性偏真实生活化，不要使用夸张广告词，可参考加班场景。');

  const addPoint = () => {
    setPoints([...points, '']);
  };

  const removePoint = (index: number) => {
    setPoints(points.filter((_, i) => i !== index));
  };

  const updatePoint = (index: number, value: string) => {
    const newPoints = [...points];
    newPoints[index] = value;
    setPoints(newPoints);
  };

  const toggleGroup = (group: string) => {
    setTargetGroups(prev =>
      prev.includes(group) ? prev.filter(g => g !== group) : [...prev, group]
    );
  };

  const toggleSubPoint = (point: string) => {
    setSubPoints(prev =>
      prev.includes(point) ? prev.filter(item => item !== point) : [...prev, point]
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#141414] rounded-xl p-5 border border-[#2a2a2a]">
        <h2 className="text-2xl font-bold text-white">步骤 2：产品卖点输入</h2>
        <p className="text-sm text-gray-500 mt-1">按标准模板补齐产品名称、特色卖点、主卖点、辅助卖点、使用人群和补充要求。</p>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-4">
          <CheckCircle2 className="w-5 h-5 text-[#00d084]" />
          <h3 className="text-lg font-semibold text-white">产品名称</h3>
        </div>
        <input
          type="text"
          className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084]"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          placeholder="请输入本次推广的产品名称"
        />
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[#00d084]" />
          <h3 className="text-lg font-semibold text-white">产品主卖点</h3>
        </div>
        <div className="space-y-3">
          {points.map((point, idx) => {
            const isMain = point === mainPoint;

            return (
              <button
                key={`${point}-${idx}`}
                onClick={() => setMainPoint(point)}
                className={`w-full text-left rounded-lg border p-4 transition-all ${
                  isMain
                    ? 'border-[#00d084] bg-[#00d084]/10'
                    : 'border-[#3a3a3a] bg-[#0a0a0a] hover:border-[#00d084]'
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-white">{point || `卖点 ${idx + 1}`}</div>
                  {isMain && <span className="text-xs px-2 py-1 rounded-full bg-[#00d084] text-black font-medium">当前主卖点</span>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">产品特色卖点（可添加多个）</h3>
        <div className="space-y-3">
          {points.map((point, idx) => (
            <div key={idx} className="flex items-start gap-3 bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg p-4 group">
              <div className="w-6 h-6 rounded-full bg-[#00d084] flex items-center justify-center text-xs font-bold text-black flex-shrink-0 mt-0.5">
                {idx + 1}
              </div>
              <input
                type="text"
                className="flex-1 bg-transparent text-white focus:outline-none"
                value={point}
                onChange={(e) => updatePoint(idx, e.target.value)}
              />
              <button
                onClick={() => removePoint(idx)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-500/20 rounded"
              >
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          ))}
          <button
            onClick={addPoint}
            className="w-full py-3 border-2 border-dashed border-[#3a3a3a] rounded-lg text-gray-500 hover:border-[#00d084] hover:text-[#00d084] transition-all"
          >
            + 添加卖点
          </button>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">产品辅助卖点</h3>
        <div className="space-y-3">
          {points.map((point, idx) => (
            <button
              key={`sub-${idx}`}
              onClick={() => toggleSubPoint(point)}
              className={`w-full text-left rounded-lg border p-4 transition-all ${
                subPoints.includes(point)
                  ? 'border-[#00d084] bg-[#00d084]/10'
                  : 'border-[#3a3a3a] bg-[#0a0a0a] hover:border-[#00d084]'
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <span className="text-white">{point || `卖点 ${idx + 1}`}</span>
                {subPoints.includes(point) && <span className="text-xs text-[#00d084]">已加入辅助卖点</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">目标用户人群</h3>
        <div className="grid grid-cols-3 gap-3">
          {['25-35岁女性', '职场白领', '通勤上班族', '精致妈妈', '学生党', '晚归加班人群'].map((group) => (
            <button
              key={group}
              onClick={() => toggleGroup(group)}
              className={`px-4 py-3 rounded-lg border transition-all ${
                targetGroups.includes(group)
                  ? 'bg-[#00d084] border-[#00d084] text-black font-medium'
                  : 'bg-[#2a2a2a] border-[#3a3a3a] text-gray-400 hover:border-[#00d084] hover:text-white'
              }`}
            >
              {group}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
        <h3 className="text-lg font-semibold text-white mb-4">其他要求</h3>
        <textarea
          className="w-full bg-[#0a0a0a] border border-[#3a3a3a] rounded-lg p-4 text-white placeholder-gray-600 focus:outline-none focus:border-[#00d084] resize-none"
          rows={4}
          value={otherRequirements}
          onChange={(e) => setOtherRequirements(e.target.value)}
          placeholder="填写品牌调性、禁忌词、参考素材等补充说明"
        />
      </div>

      <div className="bg-[#141414] rounded-xl p-5 border border-[#2a2a2a]">
        <h3 className="text-white font-semibold mb-3">Brief 预览</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">产品名称</div>
            <div className="text-white">{productName || '未填写'}</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">主卖点</div>
            <div className="text-white">{mainPoint || '未选择'}</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">辅助卖点</div>
            <div className="text-white">{subPoints.length > 0 ? subPoints.join(' / ') : '未选择'}</div>
          </div>
          <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a]">
            <div className="text-gray-500 mb-1">目标人群</div>
            <div className="text-white">{targetGroups.length > 0 ? targetGroups.join(' / ') : '未选择'}</div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          保存草稿
        </button>
        <button className="px-6 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
          AI 优化 Brief
        </button>
        <button className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-all">
          下一步：内容来源选择
        </button>
      </div>
    </div>
  );
}
