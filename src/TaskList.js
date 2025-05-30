import React, { useState, useEffect, useRef } from "react";
import TaskItem from "./TaskItem";
import { parseISO, isBefore, addDays, differenceInDays } from "date-fns";
import * as XLSX from "xlsx";

export default function TaskList({
  tasks,
  setTasks,
  setDeletedTasks,
  setUnsaved,
  categories,
  tabs,
  today,
  calendarOpenList,
  setCalendarOpenList,
  titleColWidth,
  months,
  hours,
  minutes,
  daysInMonth,
  getDateParts,
  getDateObj,
  toDateStr,
  validateTask,
  setListError,
  setListErrorOpen,
  // showModal, setShowModal, newTask, setNewTask, error, calendarOpen, setCalendarOpen, handleAddTask, setError ← これらは削除
}) {
  // 編集用state
  const [editTitles, setEditTitles] = useState({});
  const [editPriorities, setEditPriorities] = useState({});
  const [editCategories, setEditCategories] = useState({});
  const [editKariDates, setEditKariDates] = useState({});
  const [editSaishuDates, setEditSaishuDates] = useState({});
  const titleInputRefs = useRef({});

  useEffect(() => {
    setEditTitles(tasks.reduce((obj, t) => { obj[t.id] = t.件名; return obj; }, {}));
    setEditPriorities(tasks.reduce((obj, t) => { obj[t.id] = t.緊急度; return obj; }, {}));
    setEditCategories(tasks.reduce((obj, t) => { obj[t.id] = t.分類; return obj; }, {}));
    setEditKariDates(tasks.reduce((obj, t) => { obj[t.id] = t.仮期日; return obj; }, {}));
    setEditSaishuDates(tasks.reduce((obj, t) => { obj[t.id] = t.最終期日; return obj; }, {}));
  }, [tasks]);

  // 編集ハンドラ
  const handleTitleBlur = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const editedTask = { ...task, 件名: editTitles[taskId] };
    const errorMsg = validateTask(editedTask, tasks, taskId);

    if (errorMsg) {
      setListError(errorMsg);         // App.jsのエラーstateにセット
      setListErrorOpen(true);         // エラーポップアップを開く
      return;                         // 保存しない
    }

    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? editedTask : t
      )
    );
    setUnsaved(true);
  };
  const handlePriorityChange = (e, taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, 緊急度: e.target.value } : t))
    );
    setUnsaved(true);
  };
  const handleCategoryChange = (e, taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, 分類: e.target.value } : t))
    );
    setUnsaved(true);
  };
  const handleKariChange = (dateStr, taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, 仮期日: dateStr } : t))
    );
    setUnsaved(true);
  };
  const handleSaishuChange = (dateStr, taskId) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, 最終期日: dateStr } : t))
    );
    setUnsaved(true);
  };

  // TaskItemに必要なstate/handlerを渡す
  return (
    <ul className="text-sm border-2 rounded p-2 bg-white shadow-inner min-h-[100px]">
      <li className="flex font-bold border-b-2 pb-1 mb-1">
        <span className="w-14 flex-shrink-0 text-center border-r-2">完了</span>
        <span className="w-20 flex-shrink-0 text-center border-r-2">優先度</span>
        <span className="w-32 flex-shrink-0 text-center border-r-2">分類</span>
        <span
          className="border-r-2 text-center"
          style={{ minWidth: "120px", width: titleColWidth, maxWidth: "40ch", flexShrink: 0 }}
        >件名</span>
        <span className="text-center border-r-2 px-2" style={{ minWidth: "110px" }}>仮期日</span>
        <span className="text-center border-r-2 px-2" style={{ minWidth: "110px" }}>最終期日</span>
        <span className="w-14 flex-shrink-0 text-center">削除</span>
      </li>
      {tasks.map((task, i) => (
        <TaskItem
          key={task.id}
          task={task}
          i={i}
          keyId={task.id}
          editTitle={editTitles[task.id] ?? ""}
          editPriority={editPriorities[task.id] ?? "未指定"}
          editCategory={editCategories[task.id] ?? "未仕分け"}
          editKari={editKariDates[task.id] ?? ""}
          editSaishu={editSaishuDates[task.id] ?? ""}
          titleInputRefs={titleInputRefs}
          titleColWidth={titleColWidth}
          months={months}
          hours={hours}
          minutes={minutes}
          daysInMonth={daysInMonth}
          getDateParts={getDateParts}
          getDateObj={getDateObj}
          toDateStr={toDateStr}
          today={today}
          calendarOpenList={calendarOpenList}
          setCalendarOpenList={setCalendarOpenList}
          handleTitleBlur={() => handleTitleBlur(task.id)}
          handlePriorityChange={e => handlePriorityChange(e, task.id)}
          handleCategoryChange={e => handleCategoryChange(e, task.id)}
          handleKariChange={dateStr => handleKariChange(dateStr, task.id)}
          handleSaishuChange={dateStr => handleSaishuChange(dateStr, task.id)}
          setEditTitles={setEditTitles}
          setDeletedTasks={setDeletedTasks}
          setTasks={setTasks}
          tasks={tasks}
          setUnsaved={setUnsaved}
          tabs={tabs}
        />
      ))}
    </ul>
  );
}

