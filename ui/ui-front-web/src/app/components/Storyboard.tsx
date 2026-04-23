import { Plus, Edit, AlertCircle, History, RefreshCcw, ShieldAlert } from 'lucide-react';

export default function Storyboard() {
  const scenes = [
    {
      id: 1,
      title: '镜号01',
      shotType: '特写',
      description: '女主皱眉看着冷掉的午饭盒，桌上堆着加班文件，强化“吃不上热饭”的痛点场景。',
      dialogue: '加班到晚上，想吃一口热饭怎么就这么难？',
      duration: '3秒',
      location: '办公室工位',
      time: '夜晚',
      props: '冷饭盒、电脑、文件',
      note: '铺垫痛点，为产品出场做准备',
      warningWords: ['最'],
      hasWarning: true,
    },
    {
      id: 2,
      title: '镜号02',
      shotType: '中景',
      description: '镜头切到加热饭盒开启工作，蒸汽升起，20 分钟快速加热的过程用屏幕字幕强化。',
      dialogue: '这个便携加热饭盒，插电 20 分钟就能吃上热饭。',
      duration: '4秒',
      location: '办公桌近景',
      time: '夜晚',
      props: '加热饭盒、勺子、便当',
      note: '核心卖点直出，完成第一轮产品解决方案植入',
      warningWords: [],
      hasWarning: false,
    },
    {
      id: 3,
      title: '镜号03',
      shotType: '近景',
      description: '打开饭盒展示分层餐盒，米饭和配菜没有串味，人物吃下第一口后表情放松。',
      dialogue: '分层不串味，忙一天也能认真吃顿热乎的。',
      duration: '3秒',
      location: '办公桌近景',
      time: '夜晚',
      props: '分层饭盒、筷子、饭菜',
      note: '自然穿插辅助卖点，提高可信度和代入感',
      warningWords: [],
      hasWarning: false,
    },
  ];

  const versions = [
    { id: 'v3', label: '当前版本 v3', time: '今天 14:20', note: '根据加班场景重新强化开头痛点' },
    { id: 'v2', label: '历史版本 v2', time: '今天 11:10', note: '加入产品便携性表达' },
    { id: 'v1', label: '初始版本 v1', time: '今天 09:40', note: 'AI 初稿' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">步骤 4：分镜脚本生成与审核</h2>
          <p className="text-sm text-gray-500 mt-1">已生成 {scenes.length} 个分镜 · 当前处于待审核区，可继续编辑、合规检查与回看版本。</p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
            <RefreshCcw className="w-4 h-4" />
            重新生成
          </button>
          <button className="px-4 py-2 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all flex items-center gap-2">
            <Plus className="w-4 h-4" />
            添加分镜
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1e1e1e] rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-sm text-gray-500 mb-2">脚本状态</div>
          <div className="text-white font-semibold">待审核</div>
          <p className="text-xs text-gray-500 mt-2">AI 初稿已生成，支持在线修改后再提交审核。</p>
        </div>
        <div className="bg-[#1e1e1e] rounded-xl p-5 border border-orange-500/30">
          <div className="text-sm text-gray-500 mb-2">合规性检查</div>
          <div className="text-orange-400 font-semibold">发现 1 处违禁词风险</div>
          <p className="text-xs text-gray-500 mt-2">建议将“最温馨”替换为“更有温度”或“更适合加班场景”。</p>
        </div>
        <div className="bg-[#1e1e1e] rounded-xl p-5 border border-[#2a2a2a]">
          <div className="text-sm text-gray-500 mb-2">原创度检测</div>
          <div className="text-white font-semibold">相似度 38%</div>
          <p className="text-xs text-gray-500 mt-2">低于 60% 风险阈值，可继续人工优化后提交审核。</p>
        </div>
      </div>

      <div className="bg-[#1e1e1e] rounded-xl border border-[#2a2a2a] overflow-hidden">
        <div className="px-6 py-4 border-b border-[#2a2a2a] flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">待审核区</h3>
            <p className="text-sm text-gray-500 mt-1">按需求文档中的分镜表结构展示镜号、景别、画面描述、台词、时长和卖点植入说明。</p>
          </div>
          <button className="px-4 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2 text-sm">
            <ShieldAlert className="w-4 h-4" />
            运行合规检查
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-[#161616]">
              <tr className="text-left text-gray-500">
                <th className="px-6 py-4 font-medium">镜号</th>
                <th className="px-6 py-4 font-medium">景别</th>
                <th className="px-6 py-4 font-medium">画面描述</th>
                <th className="px-6 py-4 font-medium">台词 / 旁白</th>
                <th className="px-6 py-4 font-medium">时长</th>
                <th className="px-6 py-4 font-medium">卖点植入说明</th>
                <th className="px-6 py-4 font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {scenes.map((scene) => (
                <tr key={scene.id} className="border-t border-[#2a2a2a] align-top">
                  <td className="px-6 py-5 text-white font-medium">{scene.title}</td>
                  <td className="px-6 py-5">
                    <span className="px-3 py-1 bg-[#00d084] text-black text-xs font-medium rounded-full">
                      {scene.shotType}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-gray-300 leading-6">{scene.description}</td>
                  <td className="px-6 py-5">
                    <div className="text-gray-200 leading-6">{scene.dialogue}</div>
                    {scene.warningWords.length > 0 && (
                      <div className="mt-2 flex items-center gap-2 text-xs text-orange-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        违禁词提示：{scene.warningWords.join('、')}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-5 text-white">{scene.duration}</td>
                  <td className="px-6 py-5 text-gray-400 leading-6">{scene.note}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-2">
                      <button className="px-3 py-2 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all flex items-center gap-2">
                        <Edit className="w-4 h-4" />
                        编辑
                      </button>
                    </div>
                    <div className="mt-3 text-xs text-gray-500">
                      场景：{scene.location} / {scene.time}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">道具：{scene.props}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
            合规与原创度提示
          </div>
          <div className="space-y-3 text-sm">
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-orange-500/30 text-orange-300">
              检测到“最”属于广告法高风险表达，建议替换为“更有温度”或“更适合加班场景”。
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a] text-gray-300">
              原创度检测结果：与爆款原文案相似度 38%，当前仍建议继续替换部分句式，降低表达复用感。
            </div>
          </div>
        </div>

        <div className="bg-[#1e1e1e] rounded-xl p-6 border border-[#2a2a2a]">
          <div className="flex items-center gap-2 mb-4 text-white font-semibold">
            <History className="w-4 h-4 text-[#00d084]" />
            版本管理
          </div>
          <div className="space-y-3">
            {versions.map((version) => (
              <div key={version.id} className="bg-[#0a0a0a] rounded-lg p-4 border border-[#2a2a2a] flex items-start justify-between gap-4">
                <div>
                  <div className="text-white text-sm font-medium">{version.label}</div>
                  <div className="text-xs text-gray-500 mt-1">{version.time}</div>
                  <div className="text-sm text-gray-400 mt-2">{version.note}</div>
                </div>
                <button className="text-sm text-[#00d084] hover:text-[#00e894] transition-all">查看 / 回退</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button className="px-6 py-3 bg-[#2a2a2a] text-white rounded-lg hover:bg-[#3a3a3a] transition-all">
          保存草稿
        </button>
        <button className="px-6 py-3 bg-white text-black font-medium rounded-lg hover:bg-gray-200 transition-all">
          重新生成
        </button>
        <button className="px-6 py-3 bg-[#00d084] text-black font-medium rounded-lg hover:bg-[#00e894] transition-all">
          提交审核
        </button>
      </div>
    </div>
  );
}
