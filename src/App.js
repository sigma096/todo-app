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
  // 分類リストをuseStateで管理
  const [categories, setCategories] = useState(["未仕分け"]);
  const [tasks, setTasks] = useState([]);
  const [deletedTasks, setDeletedTasks] = useState([]);
  // 削除モーダル用: 複数選択
  const [selectedDeleteTasks, setSelectedDeleteTasks] = useState([]);
  const [tab, setTab] = useState("未仕分け");
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingCategoryName, setEditingCategoryName] = useState("");

  // タブ削除時の確認用
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [deleteCategoryName, setDeleteCategoryName] = useState("");
  const [categoryMessage, setCategoryMessage] = useState("");
  const [deleteCategoryMessage, setDeleteCategoryMessage] = useState("");

  // タブ削除時、該当分類のタスクを未仕分けに移動
  const handleDeleteCategory = () => {
    if (!deleteCategoryName || deleteCategoryName === "未仕分け") {
      setDeleteCategoryMessage("削除する分類を選択してください。");
      return;
    }
    setTasks(tasks.map(t =>
      t.分類 === deleteCategoryName ? { ...t, 分類: "未仕分け" } : t
    ));
    setCategories(categories.filter(c => c !== deleteCategoryName));
    if (tab === deleteCategoryName) setTab("未仕分け");
    setShowDeleteCategoryModal(false);
    setDeleteCategoryName("");
    setDeleteCategoryMessage("");
  };

  // 分類名ダブルクリック編集
  const handleCategoryEdit = (oldName) => {
    setEditingCategory(oldName);
    setEditingCategoryName(oldName);
  };
  const handleCategoryEditSubmit = (oldName) => {
    const newName = editingCategoryName.trim();
    if (!newName || categories.includes(newName)) {
      setEditingCategory(null);
      setEditingCategoryName("");
      return;
    }
    setCategories(categories.map(c => (c === oldName ? newName : c)));
    setTasks(tasks.map(t => t.分類 === oldName ? { ...t, 分類: newName } : t));
    if (tab === oldName) setTab(newName);
    setEditingCategory(null);
    setEditingCategoryName("");
  };
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
  // タスク追加モーダルを開くたびに現在のタブをデフォルト分類に
  useEffect(() => {
    if (showModal) {
      setNewTask((prev) => ({ ...prev, 分類: tab }));
    }
    // eslint-disable-next-line
  }, [showModal]);
  const [unsaved, setUnsaved] = useState(false);
  const [error, setError] = useState("");
  const today = new Date();
  const [calendarOpen, setCalendarOpen] = useState({ 仮期日: false, 最終期日: false });

  // xlsxデータ読込用
  const fileInputRef = React.useRef();

  // xlsx base64保存用キー
  const XLSX_STORAGE_KEY = "todo-app-xlsx-base64";

  // ログイン・分類選択用ステート
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(true);
  const [categoryInput, setCategoryInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  // エラーポップアップ用ステート
  const [listError, setListError] = useState("");
  const [listErrorOpen, setListErrorOpen] = useState(false);
  const [calendarOpenList, setCalendarOpenList] = useState({}); // {仮期日0: true, 最終期日1: true ...}
  const [showDeleteCategoryWarning, setShowDeleteCategoryWarning] = useState(false);

  // タスクのバリデーション
  const validateTask = (task, tasks, idx) => {
    if (!task.件名.trim()) return "件名が未入力です";
    const 仮 = getDateObj(task.仮期日);
    const 最終 = getDateObj(task.最終期日);
    if (仮 && 仮.setHours(0,0,0,0) < today.setHours(0,0,0,0)) return "仮期日は本日以降の日付を指定してください。";
    if (最終 && 最終.setHours(0,0,0,0) < today.setHours(0,0,0,0)) return "最終期日は本日以降の日付を指定してください。";
    if (仮 && 最終 && 最終 < 仮) return "最終期日は仮期日より後の日時を指定してください。";
    return "";
  };

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

  // 初回マウント時: localStorageのxlsxデータを読み込む
  useEffect(() => {
    const base64 = localStorage.getItem(XLSX_STORAGE_KEY);
    if (base64) {
      try {
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const wb = XLSX.read(bytes, { type: "array" });
        const ws1 = wb.Sheets["タスク"];
        const ws2 = wb.Sheets["削除済み"];
        const ws3 = wb.Sheets["分類"]; // 追加
        const loadedTasks = ws1 ? XLSX.utils.sheet_to_json(ws1) : [];
        const loadedDeleted = ws2 ? XLSX.utils.sheet_to_json(ws2) : [];
        const loadedCategories = ws3 ? XLSX.utils.sheet_to_json(ws3).map(row => row.分類) : ["未仕分け"]; // 追加
        setTasks(Array.isArray(loadedTasks) ? loadedTasks : []);
        setDeletedTasks(Array.isArray(loadedDeleted) ? loadedDeleted : []);
        setCategories(Array.isArray(loadedCategories) && loadedCategories.length > 0 ? loadedCategories : ["未仕分け"]); // 追加
      } catch {}
    }
  }, []);

  // tasks, deletedTasksが変わったら自動保存（xlsxをbase64でlocalStorageに保存）
  useEffect(() => {
    if (tasks.length === 0 && deletedTasks.length === 0 && categories.length === 1) return;
    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(tasks);
    const ws2 = XLSX.utils.json_to_sheet(deletedTasks);
    const ws3 = XLSX.utils.json_to_sheet(categories.map(c => ({ 分類: c }))); // 追加
    XLSX.utils.book_append_sheet(wb, ws1, "タスク");
    XLSX.utils.book_append_sheet(wb, ws2, "削除済み");
    XLSX.utils.book_append_sheet(wb, ws3, "分類"); // 追加
    const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const b64 = btoa(String.fromCharCode(...new Uint8Array(wbout)));
    localStorage.setItem(XLSX_STORAGE_KEY, b64);
  }, [tasks, deletedTasks, categories]);

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

  // 編集用stateをIDで管理
  const [editTitles, setEditTitles] = useState({});
  const [editPriorities, setEditPriorities] = useState({});
  const [editCategories, setEditCategories] = useState({});
  const [editKariDates, setEditKariDates] = useState({});
  const [editSaishuDates, setEditSaishuDates] = useState({});
  const titleInputRefs = React.useRef({});

  // タスクが変わったら編集用stateも同期
  useEffect(() => {
    setEditTitles(tasks.reduce((obj, t) => { obj[t.id] = t.件名; return obj; }, {}));
    setEditPriorities(tasks.reduce((obj, t) => { obj[t.id] = t.緊急度; return obj; }, {}));
    setEditCategories(tasks.reduce((obj, t) => { obj[t.id] = t.分類; return obj; }, {}));
    setEditKariDates(tasks.reduce((obj, t) => { obj[t.id] = t.仮期日; return obj; }, {}));
    setEditSaishuDates(tasks.reduce((obj, t) => { obj[t.id] = t.最終期日; return obj; }, {}));
  }, [tasks]);

  // タスク追加時にidを付与
  const handleAddTask = () => {
    const errors = [];
    if (!newTask.件名.trim()) errors.push("件名が未入力です");
    // 分類が空欄やスペースのみの場合は「未仕分け」
    let taskCategory = newTask.分類 && newTask.分類.trim() ? newTask.分類.trim() : "未仕分け";
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
      errors.push("仮期日は本日以降の日付を指定してください。");
    }
    if (最終 && 最終 < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
      errors.push("最終期日は本日以降の日付を指定してください。");
    }
    if (仮 && 最終 && 仮 > 最終) {
      errors.push("仮期日は最終期日より前に設定してください。");
    }
    if (errors.length > 0) {
      setError(errors);
      return;
    }
    // 分類が新規なら即時追加
    if (taskCategory && !categories.includes(taskCategory)) {
      setCategories(prev => [...prev, taskCategory]);
    }
    setTasks((prev) => [
      ...prev,
      {
        ...newTask,
        分類: taskCategory,
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      }
    ]);
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

  const tabs = categories;
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

  // 件名の最大幅を計算
  const maxTitleLength = Math.max(...tasks.map(t => (t.件名 || "").length), 8);
  const titleColWidth = `${Math.min(Math.max(maxTitleLength, 12), 40)}ch`; // 12ch～40chの範囲で可変

  return (
    <div style={DEFAULT_POSITION}>
      {/* ログイン・分類選択モーダル */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg mb-4">分類を選択してください</h2>
            <div className="mb-2">
              <label className="block mb-1">新しい分類名を入力:</label>
              <input
                type="text"
                className="w-full border p-1 mb-2"
                value={categoryInput}
                onChange={e => {
                  setCategoryInput(e.target.value);
                  setSelectedCategory("");
                }}
                placeholder="例: 仕事, プライベート など"
              />
            </div>
            <div className="mb-2">
              <label className="block mb-1">既存の分類から選択:</label>
              <select
                className="w-full border p-1"
                value={selectedCategory}
                onChange={e => {
                  setSelectedCategory(e.target.value);
                  setCategoryInput("");
                }}
              >
                <option value="">-- 選択しない --</option>
                {categories.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              {/* 決定ボタン */}
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  let cat = categoryInput.trim();
                  if (cat) {
                    // 新しい分類なら追加
                    if (!categories.includes(cat)) {
                      setCategories(prev => [...prev, cat]);
                    }
                    setTab(cat);
                  } else if (selectedCategory && selectedCategory.trim()) {
                    setTab(selectedCategory);
                  } else {
                    setTab("未仕分け");
                  }
                  setShowCategoryModal(false);
                  setIsLoggedIn(true);
                  setCategoryInput("");
                  setSelectedCategory("");
                }}
              >
                決定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- ここから追加 --- */}
      {/* 分類追加モーダル */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg mb-4">新規分類名を入力</h2>
            <input
              type="text"
              className="w-full border p-1 mb-2"
              value={newCategoryName}
              onChange={e => setNewCategoryName(e.target.value)}
              placeholder="新しい分類名"
            />
            {categoryMessage && (
              <div className="mb-2 text-red-600 text-sm">{categoryMessage}</div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  if (!newCategoryName.trim()) {
                    setCategoryMessage("分類名を入力してください。");
                    return;
                  }
                  if (categories.includes(newCategoryName.trim())) {
                    setCategoryMessage("既に存在する分類名です。");
                    return;
                  }
                  const newCat = newCategoryName.trim();
                  setCategories(prev => [...prev, newCat]);
                  setTab(newCat);
                  setShowAddCategoryModal(false);
                  setNewCategoryName("");
                  setCategoryMessage("");
                }}
              >追加</button>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  setShowAddCategoryModal(false);
                  setNewCategoryName("");
                  setCategoryMessage("");
                }}
              >キャンセル</button>
            </div>
          </div>
        </div>
      )}

      {/* 分類削除モーダル */}
      {showDeleteCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow w-96" onClick={e => e.stopPropagation()}>
            <h2 className="text-lg mb-4">分類を削除</h2>
            <select
              className="w-full border p-1 mb-2"
              value={deleteCategoryName}
              onChange={e => setDeleteCategoryName(e.target.value)}
            >
              <option value="">-- 選択してください --</option>
              {categories.filter(t => t !== "未仕分け" && t !== "削除済み").map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
            {deleteCategoryMessage && (
              <div className="mb-2 text-red-600 text-sm">{deleteCategoryMessage}</div>
            )}
            <div className="flex justify-end space-x-2 mt-4">
              <button
                className="px-3 py-1 border rounded bg-red-400 text-white"
                onClick={() => {
                  if (!deleteCategoryName) {
                    setDeleteCategoryMessage("削除する分類を選択してください。");
                    return;
                  }
                  setCategories(prev => prev.filter(cat => cat !== deleteCategoryName));
                  setTasks(tasks.map(t => t.分類 === deleteCategoryName ? { ...t, 分類: "未仕分け" } : t));
                  setTab("未仕分け");
                  setShowDeleteCategoryModal(false);
                  setDeleteCategoryName("");
                  setDeleteCategoryMessage("分類を削除しました。");
                  setTimeout(() => setDeleteCategoryMessage(""), 1500);
                }}
              >削除</button>
              <button
                className="px-3 py-1 border rounded"
                onClick={() => {
                  setShowDeleteCategoryModal(false);
                  setDeleteCategoryName("");
                  setDeleteCategoryMessage("");
                }}
              >キャンセル</button>
            </div>
          </div>
        </div>
      )}
      {/* --- ここまで追加 --- */}

      {/* メイン画面 */}
      <div className="p-2" style={{ filter: showCategoryModal ? "blur(2px)" : "none" }}>
        <div className="flex justify-between items-center mb-2">
          <div className="flex space-x-2 overflow-x-auto">
            {categories.map((name) => (
              <button
                key={name}
                className={`px-2 py-1 border rounded ${tab === name ? "bg-blue-300" : "bg-white"}`}
                onClick={() => setTab(name)}
              >
                {name}
                <span className="ml-1 text-xs text-gray-500">
                  （{tasks.filter(t => t.分類 === name).length}）
                </span>
              </button>
            ))}
            {/* +タブ */}
            <button
              className="px-2 py-1 border rounded bg-green-200"
              onClick={() => setShowAddCategoryModal(true)} // 追加モーダルを表示
            >＋</button>
            {/* -タブ */}
            <button
              className="px-2 py-1 border rounded bg-red-200"
              onClick={() => {
                if (tab === "未仕分け" || tab === "削除済み") return;
                if (tasks.some(t => t.分類 === tab)) {
                  setShowDeleteCategoryWarning(true); // 警告モーダルを表示
                } else {
                  setCategories(categories.filter(c => c !== tab));
                  setTab("未仕分け");
                }
              }}
            >－</button>
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
          <div className="flex space-x-2">
            <button
              onClick={() => {
                setNewTask((prev) => ({
                  ...prev,
                  分類: tab // 現在のタブ名を分類にセット
                }));
                setShowModal(true);
              }}
              className="px-2 py-1 bg-green-500 text-white rounded"
            >＋追加</button>
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded"
              onClick={() => {
                const wb = XLSX.utils.book_new();
                const ws1 = XLSX.utils.json_to_sheet(tasks);
                const ws2 = XLSX.utils.json_to_sheet(deletedTasks);
                XLSX.utils.book_append_sheet(wb, ws1, "タスク");
                XLSX.utils.book_append_sheet(wb, ws2, "削除済み");
                const wbout = XLSX.write(wb, { bookType: "xlsx", type: "array" });
                // base64エンコードしてlocalStorageに保存
                const b64 = btoa(String.fromCharCode(...new Uint8Array(wbout)));
                localStorage.setItem(XLSX_STORAGE_KEY, b64);
                alert("データをローカルストレージに保存しました。");
              }}
            >保存</button>
            <button
              className="px-2 py-1 bg-green-500 text-white rounded"
              onClick={() => {
                const base64 = localStorage.getItem(XLSX_STORAGE_KEY);
                if (!base64) {
                  alert("保存データがありません。");
                  return;
                }
                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                saveAs(new Blob([bytes], { type: "application/octet-stream" }), "todo-app-data.xlsx");
              }}
            >ダウンロード</button>
            <button
              className="px-2 py-1 bg-yellow-500 text-white rounded"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
            >読込</button>
            <input
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              style={{ display: "none" }}
              ref={fileInputRef}
              onChange={e => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = evt => {
                  try {
                    const data = new Uint8Array(evt.target.result);
                    const wb = XLSX.read(data, { type: "array" });
                    const ws1 = wb.Sheets["タスク"];
                    const ws2 = wb.Sheets["削除済み"];
                    const loadedTasks = ws1 ? XLSX.utils.sheet_to_json(ws1) : [];
                    const loadedDeleted = ws2 ? XLSX.utils.sheet_to_json(ws2) : [];
                    setTasks(Array.isArray(loadedTasks) ? loadedTasks : []);
                    setDeletedTasks(Array.isArray(loadedDeleted) ? loadedDeleted : []);
                  } catch {
                    alert("ファイルの読み込みに失敗しました。");
                  }
                };
                reader.readAsArrayBuffer(file);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {tab === "削除済み" ? (
          <ul className="text-sm border rounded p-2 bg-gray-100">
            <li className="flex font-bold border-b pb-1 mb-1">
              <span className="w-32 flex-shrink-0 text-center border-r">件名</span>
              <span className="w-20 flex-shrink-0 text-center border-r">分類</span>
              <span className="w-16 flex-shrink-0 text-center border-r">優先度</span>
              <span className="w-40 flex-shrink-0 text-center border-r">仮期日</span>
              <span className="w-40 flex-shrink-0 text-center border-r">最終期日</span>
              <span className="w-20 flex-shrink-0 text-center">操作</span>
            </li>
            {deletedTasks.map((task, i) => (
              <li key={i} className="flex items-center border-b last:border-b-0">
                <span className="w-32 flex-shrink-0 text-center border-r">{task.件名}</span>
                <span className="w-20 flex-shrink-0 text-center border-r">{task.分類}</span>
                <span className="w-16 flex-shrink-0 text-center border-r">{task.緊急度}</span>
                <span className="w-40 flex-shrink-0 text-center border-r">{task.仮期日 ? task.仮期日.replace("T", " ") : ""}</span>
                <span className="w-40 flex-shrink-0 text-center border-r">{task.最終期日 ? task.最終期日.replace("T", " ") : ""}</span>
                <span className="w-20 flex-shrink-0 text-center">
                  {/* ここに「元に戻す」ボタンを追加 */}
                  <button
                    className="px-2 py-1 border rounded bg-blue-200"
                    onClick={() => {
                      // 元の分類がなければ作成
                      if (!categories.includes(task.分類)) {
                        setCategories(prev => [...prev, task.分類]);
                      }
                      setTasks(prev => [...prev, { ...task, 完了: false }]);
                      setDeletedTasks(deletedTasks.filter((_, idx) => idx !== i));
                      setUnsaved(true);
                    }}
                  >
                    元に戻す
                  </button>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="text-sm border rounded p-2 bg-white shadow-inner min-h-[100px]">
            <li className="flex font-bold border-b pb-1 mb-1">
              <span className="w-12 flex-shrink-0 text-center border-r">クリア</span>
              <span className="w-12 flex-shrink-0 text-center border-r">削除</span>
              <span className="w-20 flex-shrink-0 text-center border-r">緊急度</span>
              <span className="w-32 flex-shrink-0 text-center border-r">分類</span>
              <span
                className="border-r text-center"
                style={{ minWidth: "120px", width: titleColWidth, maxWidth: "40ch", flexShrink: 0 }}
              >件名</span>
              <span className="w-64 flex-shrink-0 text-center border-r">仮期日</span>
              <span className="w-64 flex-shrink-0 text-center">最終期日</span>
            </li>
            {sorted.map((task, i) => {
              const key = task.id;
              const editTitle = editTitles[key] ?? "";
              const editPriority = editPriorities[key] ?? "未指定";
              const editCategory = editCategories[key] ?? "未仕分け";
              const editKari = editKariDates[key] ?? "";
              const editSaishu = editSaishuDates[key] ?? "";

              // 件名変更
              const handleTitleBlur = () => {
                if (!editTitle.trim()) {
                  setListError("件名が未入力です");
                  setListErrorOpen(true);
                  setEditTitles(prev => ({ ...prev, [key]: task.件名 }));
                  setTimeout(() => titleInputRefs.current[key]?.focus(), 0);
                  return;
                }
                if (editTitle !== task.件名) {
                  setTasks(tasks.map(t => t.id === key ? { ...t, 件名: editTitle } : t));
                  setUnsaved(true);
                }
              };

              // 緊急度変更
              const handlePriorityChange = (e) => {
                const value = e.target.value;
                setEditPriorities(prev => ({ ...prev, [key]: value }));
                setTasks(tasks.map(t => t.id === key ? { ...t, 緊急度: value } : t));
                setUnsaved(true);
              };

              // 分類変更
              const handleCategoryChange = (e) => {
                const value = e.target.value;
                setEditCategories(prev => ({ ...prev, [key]: value }));
                setTasks(tasks.map(t => t.id === key ? { ...t, 分類: value } : t));
                setUnsaved(true);
              };

              // 仮期日変更
              const handleKariChange = (newDateStr) => {
                setEditKariDates(prev => ({ ...prev, [key]: newDateStr }));
                // バリデーション後、OKならtasksも更新
                const newTasks = tasks.map(t =>
                  t.id === key ? { ...t, 仮期日: newDateStr } : t
                );
                const idx = tasks.findIndex(t => t.id === key);
                const err = validateTask(newTasks[idx], newTasks, idx);
                // 仮期日が最終期日より後の場合は赤文字警告
                if (newDateStr && tasks[idx]?.最終期日 && getDateObj(newDateStr) && getDateObj(tasks[idx].最終期日) && getDateObj(newDateStr) > getDateObj(tasks[idx].最終期日)) {
                  setListError("仮期日は最終期日より前に設定してください。");
                  setListErrorOpen(false);
                  setEditKariDates(prev => ({ ...prev, [key]: newDateStr }));
                  return;
                }
                if (err) {
                  setListError(err);
                  setListErrorOpen(true);
                  setEditKariDates(prev => ({ ...prev, [key]: task.仮期日 })); // 元に戻す
                  return;
                }
                setTasks(newTasks);
                setUnsaved(true);
              };

              // 最終期日変更
              const handleSaishuChange = (newDateStr) => {
                setEditSaishuDates(prev => ({ ...prev, [key]: newDateStr }));
                const newTasks = tasks.map(t =>
                  t.id === key ? { ...t, 最終期日: newDateStr } : t
                );
                const idx = tasks.findIndex(t => t.id === key);
                const err = validateTask(newTasks[idx], newTasks, idx);
                if (err) {
                  setListError(err);
                  setListErrorOpen(true);
                  setEditSaishuDates(prev => ({ ...prev, [key]: task.最終期日 })); // 元に戻す
                  return;
                }
                setTasks(newTasks);
                setUnsaved(true);
              };

              return (
                <li key={key} className="flex items-center border-b last:border-b-0">
                  {/* クリア（チェックボックス） */}
                  <span className="w-12 flex-shrink-0 text-center border-r">
                    <input
                      type="checkbox"
                      checked={task.完了}
                      onChange={() => {
                        task.完了 = !task.完了;
                        setTasks([...tasks]);
                        setUnsaved(true);
                      }}
                      className="w-4 h-4"
                    />
                  </span>
                  {/* 削除ボタン */}
                  <span className="w-12 flex-shrink-0 text-center border-r">
                    <button
                      className="px-2 py-1 border rounded bg-red-200"
                      onClick={() => {
                        setDeletedTasks(prev => [...prev, task]);
                        setTasks(tasks.filter(t => t.id !== task.id));
                        setUnsaved(true);
                      }}
                    >
                      削除
                    </button>
                  </span>
                  {/* 緊急度 */}
                  <span className="w-20 flex-shrink-0 text-center border-r">
                    <select
                      value={editPriority}
                      onChange={handlePriorityChange}
                      className="w-full border p-1 bg-white"
                    >
                      <option value="未指定">未指定</option>
                      <option value="高">高</option>
                      <option value="低">低</option>
                    </select>
                  </span>
                  {/* 分類 */}
                  <span className="w-32 flex-shrink-0 text-center border-r">
                    <select
                      value={editCategory}
                      onChange={handleCategoryChange}
                      className="w-full border p-1 bg-white"
                    >
                      {tabs.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </span>
                  {/* 件名 */}
                  <span
                    className="border-r px-2"
                    style={{ minWidth: "120px", width: titleColWidth, maxWidth: "40ch", flexShrink: 0 }}
                  >
                    <input
                      ref={el => (titleInputRefs.current[key] = el)}
                      value={editTitle}
                      onChange={e => setEditTitles(prev => ({ ...prev, [key]: e.target.value }))}
                      onBlur={handleTitleBlur}
                      className={`border p-1 w-full bg-white ${editPriority === "高"
                        ? "text-red-600"
                        : editPriority === "低"
                        ? "text-blue-600"
                        : "text-black"
                      }`}
                      style={{ width: "100%", minWidth: "80px", maxWidth: "40ch" }}
                    />
                  </span>
                  {/* 仮期日 */}
                  <span className="w-64 flex-shrink-0 border-r px-2">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <button
                          type="button"
                          className="border px-1 py-1 bg-white mr-1"
                          onClick={() =>
                            setCalendarOpenList(prev => ({
                              ...prev,
                              [`仮期日${i}`]: !prev[`仮期日${i}`],
                              [`最終期日${i}`]: false
                            }))
                          }
                        >
                          {"📅"}
                        </button>
                        {calendarOpenList[`仮期日${i}`] && (
                          <div className="absolute z-20 left-0 mt-7">
                            <DatePicker
                              inline
                              selected={getDateObj(task.仮期日) || today}
                              onChange={date => {
                                handleKariChange(toDateStr(date));
                                setCalendarOpenList(prev => ({ ...prev, [`仮期日${i}`]: false }));
                              }}
                              minDate={today}
                              shouldCloseOnSelect={true}
                              onClickOutside={() => setCalendarOpenList(prev => ({ ...prev, [`仮期日${i}`]: false }))}
                            />
                          </div>
                        )}
                        <span className="ml-1">{task.仮期日 ? task.仮期日.replace("T", " ") : ""}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        {/* 年/月/日/時/分 select（幅調整済み） */}
                        <select
                          value={getDateParts(task.仮期日).year}
                          onChange={e => {
                            const { month, day, hour, minute } = getDateParts(task.仮期日);
                            handleKariChange(toDateStr(new Date(Number(e.target.value), month - 1, day), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {Array.from({ length: 4 }, (_, j) => today.getFullYear() + j).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span className="mx-0.5">/</span>
                        <select
                          value={getDateParts(task.仮期日).month}
                          onChange={e => {
                            const { year, day, hour, minute } = getDateParts(task.仮期日);
                            handleKariChange(toDateStr(new Date(year, Number(e.target.value) - 1, day), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span className="mx-0.5">/</span>
                        <select
                          value={getDateParts(task.仮期日).day}
                          onChange={e => {
                            const { year, month, hour, minute } = getDateParts(task.仮期日);
                            handleKariChange(toDateStr(new Date(year, month - 1, Number(e.target.value)), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {Array.from({ length: daysInMonth(getDateParts(task.仮期日).year, getDateParts(task.仮期日).month) }, (_, j) => j + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <span className="mx-2"></span>
                        <select
                          value={getDateParts(task.仮期日).hour}
                          onChange={e => {
                            const { year, month, day, minute } = getDateParts(task.仮期日);
                            handleKariChange(toDateStr(new Date(year, month - 1, day), e.target.value, minute));
                          }}
                          className="border p-1"
                        >
                          <option value="">--</option>
                          {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="mx-0.5">:</span>
                        <select
                          value={getDateParts(task.仮期日).minute}
                          onChange={e => {
                            const { year, month, day, hour } = getDateParts(task.仮期日);
                            handleKariChange(toDateStr(new Date(year, month - 1, day), hour, e.target.value));
                          }}
                          className="border p-1"
                          disabled={!getDateParts(task.仮期日).hour}
                        >
                          <option value="">--</option>
                          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </span>
                  {/* 最終期日 */}
                  <span className="w-64 flex-shrink-0 px-2">
                    <div className="flex flex-col">
                      <div className="flex items-center">
                        <button
                          type="button"
                          className="border px-1 py-1 bg-white mr-1"
                          onClick={() =>
                            setCalendarOpenList(prev => ({
                              ...prev,
                              [`最終期日${i}`]: !prev[`最終期日${i}`],
                              [`仮期日${i}`]: false
                            }))
                          }
                        >📅</button>
                        {calendarOpenList[`最終期日${i}`] && (
                          <div className="absolute z-20 left-0 mt-7">
                            <DatePicker
                              inline
                              selected={getDateObj(task.最終期日) || today}
                              onChange={date => {
                                handleSaishuChange(toDateStr(date));
                                setCalendarOpenList(prev => ({ ...prev, [`最終期日${i}`]: false }));
                              }}
                              minDate={today}
                              shouldCloseOnSelect={true}
                              onClickOutside={() => setCalendarOpenList(prev => ({ ...prev, [`最終期日${i}`]: false }))}
                            />
                          </div>
                        )}
                        <span className="ml-1">{task.最終期日 ? task.最終期日.replace("T", " ") : ""}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <select
                          value={getDateParts(task.最終期日).year}
                          onChange={e => {
                            const { month, day, hour, minute } = getDateParts(task.最終期日);
                            handleSaishuChange(toDateStr(new Date(Number(e.target.value), month - 1, day), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {Array.from({ length: 4 }, (_, j) => today.getFullYear() + j).map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        <span className="mx-0.5">/</span>
                        <select
                          value={getDateParts(task.最終期日).month}
                          onChange={e => {
                            const { year, day, hour, minute } = getDateParts(task.最終期日);
                            handleSaishuChange(toDateStr(new Date(year, Number(e.target.value) - 1, day), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <span className="mx-0.5">/</span>
                        <select
                          value={getDateParts(task.最終期日).day}
                          onChange={e => {
                            const { year, month, hour, minute } = getDateParts(task.最終期日);
                            handleSaishuChange(toDateStr(new Date(year, month - 1, Number(e.target.value)), hour, minute));
                          }}
                          className="border p-1"
                        >
                          {Array.from({ length: daysInMonth(getDateParts(task.最終期日).year, getDateParts(task.最終期日).month) }, (_, j) => j + 1).map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                        <span className="mx-4"></span>
                        <select
                          value={getDateParts(task.最終期日).hour}
                          onChange={e => {
                            const { year, month, day, minute } = getDateParts(task.最終期日);
                            handleSaishuChange(toDateStr(new Date(year, month - 1, day), e.target.value, minute));
                          }}
                          className="border p-1"
                        >
                          <option value="">--</option>
                          {hours.map(h => <option key={h} value={h}>{h}</option>)}
                        </select>
                        <span className="mx-0.5">:</span>
                        <select
                          value={getDateParts(task.最終期日).minute}
                          onChange={e => {
                            const { year, month, day, hour } = getDateParts(task.最終期日);
                            handleSaishuChange(toDateStr(new Date(year, month - 1, day), hour, e.target.value));
                          }}
                          className="border p-1"
                          disabled={!getDateParts(task.最終期日).hour}
                        >
                          <option value="">--</option>
                          {minutes.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                    </div>
                  </span>
                </li>
              );
            })}
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

              {/* エラー表示（複数） */}
              {Array.isArray(error) && error.length > 0 ? (
                <div className="text-red-600 text-sm mb-1">
                  {error.map((err, idx) => <div key={idx}>・{err}</div>)}
                </div>
              ) : error ? (
                <p className="text-red-600 text-sm mb-1">{error}</p>
              ) : null}

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
                    <span className="mx-4"></span>
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
                <input
                  value={newTask.分類}
                  onChange={(e) => setNewTask({ ...newTask, 分類: e.target.value })}
                  className="border p-1 flex-1"
                  placeholder="分類名を入力"
                  autoComplete="off"
                />
                <select
                  className="border p-1"
                  value={categories.length > 0 && categories.includes(newTask.分類) ? newTask.分類 : ""}
                  onChange={e => setNewTask({ ...newTask, 分類: e.target.value })}
                >
                  <option value="">分類を選択</option>
                  {categories.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
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

        {/* エラーポップアップ */}
        {/* 仮期日が最終期日より後の場合はリスト下部に赤文字警告 */}
        {listError && !listErrorOpen && (
          <div className="text-red-600 text-sm mb-2">{listError}</div>
        )}
        {listErrorOpen && (
          <div
            className="fixed inset-0 flex items-center justify-center z-50"
            style={{ background: "rgba(0,0,0,0.2)" }}
            onClick={() => setListErrorOpen(false)}
          >
            <div
              className="bg-white border border-red-400 text-red-600 px-6 py-4 rounded shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              <b>入力エラー:</b>
              <div>{listError}</div>
              <button className="mt-2 px-4 py-1 bg-red-500 text-white rounded" onClick={() => setListErrorOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* 分類削除警告モーダル */}
        {showDeleteCategoryWarning && (
          <div
            className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50"
            onClick={() => setShowDeleteCategoryWarning(false)} // モーダル外クリックでキャンセル
          >
            <div
              className="bg-white p-6 rounded shadow w-96"
              onClick={e => e.stopPropagation()} // モーダル内クリックは伝播防止
            >
              <h2 className="text-lg mb-4 text-red-600">この分類にはタスクが残っています</h2>
              <p className="mb-4">本当にこの分類を削除しますか？<br />（分類内のタスクは「未仕分け」に移動します）</p>
              <div className="flex justify-end space-x-2 mt-4">
                <button
                  className="px-3 py-1 border rounded bg-red-400 text-white"
                  onClick={() => {
                    // 選択中の分類(tab)を削除
                    setCategories(prev => prev.filter(cat => cat !== tab));
                    setTasks(tasks.map(t => t.分類 === tab ? { ...t, 分類: "未仕分け" } : t));
                    setTab("未仕分け");
                    setShowDeleteCategoryWarning(false);
                  }}
                >削除</button>
                <button
                  className="px-3 py-1 border rounded"
                  onClick={() => setShowDeleteCategoryWarning(false)}
                >キャンセル</button>
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

// 1. setTabの無限ループ部分を削除
// {showCategoryModal === false && tab && (
//   <div style={{ display: "none" }}>{setTab(tab)}</div>
// )}
