import React from "react";
import TaskItem from "./TaskItem";
import TaskModal from "./TaskModal";

export default function TaskList({
  sorted,
  editTitles,
  editPriorities,
  editCategories,
  editKariDates,
  editSaishuDates,
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
  tabs,
  showModal,
  setShowModal,
  newTask,
  setNewTask,
  error,
  calendarOpen,
  setCalendarOpen,
  categories,
  handleAddTask,
  setError
}) {
  return (
    <>
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
        {sorted.map((task, i) => (
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
    </>
  );
}