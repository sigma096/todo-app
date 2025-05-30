import React from "react";
import DatePicker from "react-datepicker";
import TaskError from "./TaskError";

export default function TaskModal({
  showModal,
  setShowModal,
  newTask,
  setNewTask,
  error,
  today,
  months,
  hours,
  minutes,
  daysInMonth,
  getDateParts,
  getDateObj,
  toDateStr,
  calendarOpen,
  setCalendarOpen,
  categories,
  handleAddTask,
  setError,
}) {
  if (!showModal) return null;
  return (
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
        <TaskError error={error} />
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
                    最終期日: false
                  }))
                }
              >📅</button>
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
        {/* 最終期日入力 */}
        <label className="block mb-1 mt-2">最終期日:
          <div className="flex items-center space-x-2">
            <div className="relative">
              <button
                type="button"
                className="border px-2 py-1 bg-white mr-2"
                onClick={() =>
                  setCalendarOpen(prev => ({
                    仮期日: false,
                    最終期日: !prev.最終期日
                  }))
                }
              >📅</button>
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
            onClick={handleAddTask}
            className="px-2 py-1 bg-blue-500 text-white"
          >追加</button>
        </div>
      </div>
    </div>
  );
}