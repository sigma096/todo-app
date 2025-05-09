// ローカル・マルチデバイス対応ToDo管理Reactアプリ（Excel保存対応）
// 必要ライブラリ: react, tailwindcss, date-fns, xlsx, file-saver

import React, { useState, useEffect } from "react";
import { format, addDays, isBefore, parseISO, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

const PRIORITY_COLORS = {
  高: "text-red-600",
  未指定: "text-black",
  低: "text-blue-600",
};

const isMobile = window.innerWidth < 768;

const DEFAULT_POSITION = {
  minHeight: "100vh",
  backgroundColor: "#f9f9f9",
};

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  const [tab, setTab] = useState("未仕分け");
  const [filterStatus, setFilterStatus] = useState("未クリア");
  const [showModal, setShowModal] = useState(false);
  const [newTask, setNewTask] = useState({
    件名: "",
    仮期日: "",
    最終期日: "",
    緊急度: "未指定",
    分類: "未仕分け",
    完了: false,
  });
  const [unsaved, setUnsaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const now = new Date();
    const updatedTasks = [];
    const toDelete = [];
    for (const t of tasks) {
      if (t.最終期日) {
        const due = parseISO(t.最終期日);
        if (!t.完了 && isBefore(due, addDays(now, -1))) {
          toDelete.push(t);
        } else {
          updatedTasks.push(t);
        }
      } else {
        updatedTasks.push(t); // 最終期日がないタスクは削除対象にしない
      }
    }
    if (toDelete.length > 0) {
      setDeletedTasks((prev) => [...prev, ...toDelete]);
      setTasks(updatedTasks);
    }
  }, [tasks]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (unsaved) {
        e.preventDefault();
        e.returnValue = "保存されていない変更があります。終了しますか？";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [unsaved]);

  const handleAddTask = () => {
    if (!newTask.件名.trim()) return;
    const now = new Date();
    if (newTask.仮期日 && newTask.最終期日) {
      const 仮 = new Date(newTask.仮期日);
      const 最終 = new Date(newTask.最終期日);
      if (仮 > 最終) {
        setError("仮期日は最終期日より前に設定してください。");
        return;
      }
      if (仮 < now || 最終 < now) {
        setError("仮期日・最終期日には過去の日付を設定できません。");
        return;
      }
    }
    setTasks((prev) => [...prev, newTask]);
    setShowModal(false);
    setNewTask({
      件名: "",
      仮期日: "",
      最終期日: "",
      緊急度: "未指定",
      分類: "未仕分け",
      完了: false,
    });
    setUnsaved(true);
    setError("");
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(tasks);
    const ws2 = XLSX.utils.json_to_sheet(deletedTasks);
    XLSX.utils.book_append_sheet(wb, ws1, "タスク");
    XLSX.utils.book_append_sheet(wb, ws2, "削除済み");
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    saveAs(new Blob([wbout], { type: "application/octet-stream" }), "tasks.xlsx");
    setUnsaved(false);
  };

  const tabs = Array.from(new Set(["未仕分け", ...tasks.map(t => t.分類)]));
  const filtered = tasks.filter((t) => t.分類 === tab && t.完了 === (filterStatus === "クリア"));
  const sorted = filtered.sort((a, b) => {
    const pOrder = { 高: 0, 未指定: 1, 低: 2 };
    const diffP = pOrder[a.緊急度] - pOrder[b.緊急度];
    if (diffP !== 0) return diffP;
    return new Date(a.最終期日 || 0) - new Date(b.最終期日 || 0);
  });
  const alerts = tasks.filter((t) => {
    if (t.仮期日) {
      const 仮期日 = parseISO(t.仮期日);
      return differenceInDays(仮期日, new Date()) <= 7 && !t.完了;
    }
    return false;
  });

  return (
    <div style={DEFAULT_POSITION}>
      <div className="p-2">
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2 overflow-x-auto">
            {tabs.map((name) => (
              <button key={name} className={`px-2 py-1 border rounded ${tab === name ? "bg-blue-300" : "bg-white"}`} onClick={() => setTab(name)}>{name}</button>
            ))}
            <button className="px-2 py-1 border rounded" onClick={() => setTab("削除済み")}>削除済み</button>
          </div>
          <button className="text-red-500 text-xl" onClick={() => {
            if (!unsaved || window.confirm("保存されていない変更があります。終了しますか？")) {
              window.close();
            }
          }}>✕</button>
        </div>

        {tab !== "削除済み" && (
          <div className="flex space-x-2 mb-2">
            <button className={filterStatus === "未クリア" ? "underline" : ""} onClick={() => setFilterStatus("未クリア")}>未クリア</button>
            <button className={filterStatus === "クリア" ? "underline" : ""} onClick={() => setFilterStatus("クリア")}>クリア</button>
          </div>
        )}

        <div className="flex justify-between mb-2">
          <button onClick={() => setShowModal(true)} className="px-2 py-1 bg-green-500 text-white rounded">＋追加</button>
          <button onClick={exportToExcel} className="px-2 py-1 bg-gray-500 text-white rounded">保存</button>
        </div>

        {tab === "削除済み" ? (
          <ul className="text-sm border rounded p-2 bg-gray-100">
            {deletedTasks.map((task, i) => (
              <li key={i}>{task.件名}（削除済）</li>
            ))}
          </ul>
        ) : (
          <ul className="text-sm border rounded p-2 bg-white shadow-inner min-h-[100px]">
            {/* 項目名をリスト最上部に追加 */}
            <li className="flex items-center space-x-2 font-bold border-b pb-1 mb-1">
              <span className="w-6">✔</span>
              <span className="w-20">緊急度</span>
              <span className="flex-1">件名</span>
              <span className="w-32">仮期日</span>
              <span className="w-32">最終期日</span>
            </li>
            {sorted.map((task, i) => (
              <li key={i} className="flex items-center space-x-2">
                {/* チェックボックス */}
                <input
                  type="checkbox"
                  checked={task.完了}
                  onChange={() => {
                    task.完了 = !task.完了;
                    setTasks([...tasks]);
                    setUnsaved(true);
                  }}
                  className="w-6"
                />
                {/* 緊急度 */}
                <select
                  value={task.緊急度}
                  onChange={(e) => {
                    task.緊急度 = e.target.value;
                    setTasks([...tasks]);
                    setUnsaved(true);
                  }}
                  className="w-20 border p-1"
                >
                  <option value="未指定">未指定</option>
                  <option value="高">高</option>
                  <option value="低">低</option>
                </select>
                {/* 件名 */}
                <input
                  value={task.件名}
                  onChange={(e) => {
                    task.件名 = e.target.value;
                    setTasks([...tasks]);
                    setUnsaved(true);
                  }}
                  className="border p-1 flex-1"
                />
                {/* 仮期日 */}
                <span className="w-32 text-gray-600">
                  {task.仮期日 ? format(parseISO(task.仮期日), "yyyy-MM-dd HH:mm") : "未設定"}
                </span>
                {/* 最終期日 */}
                <span className="w-32 text-gray-600">
                  {task.最終期日 ? format(parseISO(task.最終期日), "yyyy-MM-dd HH:mm") : "未設定"}
                </span>
              </li>
            ))}
          </ul>
        )}

        <div className="fixed bottom-0 left-0 right-0 bg-yellow-100 text-sm text-red-600 p-2 border-t border-yellow-400">
          <b>通知:</b>
          <ul>
            {alerts.map((task, i) => <li key={i}>{task.件名} の期日が近づいています</li>)}
          </ul>
        </div>

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center" onClick={() => setShowModal(false)}>
            <div className="bg-white p-4 rounded shadow w-80" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg">タスク追加</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500">✕</button>
              </div>
              <input placeholder="件名" value={newTask.件名} onChange={(e) => setNewTask({ ...newTask, 件名: e.target.value })} className="w-full border mb-2 p-1" />
              <label className="block mb-1">仮期日:
                <input type="datetime-local" value={newTask.仮期日} onChange={(e) => setNewTask({ ...newTask, 仮期日: e.target.value })} className="w-full border p-1" />
              </label>
              <label className="block mb-1">最終期日:
                <input type="datetime-local" value={newTask.最終期日} onChange={(e) => setNewTask({ ...newTask, 最終期日: e.target.value })} className="w-full border p-1" />
              </label>
              {error && <p className="text-red-600 text-sm mb-1">{error}</p>}
              <label className="block mb-1">緊急度:
                <select value={newTask.緊急度} onChange={(e) => setNewTask({ ...newTask, 緊急度: e.target.value })} className="w-full border p-1">
                  <option value="未指定">未指定</option>
                  <option value="高">高</option>
                  <option value="低">低</option>
                </select>
              </label>
              <label className="block mb-2">分類:
                <input value={newTask.分類} onChange={(e) => setNewTask({ ...newTask, 分類: e.target.value })} className="w-full border p-1" list="分類候補" />
                <datalist id="分類候補">
                  {tabs.map((t) => <option key={t} value={t} />)}
                </datalist>
              </label>
              <div className="flex justify-end space-x-2">
                <button onClick={() => setShowModal(false)} className="px-2 py-1 border">キャンセル</button>
                <button onClick={handleAddTask} className="px-2 py-1 bg-blue-500 text-white">追加</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
