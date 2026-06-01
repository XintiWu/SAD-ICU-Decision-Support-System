import { useState } from 'react'
import type { DecisionLog } from '../../api/client'

type Props = {
  decisionLogs: DecisionLog[] | null | undefined
  nurseNames?: Record<string, string>
  onClose: () => void
}

export function AllocationDecisionLogDialog({ decisionLogs, nurseNames, onClose }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedIndex, setExpandedIndex] = useState<number | null>(0) // Default expand first item
  const [filterChosenNurse, setFilterChosenNurse] = useState('')

  if (!decisionLogs || decisionLogs.length === 0) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
        <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl ring-1 ring-black/10 text-center">
          <h3 className="text-base font-bold text-slate-900">決策軌跡記錄</h3>
          <p className="mt-4 text-sm text-slate-500">
            目前分床紀錄沒有儲存的自動排班決策軌跡，或是此分床並非由系統推薦產生。
          </p>
          <button
            type="button"
            onClick={onClose}
            className="mt-6 rounded-xl bg-black px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            關閉
          </button>
        </div>
      </div>
    )
  }

  // Helper to get nurse display name
  const getNurseName = (nurseId: string, shortName: string) => {
    return nurseNames?.[nurseId] ?? shortName ?? nurseId.slice(-4)
  }

  // Filter logs
  const filteredLogs = decisionLogs.filter((log) => {
    const matchesSearch =
      log.bedLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesNurse = filterChosenNurse === '' || log.chosenNurseId === filterChosenNurse

    return matchesSearch && matchesNurse
  })

  // Get unique list of chosen nurses for filter dropdown
  const uniqueChosenNurses = Array.from(
    new Map(
      decisionLogs.map((log) => [
        log.chosenNurseId,
        getNurseName(log.chosenNurseId, ''),
      ])
    ).entries()
  )

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/50 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
      {/* Drawer Container */}
      <div className="h-full w-full max-w-2xl flex flex-col rounded-2xl bg-slate-50 shadow-2xl overflow-hidden animate-slide-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">自動分床決策軌跡</h3>
            <p className="text-xs text-slate-300 mt-1">
              展示系統將各病床指派給護理師時的決策流程與篩選指標。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 bg-white border-b border-slate-200 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="搜尋床號、姓名..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm rounded-xl bg-slate-100 border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:bg-white transition"
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          <select
            value={filterChosenNurse}
            onChange={(e) => setFilterChosenNurse(e.target.value)}
            className="px-3 py-2 text-sm rounded-xl bg-slate-100 border border-slate-200 focus:outline-hidden focus:border-slate-400 focus:bg-white transition"
          >
            <option value="">所有負責護理師</option>
            {uniqueChosenNurses.map(([id, name]) => (
              <option key={id} value={id}>
                {name || id.slice(-4)}
              </option>
            ))}
          </select>
        </div>

        {/* Main List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 text-sm">找不到符合條件的決策記錄</p>
            </div>
          ) : (
            filteredLogs.map((log, index) => {
              const isExpanded = expandedIndex === index
              const chosenNurse = log.candidates.find((c) => c.nurseId === log.chosenNurseId)
              const chosenNurseName = chosenNurse 
                ? getNurseName(chosenNurse.nurseId, chosenNurse.shortName)
                : log.chosenNurseId.slice(-4)

              return (
                <div
                  key={log.admissionId}
                  className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-xs hover:shadow-md transition duration-200"
                >
                  {/* Step Header */}
                  <div
                    onClick={() => toggleExpand(index)}
                    className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{log.bedLabel} 床</span>
                          <span className="text-xs text-slate-500 font-medium">({log.patientName})</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.isHighBurden 
                              ? 'bg-red-50 text-red-700 border border-red-100'
                              : 'bg-green-50 text-green-700 border border-green-100'
                          }`}>
                            {log.isHighBurden ? '高負擔' : '一般'} (分: {log.score})
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          系統判定由 <span className="font-semibold text-slate-900">{chosenNurseName}</span> 負責
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">
                        {isExpanded ? '收合' : '展開細節'}
                      </span>
                      <svg
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>

                  {/* Expanded Detail Panel */}
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/50 p-4 space-y-4">
                      {/* Process criteria info */}
                      <div className="grid grid-cols-2 gap-3 text-xs bg-slate-100/60 rounded-xl p-3 border border-slate-200/40 text-slate-600">
                        <div>
                          <span className="font-semibold text-slate-700">分配門檻負荷基準：</span>
                          {log.minLoad} 分
                        </div>
                        <div>
                          <span className="font-semibold text-slate-700">篩選容差窗口：</span>
                          &le; {log.minLoad + 5} 分
                        </div>
                      </div>

                      {/* Candidates breakdown */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 mb-2.5">系統評分與篩選流程 (系統共篩選了 {log.candidates.length} 位護理師)</h4>
                        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                          <table className="min-w-full text-xs text-left text-slate-600">
                            <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-200">
                              <tr>
                                <th className="px-4 py-2">護理師</th>
                                <th className="px-4 py-2">當時累積負擔</th>
                                <th className="px-4 py-2">年資</th>
                                <th className="px-4 py-2">鄰近病床 (&le; 2床)</th>
                                <th className="px-4 py-2">分流結果</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {log.candidates.map((candidate) => {
                                const isWinner = candidate.nurseId === log.chosenNurseId
                                const displayName = getNurseName(candidate.nurseId, candidate.shortName)
                                
                                return (
                                  <tr
                                    key={candidate.nurseId}
                                    className={`transition ${isWinner ? 'bg-emerald-50/40 font-semibold' : 'hover:bg-slate-50/40'}`}
                                  >
                                    <td className="px-4 py-2.5 flex items-center gap-2">
                                      {isWinner ? (
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                      ) : (
                                        <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                      )}
                                      <span className={isWinner ? 'text-slate-900 font-bold' : 'text-slate-700'}>
                                        {displayName}
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={candidate.currentLoad > log.minLoad ? 'text-slate-500' : 'text-slate-900 font-medium'}>
                                        {candidate.currentLoad} 分
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                                        log.isHighBurden 
                                          ? isWinner 
                                            ? 'bg-blue-100 text-blue-800' 
                                            : 'bg-slate-100 text-slate-600'
                                          : isWinner
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-slate-100 text-slate-600'
                                      }`}>
                                        {candidate.seniorityLevel} (階級: {candidate.seniorityRank})
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {candidate.hasNearbyBed ? (
                                        <span className="text-emerald-600 flex items-center gap-0.5 font-medium">
                                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                                          </svg>
                                          有
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">無</span>
                                      )}
                                    </td>
                                    <td className="px-4 py-2.5">
                                      {isWinner ? (
                                        <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-600/15">
                                          勝出 (指派)
                                        </span>
                                      ) : (
                                        <span className="text-slate-400">未選中</span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Explanation narrative */}
                      <div className="text-xs bg-emerald-50/20 border border-emerald-500/10 rounded-xl p-3 text-slate-700">
                        <span className="font-bold text-emerald-800">💡 決策原因分析：</span>
                        本輪分配「{log.bedLabel} 床」，由於病患屬
                        <span className="font-semibold">{log.isHighBurden ? '高負擔病患' : '一般病患'}</span>，系統依年資排序原則：
                        <span className="font-semibold">{log.isHighBurden ? '【高負擔由資淺護理師優先】' : '【一般負擔由資深護理師優先】'}</span>
                        進行比對。在容差範圍（總分 &le; {log.minLoad + 5}）的護理師中，
                        <span className="font-bold text-slate-900">{chosenNurseName}</span> 
                        {chosenNurse && chosenNurse.hasNearbyBed 
                          ? ' 在年資優先考量下，因同時具備【鄰近病床】的空間優勢（床位距離 &le; 2），成功勝出。'
                          : ' 在符合年資優先順序的情況下順利勝出。'}
                      </div>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 p-4 flex justify-between items-center">
          <div className="text-xs text-slate-500 font-medium">
            共 {decisionLogs.length} 床決策記錄 • 已篩選 {filteredLogs.length} 筆
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
