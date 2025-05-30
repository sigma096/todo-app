import React from "react";

export default function CategoryDeleteModal({
  deleteCategoryName, setDeleteCategoryName,
  deleteCategoryMessage, setDeleteCategoryMessage,
  categories, setCategories, setTasks, setTab,
  setShowDeleteCategoryModal
}) {
  return (
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
              setTasks(tasks => tasks.map(t => t.分類 === deleteCategoryName ? { ...t, 分類: "未仕分け" } : t));
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
  );
}