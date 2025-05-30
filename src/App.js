// ローカル・マルチデバイス対応ToDo管理Reactアプリ（Excel保存対応）
// 必要ライブラリ: react, tailwindcss, date-fns, xlsx, file-saver

import React, { useState, useEffect, useRef } from "react";
import { parseISO, isBefore, addDays, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";
import TaskList from "./TaskList";
import TaskModal from "./TaskModal";
import TaskError from "./TaskError";
import CategoryTabs from "./CategoryTabs";
import CategoryAddModal from "./CategoryAddModal";
import CategoryDeleteModal from "./CategoryDeleteModal";
import CategorySelectModal from "./CategorySelectModal";
import DeletedTaskList from "./DeletedTaskList";
import OperationButtons from "./OperationButtons";
import FilterTabs from "./FilterTabs";
import DeleteCategoryWarning from "./DeleteCategoryWarning";

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
      {/* 初回分類選択モーダル */}
      {showCategoryModal && (
        <CategorySelectModal
          categories={categories}
          categoryInput={categoryInput}
          setCategoryInput={setCategoryInput}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          setTab={setTab}
          setShowCategoryModal={setShowCategoryModal}
          setIsLoggedIn={setIsLoggedIn}
        />
      )}

      {/* 分類追加モーダル */}
      {showAddCategoryModal && (
        <CategoryAddModal
          newCategoryName={newCategoryName}
          setNewCategoryName={setNewCategoryName}
          categoryMessage={categoryMessage}
          setCategoryMessage={setCategoryMessage}
          categories={categories}
          setCategories={setCategories}
          setTab={setTab}
          setShowAddCategoryModal={setShowAddCategoryModal}
        />
      )}

      {/* 分類削除モーダル */}
      {showDeleteCategoryModal && (
        <CategoryDeleteModal
          deleteCategoryName={deleteCategoryName}
          setDeleteCategoryName={setDeleteCategoryName}
          deleteCategoryMessage={deleteCategoryMessage}
          setDeleteCategoryMessage={setDeleteCategoryMessage}
          categories={categories}
          setCategories={setCategories}
          setTasks={setTasks}
          setTab={setTab}
          setShowDeleteCategoryModal={setShowDeleteCategoryModal}
        />
      )}

      <div className="p-2" style={{ filter: showCategoryModal ? "blur(2px)" : "none" }}>
        {/* 分類タブ */}
        <CategoryTabs
          categories={categories}
          tab={tab}
          setTab={setTab}
          setShowAddCategoryModal={setShowAddCategoryModal}
          setShowDeleteCategoryModal={setShowDeleteCategoryModal}
          setShowDeleteCategoryWarning={setShowDeleteCategoryWarning}
          tasks={tasks}
        />

        {/* フィルタ切替 */}
        <FilterTabs filterStatus={filterStatus} setFilterStatus={setFilterStatus} />

        {/* 操作ボタン */}
        <OperationButtons
          setShowModal={setShowModal}
          setNewTask={setNewTask}
          tab={tab}
          tasks={tasks}
          deletedTasks={deletedTasks}
          fileInputRef={fileInputRef}
          XLSX_STORAGE_KEY={XLSX_STORAGE_KEY}
          setTasks={setTasks}
          setDeletedTasks={setDeletedTasks}
        />

        {/* タスクリスト or 削除済みリスト */}
        {tab === "削除済み" ? (
          <DeletedTaskList
            deletedTasks={deletedTasks}
            setTasks={setTasks}
            setDeletedTasks={setDeletedTasks}
            categories={categories}
            setCategories={setCategories}
            setUnsaved={setUnsaved}
          />
        ) : (
          <TaskList
            tasks={sorted}
            setTasks={setTasks}
            setDeletedTasks={setDeletedTasks}
            setUnsaved={setUnsaved}
            categories={categories}
            tabs={tabs}
            today={today}
            calendarOpenList={calendarOpenList}
            setCalendarOpenList={setCalendarOpenList}
            getDateParts={getDateParts}           // ←これを追加
            getDateObj={getDateObj}               // ←必要なら追加
            toDateStr={toDateStr}                 // ←必要なら追加
            titleColWidth={titleColWidth}         // ←必要なら追加
            months={months}                       // ←必要なら追加
            hours={hours}                         // ←必要なら追加
            minutes={minutes}                     // ←必要なら追加
            daysInMonth={daysInMonth}             // ←必要なら追加
            validateTask={validateTask}
            setListError={setListError}
            setListErrorOpen={setListErrorOpen}
          />
        )}

        {/* エラー表示 */}
        <TaskError
          error={error}
          listError={listError}
          listErrorOpen={listErrorOpen}
          setListErrorOpen={setListErrorOpen}
        />

        {/* 分類削除警告モーダル */}
        {showDeleteCategoryWarning && (
          <DeleteCategoryWarning
            tab={tab}
            setCategories={setCategories}
            setTasks={setTasks}
            setTab={setTab}
            setShowDeleteCategoryWarning={setShowDeleteCategoryWarning}
          />
        )}

        <TaskModal
          showModal={showModal}
          setShowModal={setShowModal}
          newTask={newTask}
          setNewTask={setNewTask}
          error={error}
          today={today}
          months={months}
          hours={hours}
          minutes={minutes}
          daysInMonth={daysInMonth}
          getDateParts={getDateParts}
          getDateObj={getDateObj}
          toDateStr={toDateStr}
          calendarOpen={calendarOpen}
          setCalendarOpen={setCalendarOpen}
          categories={categories}
          handleAddTask={handleAddTask}
          setError={setError}
        />
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
  if (hour !== undefined && minute !== undefined) {
    return `${y}-${m}-${d}T${hour}:${minute}`;
  }
  return `${y}-${m}-${d}`;
}
