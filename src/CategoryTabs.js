import React from "react";

export default function CategoryTabs({
  categories, tab, setTab,
  setShowAddCategoryModal,
  setShowDeleteCategoryModal,
  setShowDeleteCategoryWarning,
  tasks
}) {
  return (
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
      <button
        className="px-2 py-1 border rounded bg-green-200"
        onClick={() => setShowAddCategoryModal(true)}
      >＋</button>
      <button
        className="px-2 py-1 border rounded bg-red-200"
        onClick={() => setShowDeleteCategoryModal(true)}
      >－</button>
      <button
        className="px-2 py-1 border rounded"
        onClick={() => setTab("削除済み")}
      >削除済み</button>
    </div>
  );
}