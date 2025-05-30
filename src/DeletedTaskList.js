import React from "react";

export default function DeletedTaskList({
  deletedTasks, setTasks, setDeletedTasks, categories, setCategories, setUnsaved
}) {
  return (
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
            <button
              className="px-2 py-1 border rounded bg-blue-200"
              onClick={() => {
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
  );
}