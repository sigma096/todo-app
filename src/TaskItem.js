import React from "react";
import DatePicker from "react-datepicker";

export default function TaskItem({
  task,
  i,
  keyId,
  editTitle,
  editPriority,
  editCategory,
  editKari,
  editSaishu,
  titleInputRefs,
  titleColWidth,
  months,
  hours,
  minutes,
  daysInMonth,
  getDateParts,
  getDateObj,
  toDateStr,
  today,
  calendarOpenList,
  setCalendarOpenList,
  handleTitleBlur,
  handlePriorityChange,
  handleCategoryChange,
  handleKariChange,
  handleSaishuChange,
  setEditTitles,
  setDeletedTasks,
  setTasks,
  tasks,
  setUnsaved,
  tabs
}) {
  return (
    <li
      key={keyId}
      className={`flex items-center border-b-2 last:border-b-0 ${
        (task.仮期日 && !task.完了 && (() => {
          const d = getDateObj(task.仮期日);
          if (!d) return false;
          const todayDate = new Date();
          todayDate.setHours(0,0,0,0);
          const taskDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
          const diff = Math.floor((taskDate - todayDate) / (1000 * 60 * 60 * 24));
          return diff >= 0 && diff <= 7;
        })()) ? "bg-red-100" : ""
      }`}
    >
      {/* 完了ボタン */}
      <span className="w-14 flex-shrink-0 text-center border-r-2">
        <button
          className={`px-2 py-1 border rounded ${task.完了 ? "bg-gray-300 text-gray-500" : "bg-green-200"}`}
          disabled={task.完了}
          onClick={() => {
            if (!task.完了) {
              task.完了 = true;
              setTasks([...tasks]);
              setUnsaved(true);
            }
          }}
        >
          完了
        </button>
      </span>
      {/* 優先度 */}
      <span className="w-20 flex-shrink-0 text-center border-r-2">
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
      <span className="w-32 flex-shrink-0 text-center border-r-2">
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
        className="border-r-2 px-2"
        style={{ minWidth: "120px", width: titleColWidth, maxWidth: "40ch", flexShrink: 0 }}
      >
        <input
          ref={el => (titleInputRefs.current[keyId] = el)}
          value={editTitle}
          onChange={e => setEditTitles(prev => ({ ...prev, [keyId]: e.target.value }))}
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
      <span className="text-center border-r-2 px-2" style={{ minWidth: "110px" }}>
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
      {/* 最終期日（仮期日と同様に） */}
      <span className="text-center border-r-2 px-2" style={{ minWidth: "110px" }}>
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
      {/* 削除ボタン */}
      <span className="w-14 flex-shrink-0 text-center">
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
    </li>
  );
}