// ローカル・マルチデバイス対応ToDo管理Reactアプリ（Excel保存対応）
// 必要ライブラリ: react, tailwindcss, date-fns, xlsx, file-saver

import React, { useState, useEffect } from "react";
import { format, addDays, isBefore, parseISO, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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

// ドロップダウン用の月・日・時・分リスト生成
const months = Array.from({ length: 12 }, (_, i) => i + 1);
const daysInMonth = (year, month) => new Date(year, month, 0).getDate();
const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

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
  const today = new Date();
  const [calendarOpen, setCalendarOpen] = useState({ 仮期日: false, 最終期日: false });

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

  // 日付・時刻入力補助関数
  const getDateParts = (dateStr) => {
    if (!dateStr) return { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate(), hour: "", minute: "" };
    const [date, time] = dateStr.split("T");
    const [year, month, day] = date.split("-").map(Number);
    let hour = "", minute = "";
    if (time) [hour, minute] = time.split(":");
    return { year, month, day, hour, minute };
  };

  // 日付・時刻バリデーション
  const isPast = (y, m, d, h, min) => {
    const input = new Date(y, m - 1, d, h || 0, min || 0);
    return input < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

  const handleAddTask = () => {
    if (!newTask.件名.trim()) return;
    const now = new Date();
    const getDateObj = (str) => {
      if (!str) return null;
      const [date, time] = str.split("T");
      const [y, m, d] = date.split("-").map(Number);
      let h = 0, min = 0;
      if (time) [h, min] = time.split(":").map(Number);
      return new Date(y, m - 1, d, h, min);
    };
    const 仮 = getDateObj(newTask.仮期日);
    const 最終 = getDateObj(newTask.最終期日);
    if (仮 && 仮 < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      setError("仮期日は本日以降の日付を指定してください。");
      return;
    }
    if (最終 && 最終 < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      setError("最終期日は本日以降の日付を指定してください。");
      return;
    }
    if (仮 && 最終 && 仮 > 最終) {
      setError("仮期日は最終期日より前に設定してください。");
      return;
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
              <span className="w-1/3">件名</span>
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
                  className={`border p-1 w-1/3 ${
                    task.緊急度 === "高"
                      ? "text-red-600"
                      : task.緊急度 === "低"
                      ? "text-blue-600"
                      : "text-black"
                  }`}
                />
                {/* 仮期日 */}
                <input
                  type="datetime-local"
                  value={task.仮期日 || ""}
                  onChange={(e) => {
                    task.仮期日 = e.target.value;
                    setTasks([...tasks]);
                    setUnsaved(true);
                  }}
                  className="w-32 border p-1"
                />
                {/* 最終期日 */}
                <input
                  type="datetime-local"
                  value={task.最終期日 || ""}
                  onChange={(e) => {
                    task.最終期日 = e.target.value;
                    setTasks([...tasks]);
                    setUnsaved(true);
                  }}
                  className="w-32 border p-1"
                />
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
            <div className="bg-white p-4 rounded shadow w-96" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg">タスク追加</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-500">✕</button>
              </div>
              <input
                placeholder="件名"
                value={newTask.件名}
                onChange={e => setNewTask({ ...newTask, 件名: e.target.value })}
                className="w-full border mb-2 p-1"
              />

              {/* エラー表示 */}
              {error && <p className="text-red-600 text-sm mb-1">{error}</p>}

              {/* 仮期日入力 */}
              <label className="block mb-1">仮期日:
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="border px-2 py-1 bg-white mr-2"
                      onClick={() =>
                        setCalendarOpen(prev => ({
                          仮期日: !prev.仮期日,
                          最終期日: false // もう一方を閉じる
                        }))
                      }
                    >📅</button>
                    {/* --- モーダル内の仮期日カレンダー --- */}
                    {calendarOpen.仮期日 && (
                      <div className="absolute z-20 left-0 mt-2">
                        <DatePicker
                          inline
                          selected={getDateObj(newTask.仮期日) || today}
                          onChange={date => {
                            setNewTask({
                              ...newTask,
                              仮期日: toDateStr(date)
                            });
                            setCalendarOpen(prev => ({ ...prev, 仮期日: false }));
                          }}
                          minDate={today}
                          shouldCloseOnSelect={true}
                          onClickOutside={() => setCalendarOpen(prev => ({ ...prev, 仮期日: false }))}
                        />
                      </div>
                    )}
                  </div>
                  {/* 年/月/日/時/分ドロップダウン */}
                  <div className="flex items-center space-x-1 ml-2">
                    <select
                      value={getDateParts(newTask.仮期日).year}
                      onChange={e => {
                        const { month, day, hour, minute } = getDateParts(newTask.仮期日);
                        setNewTask({
                          ...newTask,
                          仮期日: toDateStr(new Date(Number(e.target.value), month - 1, day), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {Array.from({ length: 4 }, (_, i) => today.getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="mx-0.5">/</span>
                    <select
                      value={getDateParts(newTask.仮期日).month}
                      onChange={e => {
                        const { year, day, hour, minute } = getDateParts(newTask.仮期日);
                        setNewTask({
                          ...newTask,
                          仮期日: toDateStr(new Date(year, Number(e.target.value) - 1, day), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <span className="mx-0.5">/</span>
                    <select
                      value={getDateParts(newTask.仮期日).day}
                      onChange={e => {
                        const { year, month, hour, minute } = getDateParts(newTask.仮期日);
                        setNewTask({
                          ...newTask,
                          仮期日: toDateStr(new Date(year, month - 1, Number(e.target.value)), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {Array.from({ length: daysInMonth(getDateParts(newTask.仮期日).year, getDateParts(newTask.仮期日).month) }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    {/* 日と時間の間を広く（4倍） */}
                    <span className="mx-16"></span>
                    <select
                      value={getDateParts(newTask.仮期日).hour}
                      onChange={e => {
                        const { year, month, day, minute } = getDateParts(newTask.仮期日);
                        setNewTask({
                          ...newTask,
                          仮期日: toDateStr(new Date(year, month - 1, day), e.target.value, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      <option value="">--</option>
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="mx-0.5">:</span>
                    <select
                      value={getDateParts(newTask.仮期日).minute}
                      onChange={e => {
                        const { year, month, day, hour } = getDateParts(newTask.仮期日);
                        setNewTask({
                          ...newTask,
                          仮期日: toDateStr(new Date(year, month - 1, day), hour, e.target.value)
                        });
                      }}
                      className="border p-1"
                      disabled={!getDateParts(newTask.仮期日).hour}
                    >
                      <option value="">--</option>
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </label>

              {/* 最終期日入力（仮期日と同様に修正） */}
              <label className="block mb-1 mt-2">最終期日:
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button
                      type="button"
                      className="border px-2 py-1 bg-white mr-2"
                      onClick={() =>
                        setCalendarOpen(prev => ({
                          仮期日: false, // もう一方を閉じる
                          最終期日: !prev.最終期日
                        }))
                      }
                    >📅</button>
                    {/* --- モーダル内の最終期日カレンダー --- */}
                    {calendarOpen.最終期日 && (
                      <div className="absolute z-20 left-0 mt-2">
                        <DatePicker
                          inline
                          selected={getDateObj(newTask.最終期日) || today}
                          onChange={date => {
                            setNewTask({
                              ...newTask,
                              最終期日: toDateStr(date)
                            });
                            setCalendarOpen(prev => ({ ...prev, 最終期日: false }));
                          }}
                          minDate={today}
                          shouldCloseOnSelect={true}
                          onClickOutside={() => setCalendarOpen(prev => ({ ...prev, 最終期日: false }))}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <select
                      value={getDateParts(newTask.最終期日).year}
                      onChange={e => {
                        const { month, day, hour, minute } = getDateParts(newTask.最終期日);
                        setNewTask({
                          ...newTask,
                          最終期日: toDateStr(new Date(Number(e.target.value), month - 1, day), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {Array.from({ length: 4 }, (_, i) => today.getFullYear() + i).map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <span className="mx-0.5">/</span>
                    <select
                      value={getDateParts(newTask.最終期日).month}
                      onChange={e => {
                        const { year, day, hour, minute } = getDateParts(newTask.最終期日);
                        setNewTask({
                          ...newTask,
                          最終期日: toDateStr(new Date(year, Number(e.target.value) - 1, day), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <span className="mx-0.5">/</span>
                    <select
                      value={getDateParts(newTask.最終期日).day}
                      onChange={e => {
                        const { year, month, hour, minute } = getDateParts(newTask.最終期日);
                        setNewTask({
                          ...newTask,
                          最終期日: toDateStr(new Date(year, month - 1, Number(e.target.value)), hour, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      {Array.from({ length: daysInMonth(getDateParts(newTask.最終期日).year, getDateParts(newTask.最終期日).month) }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                    <span className="mx-16"></span>
                    <select
                      value={getDateParts(newTask.最終期日).hour}
                      onChange={e => {
                        const { year, month, day, minute } = getDateParts(newTask.最終期日);
                        setNewTask({
                          ...newTask,
                          最終期日: toDateStr(new Date(year, month - 1, day), e.target.value, minute)
                        });
                      }}
                      className="border p-1"
                    >
                      <option value="">--</option>
                      {hours.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <span className="mx-0.5">:</span>
                    <select
                      value={getDateParts(newTask.最終期日).minute}
                      onChange={e => {
                        const { year, month, day, hour } = getDateParts(newTask.最終期日);
                        setNewTask({
                          ...newTask,
                          最終期日: toDateStr(new Date(year, month - 1, day), hour, e.target.value)
                        });
                      }}
                      className="border p-1"
                      disabled={!getDateParts(newTask.最終期日).hour}
                    >
                      <option value="">--</option>
                      {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
              </label>

              {/* 緊急度・分類・ボタンはそのまま */}
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
                <button
                  onClick={() => {
                    // バリデーション
                    const now = new Date();
                    const 仮 = getDateObj(newTask.仮期日);
                    const 最終 = getDateObj(newTask.最終期日);

                    if (!newTask.件名.trim()) {
                      setError("件名が未入力です");
                      return;
                    }
                    // 仮期日が指定されていて、日付が今日より前ならエラー
                    if (仮 && 仮.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
                      setError("仮期日は本日以降の日付を指定してください。");
                      return;
                    }
                    // 最終期日が指定されていて、日付が今日より前ならエラー
                    if (最終 && 最終.setHours(0,0,0,0) < today.setHours(0,0,0,0)) {
                      setError("最終期日は本日以降の日付を指定してください。");
                      return;
                    }
                    // 仮期日・最終期日ともに指定されていて、最終期日が仮期日より前ならエラー
                    if (仮 && 最終 && 最終 < 仮) {
                      setError("最終期日は仮期日より後の日時を指定してください。");
                      return;
                    }
                    setError("");
                    handleAddTask();
                  }}
                  className="px-2 py-1 bg-blue-500 text-white"
                >追加</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// 日付文字列→Dateオブジェクト
function getDateObj(str) {
  if (!str) return null;
  const [date, time] = str.split("T");
  const [y, m, d] = date.split("-").map(Number);
  let h = 0, min = 0;
  if (time) [h, min] = time.split(":").map(Number);
  return new Date(y, m - 1, d, h, min);
}

// Dateオブジェクト→日付文字列
function toDateStr(date, hour, minute) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, "0");
  const d = date.getDate().toString().padStart(2, "0");
  if (hour) {
    return `${y}-${m}-${d}T${hour}:${minute || "00"}`;
  }
  return `${y}-${m}-${d}`;
}
